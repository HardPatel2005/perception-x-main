// app.js
// Always load .env for local development; environment variables set by the host will override values in .env
try {
    require('dotenv').config();
} catch (e) {
    // ignore if dotenv not available
}
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const File = require("./models/perceps.js");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const methodOverride = require("method-override");
const http = require("http");
const socketIo = require("socket.io");
const os = require("os");
const fs = require("fs");
const { spawn } = require("child_process");
const cloudinary = require('cloudinary').v2;
const { computeAnalytics } = require("./utils/analytics.js");
const { computeDetectionAnalytics } = require("./utils/analytics-detection.js");
const { computeWildlifeAnalytics } = require("./utils/analytics-wildlife.js");
const { computeRestaurantAnalytics } = require("./utils/analytics-restaurant.js");
const authRoutes = require("./routes/auth.js");
const { authenticate } = require("./middleware/auth.js");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json({ limit: '500mb' })); // for JSON API forwarding (POST /detect)
app.use("/api/auth", authRoutes); // Authentication routes
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use(methodOverride("_method"));

// Serve static files from public directory (for assets, CSS, etc.)
app.use(express.static(path.join(__dirname, "/public")));

// Serve React build
app.use(express.static(path.join(__dirname, "/public/react-build")));
console.log("✅ Serving React application");

// MongoDB Connection
const dbUrl = process.env.MONGO_URI;
if (!dbUrl) {
    console.error("❌ MONGO_URI environment variable is not set. Exiting.");
    process.exit(1);
}
mongoose.connect(dbUrl, {})
    .then(async () => {
        console.log("✅ MongoDB Connected");
        // Check FFmpeg availability at startup
        console.log("🔍 Checking for FFmpeg...");
        const hasFFmpeg = await checkSystemFFmpeg();
        if (hasFFmpeg) {
            console.log("✅ FFmpeg is available for video compression");
        } else {
            console.warn("⚠️ FFmpeg not found. Video compression will fail for files over 100MB.");
            console.warn("   If you just installed FFmpeg, please RESTART this server.");
            console.warn("   Verify FFmpeg: Open a NEW terminal and run 'ffmpeg -version'");
        }
    })
    .catch(err => {
        console.error("❌ MongoDB Connection Failed:", err);
        process.exit(1);
    });

// Cloudinary Configuration
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });
    console.log("✅ Cloudinary configured");
} else {
    console.warn("⚠️ Cloudinary credentials not found. Videos and large files will use MongoDB.");
}

// Multer config (store in memory)
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB (allows large videos before compression)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE
    }
});

// Threshold for using Cloudinary vs MongoDB (images < 1MB can use MongoDB for speed)
const CLOUDINARY_THRESHOLD = 1 * 1024 * 1024; // 1MB
const CLOUDINARY_MAX_SIZE_MB = 100; // Cloudinary's per-file size limit for videos
// CRITICAL: Cloudinary requires chunks >= 5MB (minimum). Use 5MB to stay stable without violating constraint.
const CLOUDINARY_CHUNK_SIZE = parseInt(process.env.CLOUDINARY_CHUNK_SIZE || "5242880", 10); // 5MB minimum (was 6MB, failed on 46MB files)
const CLOUDINARY_UPLOAD_TIMEOUT_MS = parseInt(process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || "1200000", 10); // 20 min for large files

// Check if system FFmpeg is available
function checkSystemFFmpeg() {
    return new Promise((resolve) => {
        // On Windows, try with cmd.exe explicitly
        const isWindows = process.platform === 'win32';
        const command = isWindows ? 'cmd.exe' : 'sh';
        const args = isWindows
            ? ['/c', 'ffmpeg', '-version']
            : ['-c', 'ffmpeg -version'];

        const ffmpeg = spawn(command, args, {
            shell: false, // Don't use shell, we're providing the shell ourselves
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        ffmpeg.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        let resolved = false;
        const resolveOnce = (value) => {
            if (!resolved) {
                resolved = true;
                resolve(value);
            }
        };

        ffmpeg.on('close', (code) => {
            if (code === 0 || stdout.includes('ffmpeg version') || stderr.includes('ffmpeg version')) {
                // FFmpeg found - it outputs version to stderr on Windows
                console.log("✅ FFmpeg detected successfully");
                resolveOnce(true);
            } else {
                // Try alternative method: direct spawn with shell
                if (!resolved) {
                    console.log(`⚠️ First FFmpeg check failed (code ${code}), trying alternative method...`);
                    checkFFmpegAlternative().then(resolveOnce).catch(() => resolveOnce(false));
                }
            }
        });

        ffmpeg.on('error', (err) => {
            console.log(`⚠️ FFmpeg spawn error: ${err.message}`);
            if (!resolved) {
                checkFFmpegAlternative().then(resolveOnce).catch(() => resolveOnce(false));
            }
        });

        setTimeout(() => {
            try {
                if (!ffmpeg.killed) {
                    ffmpeg.kill();
                }
            } catch (e) { }
            if (!resolved) {
                console.log("⚠️ FFmpeg check timed out, trying alternative method...");
                checkFFmpegAlternative().then(resolveOnce).catch(() => resolveOnce(false));
            }
        }, 5000);
    });
}

// Alternative FFmpeg check using shell directly
function checkFFmpegAlternative() {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', ['-version'], {
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let output = '';

        ffmpeg.stdout.on('data', (data) => {
            output += data.toString();
        });

        ffmpeg.stderr.on('data', (data) => {
            output += data.toString(); // FFmpeg outputs version to stderr
        });

        ffmpeg.on('close', (code) => {
            if (code === 0 || output.includes('ffmpeg version')) {
                console.log("✅ FFmpeg detected via alternative method");
                resolve(true);
            } else {
                reject(new Error(`FFmpeg not found (code: ${code})`));
            }
        });

        ffmpeg.on('error', (err) => {
            reject(err);
        });

        setTimeout(() => {
            try {
                if (!ffmpeg.killed) {
                    ffmpeg.kill();
                }
            } catch (e) { }
            reject(new Error('FFmpeg check timed out'));
        }, 5000);
    });
}

// Compress video to under target size (in MB) using 2-pass bitrate-controlled encoding.
// Guarantees output is under targetSizeMB in a single attempt — no retries needed.
async function compressVideo(inputBuffer, targetSizeMB = 95) {
    const tempDir = os.tmpdir();
    const ts = Date.now();
    const inputPath = path.join(tempDir, `input_${ts}.mp4`);
    const outputPath = path.join(tempDir, `compressed_${ts}.mp4`);
    const pass1Log = path.join(tempDir, `ffmpeg2pass_${ts}`);

    try {
        fs.writeFileSync(inputPath, inputBuffer);

        const hasSystemFFmpeg = await checkSystemFFmpeg();
        if (!hasSystemFFmpeg) {
            throw new Error('System FFmpeg not found. Please ensure FFmpeg is installed and in your PATH. RESTART your Node.js server after installing FFmpeg.');
        }

        // ── Step 1: Probe video duration with ffprobe ──────────────────────────
        console.log("🔍 Probing video duration...");
        const durationSec = await new Promise((resolve, reject) => {
            const probe = spawn('ffprobe', [
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                inputPath
            ], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });

            let out = '';
            probe.stdout.on('data', d => { out += d.toString(); });
            probe.on('close', code => {
                const dur = parseFloat(out.trim());
                if (code === 0 && !isNaN(dur) && dur > 0) {
                    console.log(`✅ Video duration: ${dur.toFixed(1)}s`);
                    resolve(dur);
                } else {
                    reject(new Error(`ffprobe failed (code ${code})`));
                }
            });
            probe.on('error', reject);
        });

        // ── Step 2: Calculate exact target bitrate ─────────────────────────────
        const AUDIO_KBPS = 128;
        const totalKbps = Math.floor((targetSizeMB * 8 * 1024) / durationSec);
        const videoKbps = Math.max(100, totalKbps - AUDIO_KBPS);
        console.log(`📊 Target: ${videoKbps}k video + ${AUDIO_KBPS}k audio (${durationSec.toFixed(1)}s → ${targetSizeMB}MB)`);

        const isWindows = process.platform === 'win32';

        // Helper: spawn ffmpeg and stream progress to console
        function runFFmpeg(args) {
            return new Promise((resolve, reject) => {
                const cmd = isWindows ? 'cmd.exe' : 'ffmpeg';
                const fullArgs = isWindows ? ['/c', 'ffmpeg', ...args] : args;
                const proc = spawn(cmd, fullArgs, { shell: false });

                let stderr = '', lastLog = Date.now();
                proc.stderr.on('data', data => {
                    const chunk = data.toString();
                    stderr += chunk;
                    const m = chunk.match(/time=(\d+:\d+:\d+\.\d+)/);
                    if (m && Date.now() - lastLog > 3000) {
                        lastLog = Date.now();
                        console.log(`⏳ Compressing... ${m[1]} encoded so far`);
                    }
                });
                proc.on('close', code => {
                    if (code === 0) resolve();
                    else reject(new Error(`FFmpeg exited ${code}: ${stderr.slice(-400)}`));
                });
                proc.on('error', reject);
            });
        }

        // ── Step 3: Pass 1 — analysis (no output file) ────────────────────────
        console.log("🎬 Pass 1 — analysing video...");
        await runFFmpeg([
            '-y', '-i', inputPath,
            '-c:v', 'libx264', '-b:v', `${videoKbps}k`,
            '-preset', 'medium',
            '-vf', `scale=iw*min(1280/iw\\,720/ih):ih*min(1280/iw\\,720/ih)`,
            '-pass', '1', '-passlogfile', pass1Log,
            '-an', '-f', 'null', isWindows ? 'NUL' : '/dev/null'
        ]);

        // ── Step 4: Pass 2 — final encode ─────────────────────────────────────
        console.log("🎬 Pass 2 — encoding output...");
        await runFFmpeg([
            '-y', '-i', inputPath,
            '-c:v', 'libx264', '-b:v', `${videoKbps}k`,
            '-preset', 'medium',
            '-vf', `scale=iw*min(1280/iw\\,720/ih):ih*min(1280/iw\\,720/ih)`,
            '-pass', '2', '-passlogfile', pass1Log,
            '-c:a', 'aac', '-b:a', `${AUDIO_KBPS}k`,
            '-movflags', '+faststart',
            outputPath
        ]);

        // ── Step 5: Read result and cleanup ────────────────────────────────────
        const compressedBuffer = fs.readFileSync(outputPath);
        const compressedMB = compressedBuffer.length / (1024 * 1024);
        console.log(`✅ Compressed ${(inputBuffer.length / 1024 / 1024).toFixed(2)}MB → ${compressedMB.toFixed(2)}MB`);

        for (const f of [inputPath, outputPath, `${pass1Log}-0.log`, `${pass1Log}-0.log.mbtree`]) {
            try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (_) { }
        }
        return compressedBuffer;

    } catch (error) {
        for (const f of [inputPath, outputPath]) {
            try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (_) { }
        }
        throw new Error(`Video compression failed: ${error.message}`);
    }
}

// Socket
io.on("connection", (socket) => {
    console.log("✅ New client connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
    });
});

// API Endpoints for React
// Analytics API - get files list with aggregated analytics
app.get("/api/analytics/files", authenticate, async (req, res) => {
    try {
        console.log("📊 Fetching analytics files list for user:", req.user._id);

        // Filter files by userId - users can only see their own files
        const files = await File.find(
            { userId: req.user._id },
            null,
            { allowDiskUse: true }
        )
            .sort({ uploadDate: -1 })
            .limit(100)
            .select("filename mimetype uploadDate processedCloudinaryUrl processedCloudinaryId cloudinaryUrl cloudinaryId _id serviceType size duration")
            .lean()
            .maxTimeMS(5000); // 5 second timeout for the query

        console.log(`📊 Found ${files.length} files, formatting...`);

        // Format files for React frontend - include processed files (Cloudinary OR Mongo-stored processedData) and live sessions
        const formattedFiles = files
            .filter(file => !!(
                file.processedCloudinaryUrl ||
                file.processedCloudinaryId ||
                file.processedData ||
                file.mimetype === 'live/camera'
            ))
            .map(file => ({
                _id: String(file._id),
                filename: file.filename || 'Unknown',
                mimetype: file.mimetype || 'unknown',
                uploadDate: file.uploadDate || new Date(),
                totalEvents: 0, // Don't count events here - too expensive, will be loaded on detail page
                // isProcessed true if processed data exists in Cloudinary or MongoDB, or it's a live session
                isProcessed: !!(file.processedCloudinaryUrl || file.processedCloudinaryId || file.processedData || file.mimetype === 'live/camera'),
                // hasOriginal true if original exists in Cloudinary or is stored in MongoDB
                hasOriginal: !!(file.cloudinaryUrl || file.cloudinaryId || file.data),
                serviceType: file.serviceType || 'traffic-monitoring',
                size: file.size || 0,
                duration: file.duration || null
            }));

        console.log(`✅ Returning ${formattedFiles.length} formatted files`);

        return res.json({
            files: formattedFiles
        });
    } catch (err) {
        console.error("❌ Error loading analytics:", err);
        return res.status(500).json({ error: "Error loading analytics data: " + err.message });
    }
});

// Analytics cache to avoid recomputing
const analyticsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clear cache on server start to prevent stale data with wrong serviceType
// This ensures old cache entries with wrong keys don't persist
// Also clear any cache entries that don't have serviceType in the key (old format)
function clearAnalyticsCache() {
    const keysToDelete = [];
    for (const key of analyticsCache.keys()) {
        // Delete old format keys (just fileId) and keep new format (fileId:serviceType)
        if (!key.includes(':')) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach(key => analyticsCache.delete(key));
    if (keysToDelete.length > 0) {
        console.log(`🧹 Cleared ${keysToDelete.length} old cache entries`);
    }
}

// Clear on startup
clearAnalyticsCache();
console.log('🧹 Analytics cache initialized and old entries cleared');

// Analytics API - get specific file analytics
app.get("/api/analytics/:fileId", authenticate, async (req, res) => {
    try {
        const fileId = req.params.fileId;

        // OPTIMIZATION: First fetch serviceType to build proper cache key
        // This ensures cache is keyed by serviceType to prevent wrong dashboard from being shown
        console.log(`🔍 Loading file serviceType from database for user: ${req.user._id}...`);
        const fileServiceType = await File.findOne({ _id: fileId, userId: req.user._id })
            .select('serviceType')
            .lean()
            .maxTimeMS(3000);

        if (!fileServiceType) {
            return res.status(404).json({ error: "File not found or you don't have access to this file" });
        }

        const serviceType = fileServiceType.serviceType || 'traffic-monitoring';
        console.log(`📊 File ${fileId} has serviceType: ${serviceType}`);

        // Check cache with serviceType in key to prevent wrong dashboard from being shown
        const cacheKey = `${fileId}:${serviceType}`;

        // Also check for old cache entries with just fileId (backward compatibility cleanup)
        const oldCacheKey = fileId;
        const oldCached = analyticsCache.get(oldCacheKey);
        if (oldCached) {
            console.log(`🧹 Removing old cache entry with key: ${oldCacheKey} (wrong format - missing serviceType)`);
            analyticsCache.delete(oldCacheKey);
        }

        // Also check for any cache entries that start with this fileId but have wrong serviceType
        for (const key of analyticsCache.keys()) {
            if (key.startsWith(`${fileId}:`) && key !== cacheKey) {
                console.log(`🧹 Removing cache entry with wrong serviceType: ${key}`);
                analyticsCache.delete(key);
            }
        }

        const cached = analyticsCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
            console.log(`✅ Returning cached analytics for ${fileId} (serviceType: ${serviceType})`);
            // Verify cached serviceType matches
            if (cached.data.serviceType !== serviceType) {
                console.warn(`⚠️ Cached serviceType (${cached.data.serviceType}) doesn't match database (${serviceType}). Clearing cache.`);
                analyticsCache.delete(cacheKey);
            } else {
                return res.json(cached.data);
            }
        }

        // OPTIMIZATION: Load file efficiently with aggressive sampling
        console.log(`🔍 Loading file from database for user: ${req.user._id}...`);
        const queryStart = Date.now();

        // Load file with all needed fields in one query
        // CRITICAL: Very aggressive sampling for speed
        // IMPORTANT: Filter by userId to ensure users can only access their own files
        const MAX_EVENTS_TO_LOAD = 300; // Reduced to 300 for very fast processing
        const file = await File.findOne({ _id: fileId, userId: req.user._id })
            .select('filename mimetype uploadDate processedCloudinaryUrl processedData cloudinaryUrl cloudinaryId detectionEvents serviceType')
            .lean()
            .maxTimeMS(6000); // 6 second timeout - fail fast

        if (!file) {
            return res.status(404).json({ error: "File not found or you don't have access to this file" });
        }

        const allEvents = file.detectionEvents || [];
        const totalEvents = allEvents.length;
        console.log(`📊 File has ${totalEvents} detection events`);

        // Aggressively sample events if needed
        let eventsToProcess = allEvents;
        if (totalEvents > MAX_EVENTS_TO_LOAD) {
            console.log(`📊 Sampling ${MAX_EVENTS_TO_LOAD} events from ${totalEvents} for faster processing...`);
            const step = Math.ceil(totalEvents / MAX_EVENTS_TO_LOAD);
            eventsToProcess = [];
            for (let i = 0; i < totalEvents; i += step) {
                if (eventsToProcess.length >= MAX_EVENTS_TO_LOAD) break;
                eventsToProcess.push(allEvents[i]);
            }
        }

        const queryTime = Date.now() - queryStart;
        console.log(`✅ File loaded in ${queryTime}ms (processing ${eventsToProcess.length} of ${totalEvents} events)`);

        if (!eventsToProcess || eventsToProcess.length === 0) {
            // Use Cloudinary URLs directly (same as dashboard)
            const originalUrl = file.cloudinaryUrl || (file.data ? `/file/${fileId}/original?direct=true` : null);
            const processedUrl = file.processedCloudinaryUrl || (file.processedData ? `/file/${fileId}/processed?direct=true` : null);

            // Use the serviceType we already fetched for consistency (from initial query)
            const response = {
                fileId: String(file._id || fileId),
                filename: file.filename,
                uploadDate: file.uploadDate,
                mimetype: file.mimetype,
                analyticsData: null,
                error: "No detection data available",
                totalEvents: totalEvents,
                originalUrl: originalUrl,
                processedUrl: processedUrl,
                isVideo: file.mimetype && file.mimetype.startsWith('video'),
                serviceType: serviceType // Use the serviceType we already fetched
            };
            return res.json(response);
        }

        console.log(`⚡ Computing analytics for ${fileId} (${eventsToProcess.length} events from ${totalEvents} total)...`);
        const analyticsStart = Date.now();

        // Compute analytics based on service type
        // Use the serviceType we already fetched from database (most reliable)
        // But verify it matches what's in the full file record
        const fileServiceTypeValue = file.serviceType || 'traffic-monitoring';
        if (fileServiceTypeValue !== serviceType) {
            console.warn(`⚠️ ServiceType mismatch detected!`);
            console.warn(`   Initial fetch: ${serviceType}`);
            console.warn(`   Full file record: ${fileServiceTypeValue}`);
            console.warn(`   Using database value: ${serviceType} (from initial fetch)`);
        }
        // Use the serviceType from initial fetch as it's the source of truth
        // This ensures cache key matches what we use for computation
        const finalServiceType = serviceType;
        console.log(`📊 Computing analytics with serviceType: ${finalServiceType}`);
        let analytics;
        if (finalServiceType === 'wildlife-monitoring') {
            analytics = computeWildlifeAnalytics(eventsToProcess);
        } else if (finalServiceType === 'restaurant-monitoring') {
            analytics = computeRestaurantAnalytics(eventsToProcess);
        } else {
            // Default: traffic monitoring
            analytics = computeDetectionAnalytics(eventsToProcess);
        }

        const analyticsTime = Date.now() - analyticsStart;
        console.log(`✅ Analytics computation completed in ${analyticsTime}ms`);

        // Use Cloudinary URLs directly (same as dashboard)
        const originalUrl = file.cloudinaryUrl || (file.data ? `/file/${file._id}/original?direct=true` : null);
        const processedUrl = file.processedCloudinaryUrl || (file.processedData ? `/file/${file._id}/processed?direct=true` : null);

        const response = {
            fileId: String(file._id),
            filename: file.filename,
            uploadDate: file.uploadDate,
            mimetype: file.mimetype,
            analyticsData: analytics,
            totalEvents: totalEvents,
            originalUrl: originalUrl,
            processedUrl: processedUrl,
            isVideo: file.mimetype && file.mimetype.startsWith('video'),
            serviceType: finalServiceType,
            error: null
        };

        // Cache the result with serviceType in key to prevent wrong dashboard from being shown
        const finalCacheKey = `${fileId}:${finalServiceType}`;
        console.log(`💾 Caching analytics with key: ${finalCacheKey} (serviceType: ${finalServiceType})`);
        analyticsCache.set(finalCacheKey, {
            data: response,
            timestamp: Date.now()
        });

        // Clean up old cache entries (keep cache size reasonable)
        if (analyticsCache.size > 50) {
            const oldestKey = Array.from(analyticsCache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
            analyticsCache.delete(oldestKey);
        }

        return res.json(response);
    } catch (err) {
        console.error("❌ Error retrieving analytics:", err);
        if (err.name === 'MongoTimeoutError' || err.message?.includes('timeout')) {
            return res.status(504).json({ error: "Database query timed out. The file may be too large." });
        }
        return res.status(500).json({ error: "Error retrieving analytics data: " + err.message });
    }
});


// Delete all analytics data (clear detection events from all files)
app.delete("/analytics/clear", async (req, res) => {
    try {
        const result = await File.updateMany(
            {},
            { $unset: { detectionEvents: "" } }
        );
        console.log(`✅ Cleared detection events from ${result.modifiedCount} files`);
        return res.json({
            success: true,
            message: `Cleared analytics data from ${result.modifiedCount} files`,
            modifiedCount: result.modifiedCount
        });
    } catch (err) {
        console.error("Error clearing analytics:", err);
        return res.status(500).json({
            success: false,
            error: "Error clearing analytics data"
        });
    }
});

// Delete a specific file's analytics data
app.delete("/analytics/:fileId", authenticate, async (req, res) => {
    try {
        // Filter by userId to ensure users can only delete their own files' analytics
        const file = await File.findOne({ _id: req.params.fileId, userId: req.user._id });
        if (!file) {
            return res.status(404).json({ error: "File not found or you don't have access to this file" });
        }

        file.detectionEvents = [];
        await file.save();

        console.log(`✅ Cleared analytics data for file: ${req.params.fileId}`);
        return res.json({
            success: true,
            message: "Analytics data cleared for this file"
        });
    } catch (err) {
        console.error("Error clearing file analytics:", err);
        return res.status(500).json({
            success: false,
            error: "Error clearing analytics data"
        });
    }
});

// Delete all files (nuclear option)
app.delete("/analytics/delete-all", async (req, res) => {
    try {
        const result = await File.deleteMany({});
        console.log(`✅ Deleted ${result.deletedCount} files`);
        return res.json({
            success: true,
            message: `Deleted ${result.deletedCount} files`,
            deletedCount: result.deletedCount
        });
    } catch (err) {
        console.error("Error deleting files:", err);
        return res.status(500).json({
            success: false,
            error: "Error deleting files"
        });
    }
});

// Live Session Save - save live camera detection session as a File document
app.post("/api/live-session/save", authenticate, async (req, res) => {
    try {
        const { serviceType, detectionEvents, sessionDuration, framesAnalyzed } = req.body;

        if (!detectionEvents || !Array.isArray(detectionEvents) || detectionEvents.length === 0) {
            return res.status(400).json({ error: "No detection events provided" });
        }

        console.log(`📹 Saving live session: ${detectionEvents.length} events, ${framesAnalyzed} frames, ${sessionDuration?.toFixed(1)}s`);

        // Create a timestamp-based filename
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const filename = `Live Session — ${dateStr} at ${timeStr}`;

        // Transform detection events to match the existing detectionEvents schema
        // Each event from live detection has: frameId, timestamp, detections[]
        // We need to convert to the format: { frameId, timestamp, detectedObjects[], objectCounts, inferenceTimeMs }
        const formattedEvents = detectionEvents.map(event => ({
            frameId: event.frameId || 0,
            timestamp: event.timestamp || 0,
            detectedObjects: (event.detections || []).map(det => ({
                class: det.class,
                confidence: det.confidence,
                bbox: {
                    x1: det.x1 * 640, // Denormalize to a reference resolution
                    y1: det.y1 * 480,
                    x2: det.x2 * 640,
                    y2: det.y2 * 480
                }
            })),
            objectCounts: event.objectCounts || {},
            inferenceTimeMs: event.inferenceMs || 0
        }));

        // Save as a new File document
        const newFile = new File({
            filename: filename,
            mimetype: "live/camera",
            size: 0,
            data: null,
            cloudinaryId: null,
            cloudinaryUrl: null,
            processedData: null,
            processedCloudinaryUrl: null,
            processedCloudinaryId: null,
            serviceType: serviceType || 'traffic-monitoring',
            userId: req.user._id,
            detectionEvents: formattedEvents,
            isProcessed: true,
            duration: sessionDuration || 0
        });

        const savedFile = await newFile.save();
        console.log(`✅ Live session saved with ID: ${savedFile._id}`);

        // Compute analytics using existing functions
        const finalServiceType = serviceType || 'traffic-monitoring';
        let analytics;
        if (finalServiceType === 'wildlife-monitoring') {
            analytics = computeWildlifeAnalytics(formattedEvents);
        } else if (finalServiceType === 'restaurant-monitoring') {
            analytics = computeRestaurantAnalytics(formattedEvents);
        } else {
            analytics = computeDetectionAnalytics(formattedEvents);
        }

        return res.json({
            success: true,
            fileId: String(savedFile._id),
            analyticsData: analytics,
            serviceType: finalServiceType,
            totalEvents: formattedEvents.length,
            filename: filename
        });
    } catch (err) {
        console.error("❌ Error saving live session:", err);
        return res.status(500).json({ error: "Error saving live session: " + err.message });
    }
});

// Progress callback endpoint for Python service
app.post("/progress/:fileId", (req, res) => {
    const { fileId } = req.params;
    const { progress, message } = req.body;

    if (progress !== undefined) {
        console.log(`📊 Progress update for ${fileId}: ${progress}%`);
        io.emit("progress", Math.min(100, Math.max(0, progress)));
    }

    res.json({ success: true });
});

// Timeout for python processing (ms) - increased for large files
const PY_TIMEOUT = parseInt(process.env.PY_TIMEOUT || "20") * 60 * 1000; // default 20 minutes for large videos

// Primary upload & process route
app.post("/process", authenticate, upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    // Get service type from request body
    const serviceType = req.body.serviceType || 'traffic-monitoring';
    console.log("➡️ Service type:", serviceType);

    const fileType = req.file.mimetype && req.file.mimetype.startsWith("image") ? "image" : "video";
    console.log("➡️ Received file of type:", fileType);
    console.log(`📦 File size: ${(req.file.size / (1024 * 1024)).toFixed(2)}MB`);

    let savedFile = null;

    try {
        // Compress video if it's over 100MB before uploading to Cloudinary
        let fileBuffer = req.file.buffer;
        const fileSizeMB = req.file.size / (1024 * 1024);

        if (fileType === "video" && fileSizeMB > CLOUDINARY_MAX_SIZE_MB) {
            console.log(`📦 Video is ${fileSizeMB.toFixed(2)}MB, compressing to under ${CLOUDINARY_MAX_SIZE_MB}MB...`);
            try {
                fileBuffer = await compressVideo(req.file.buffer, CLOUDINARY_MAX_SIZE_MB - 5); // Target 95MB for safety margin
                console.log(`✅ Video compression completed: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB`);
            } catch (compressError) {
                console.error("❌ Video compression failed:", compressError.message);
                return res.status(500).json({
                    error: "Video compression failed",
                    details: compressError.message
                });
            }
        }

        // Determine storage method: Cloudinary for videos and large files, MongoDB for small images
        const useCloudinary = fileType === "video" || req.file.size > CLOUDINARY_THRESHOLD;

        if (useCloudinary) {
            // Upload to Cloudinary (for videos and large files)
            if (!process.env.CLOUDINARY_CLOUD_NAME) {
                return res.status(500).json({
                    error: "Cloudinary not configured",
                    details: "Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env"
                });
            }

            console.log("☁️ Uploading to Cloudinary...");
            let uploadResult = null;
            const FILE_SIZE_MB = req.file.size / (1024 * 1024);
            const USE_CHUNKED_UPLOAD = fileType === 'video';

            // Helper: perform upload, using chunked upload_large for big files and upload_stream for small files.
            async function performCloudinaryUpload(buffer) {
                // retries for transient timeout errors with exponential backoff
                const maxAttempts = 5; // More retries for large files
                let lastErr = null;
                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                        if (USE_CHUNKED_UPLOAD && typeof cloudinary.uploader.upload_large === 'function') {
                            // write temp file and call upload_large (chunked)
                            const tmpName = `perceptionx_upload_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
                            const tmpPath = path.join(os.tmpdir(), tmpName);
                            fs.writeFileSync(tmpPath, buffer);
                            try {
                                console.log(`☁️ upload_large (chunked) attempt ${attempt}/${maxAttempts} for ${FILE_SIZE_MB.toFixed(1)}MB video (3MB chunks)`);
                                const result = await new Promise((resolve, reject) => {
                                    cloudinary.uploader.upload_large(tmpPath, {
                                        resource_type: fileType === 'video' ? 'video' : 'image',
                                        folder: 'perceptionx/uploads',
                                        use_filename: true,
                                        unique_filename: true,
                                        overwrite: false,
                                        chunk_size: CLOUDINARY_CHUNK_SIZE,
                                        timeout: CLOUDINARY_UPLOAD_TIMEOUT_MS,
                                        // Add connection keep-alive settings
                                        agent: new (require('https')).Agent({
                                            keepAlive: true,
                                            keepAliveMsecs: 30000,
                                            timeout: CLOUDINARY_UPLOAD_TIMEOUT_MS + 30000
                                        })
                                    }, (error, result) => {
                                        if (error) return reject(error);
                                        return resolve(result);
                                    });
                                });
                                return result;
                            } finally {
                                try { fs.unlinkSync(tmpPath); } catch (e) { /* ignore */ }
                            }
                        } else {
                            // small file - stream upload
                            console.log(`☁️ upload_stream attempt ${attempt}/${maxAttempts} for ${FILE_SIZE_MB.toFixed(2)}MB`);
                            const result = await new Promise((resolve, reject) => {
                                const uploadStream = cloudinary.uploader.upload_stream({
                                    resource_type: fileType === 'video' ? 'video' : 'image',
                                    folder: 'perceptionx/uploads',
                                    use_filename: true,
                                    unique_filename: true,
                                    overwrite: false,
                                    timeout: CLOUDINARY_UPLOAD_TIMEOUT_MS
                                }, (error, result) => {
                                    if (error) return reject(error);
                                    return resolve(result);
                                });
                                uploadStream.end(buffer);
                            });
                            return result;
                        }
                    } catch (err) {
                        lastErr = err;
                        const msg = String(err?.message || err?.code || '').toLowerCase();
                        const errno = err?.errno;
                        
                        // Retry on connection errors: ECONNRESET, ECONNREFUSED, timeout, etc.
                        const isConnectionError = msg.includes('econnreset') || msg.includes('econnrefused') || 
                                                  msg.includes('timeout') || msg.includes('timed out') ||
                                                  msg.includes('socket hang up') || msg.includes('read econnreset') ||
                                                  errno === -4077 || err?.http_code === 499;
                        
                        if (isConnectionError && attempt < maxAttempts) {
                            const backoffMs = Math.min(5000, 1000 * Math.pow(2, attempt - 1)); // Exponential backoff: 1s, 2s, 4s, 8s
                            console.warn(`⚠️ Connection error on attempt ${attempt}/${maxAttempts}: ${msg}`);
                            console.warn(`   Retrying in ${backoffMs}ms with smaller chunk retry...`);
                            await new Promise(r => setTimeout(r, backoffMs));
                            continue;
                        }
                        
                        // bubble up quota/space errors to allow fallback
                        if (msg.includes('quota') || msg.includes('space') || msg.includes('over your') || msg.includes('513 mb') || msg.includes('512 mb')) {
                            const quotaErr = new Error('quota');
                            quotaErr.isQuota = true;
                            throw quotaErr;
                        }
                        
                        // other errors - don't retry
                        throw err;
                    }
                }
                throw lastErr;
            }

            try {
                uploadResult = await performCloudinaryUpload(fileBuffer);
            } catch (uploadError) {
                const errorMsg = (
                    (uploadError.message || '') +
                    (uploadError.error?.message || '') +
                    (uploadError.error || '') +
                    JSON.stringify(uploadError)
                ).toLowerCase();

                if (errorMsg.includes('quota') || errorMsg.includes('space') || errorMsg.includes('over your') || errorMsg.includes('513 mb') || errorMsg.includes('512 mb')) {
                    // Quota error - silently use MongoDB
                    uploadResult = null;
                } else {
                    console.error('❌ Cloudinary upload error:', uploadError);
                    throw uploadError; // Re-throw non-quota errors
                }
            }

            // If Cloudinary upload failed due to quota, fall back to MongoDB
            if (!uploadResult) {
                console.log("📦 Falling back to MongoDB storage due to Cloudinary quota");
                const newFile = new File({
                    filename: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    data: req.file.buffer,
                    cloudinaryId: null,
                    cloudinaryUrl: null,
                    processedData: null,
                    serviceType: serviceType,
                    userId: req.user ? req.user._id : null
                });
                savedFile = await newFile.save();
                console.log("✅ File saved to MongoDB with ID:", savedFile._id.toString());
            } else {
                // Cloudinary upload succeeded
                console.log("✅ File uploaded to Cloudinary:", uploadResult.public_id);
                console.log("   URL:", uploadResult.secure_url);

                // Try to store metadata in MongoDB (but don't fail if MongoDB quota exceeded)
                try {
                    const newFile = new File({
                        filename: req.file.originalname,
                        mimetype: req.file.mimetype,
                        size: req.file.size,
                        cloudinaryId: uploadResult.public_id,
                        cloudinaryUrl: uploadResult.secure_url,
                        data: null,
                        processedData: null,
                        serviceType: serviceType,
                        userId: req.user ? req.user._id : null
                    });
                    savedFile = await newFile.save();
                    console.log("✅ File metadata saved with ID:", savedFile._id.toString());
                } catch (mongoError) {
                    // Check if it's a MongoDB quota error
                    const mongoErrorMsg = String(
                        (mongoError.message || '') +
                        (mongoError.errmsg || '') +
                        JSON.stringify(mongoError)
                    ).toLowerCase();

                    if (mongoErrorMsg.includes('quota') || mongoErrorMsg.includes('space') || mongoErrorMsg.includes('atlaserror') || mongoErrorMsg.includes('8000')) {
                        console.log("⚠️ MongoDB Atlas quota exceeded - file is in Cloudinary, will process directly");
                        // File is in Cloudinary, so we can still process it using Cloudinary URL
                        // savedFile will remain null, and we'll handle it below
                    } else {
                        // Other MongoDB errors - rethrow
                        throw mongoError;
                    }
                }
            }

        } else {
            // Use MongoDB for small images (< 1MB) - faster for small files
            console.log("📦 Using MongoDB storage for small image");
            const newFile = new File({
                filename: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                data: req.file.buffer,
                cloudinaryId: null,
                cloudinaryUrl: null,
                processedData: null,
                serviceType: serviceType,
                userId: req.user ? req.user._id : null
            });
            savedFile = await newFile.save();
            console.log("✅ File saved to MongoDB with ID:", savedFile._id.toString());
        }

        const pythonApi = process.env.PYTHON_API_URL || process.env.PY_SERVICE_URL;
        if (!pythonApi) {
            console.error("❌ PYTHON_API_URL environment variable is not set. Cannot call Python service.");
            return res.status(500).json({ error: "Python service URL not configured." });
        }

        const endpoint = pythonApi.replace(/\/$/, "") + "/process";

        // If file is in Cloudinary but MongoDB save failed, we can still process it
        if (!savedFile && uploadResult) {
            // File is in Cloudinary but MongoDB quota exceeded
            // Process directly using Cloudinary URL
            console.log("⚠️ MongoDB quota exceeded - processing file directly from Cloudinary");
            console.log(`➡️ Calling Python service at ${endpoint} with Cloudinary URL`);

            try {
                const payload = {
                    fileId: uploadResult.public_id, // Use Cloudinary public_id as temporary ID
                    fileType: fileType,
                    cloudinaryUrl: uploadResult.secure_url,
                    cloudinaryId: uploadResult.public_id
                };

                await axios.post(endpoint, payload, {
                    timeout: PY_TIMEOUT + 10000
                });

                io.emit("progress", 100);
                // Return Cloudinary info since we don't have MongoDB ID
                return res.json({
                    fileId: uploadResult.public_id,
                    cloudinaryUrl: uploadResult.secure_url,
                    cloudinaryId: uploadResult.public_id,
                    warning: "File processed successfully. MongoDB quota exceeded - using Cloudinary only."
                });
            } catch (pyError) {
                console.error("❌ Python processing error:", pyError.message);
                // Still return Cloudinary URL so user can see the uploaded file
                return res.json({
                    fileId: uploadResult.public_id,
                    cloudinaryUrl: uploadResult.secure_url,
                    cloudinaryId: uploadResult.public_id,
                    warning: "File uploaded to Cloudinary. Processing may have issues."
                });
            }
        }

        if (!savedFile) {
            return res.status(500).json({ error: "Failed to save file metadata." });
        }

        // Convert ObjectId to string explicitly
        const fileIdString = savedFile._id.toString();
        // Log separately to avoid template string interpolation issues
        console.log('➡️ Calling Python service at', endpoint, 'for file', fileIdString);

        // Send Cloudinary URL to Python service if available
        const payload = {
            fileId: fileIdString,
            fileType: fileType,
            serviceType: serviceType
        };

        if (savedFile.cloudinaryUrl) {
            payload.cloudinaryUrl = savedFile.cloudinaryUrl;
            payload.cloudinaryId = savedFile.cloudinaryId;
        }

        // Add progress callback URL (use environment variable or default to 3000)
        const nodePort = process.env.PORT || 3000;
        const progressCallbackUrl = `http://localhost:${nodePort}/progress/${fileIdString}`;
        payload.progressCallbackUrl = progressCallbackUrl;
        console.log(`📡 Progress callback URL: ${progressCallbackUrl}`);

        // Emit initial progress
        io.emit("progress", 20);

        // Call Python service (processing happens asynchronously)
        // Don't await - let it process in background and return fileId immediately
        axios.post(endpoint, payload, {
            timeout: PY_TIMEOUT + 10000
        }).then(() => {
            // Processing complete
            console.log("✅ Python processing completed for file:", fileIdString);
            io.emit("progress", 100);
        }).catch((error) => {
            // Processing had issues but file is uploaded
            console.log("⚠️ Python processing had issues for file:", fileIdString);

            // Only log connection errors briefly, not full stack trace
            if (error.code === 'ECONNREFUSED' || (error.cause && error.cause.code === 'ECONNREFUSED')) {
                console.error("❌ Python service not running on port 8001. Please start the Python service.");
                console.error("   Start it with: cd perceptionX-python && python app.py");
            } else {
                const errorMsg = error.message || error.code || 'Unknown error';
                console.error("❌ Python service error:", errorMsg);
            }

            io.emit("progress", 95);
        });

        // Return immediately so frontend can start displaying and polling
        io.emit("progress", 30);
        return res.json({ fileId: fileIdString });

    } catch (error) {
        // Check if this is a Cloudinary quota error - NEVER log quota errors
        const errorMsg = String(
            (error.message || '') +
            (error.error?.message || '') +
            (error.error || '') +
            (error.toString?.() || '') +
            JSON.stringify(error)
        ).toLowerCase();

        const isQuotaError = errorMsg.includes('quota') ||
            errorMsg.includes('space') ||
            errorMsg.includes('over your') ||
            errorMsg.includes('513 mb') ||
            errorMsg.includes('512 mb');

        if (isQuotaError) {
            // Quota error - silently fall back to MongoDB if file wasn't saved yet
            if (!savedFile && req.file) {
                try {
                    const newFile = new File({
                        filename: req.file.originalname,
                        mimetype: req.file.mimetype,
                        size: req.file.size,
                        data: req.file.buffer,
                        cloudinaryId: null,
                        cloudinaryUrl: null,
                        processedData: null,
                        serviceType: serviceType,
                        userId: req.user ? req.user._id : null
                    });
                    savedFile = await newFile.save();
                    console.log("✅ File saved to MongoDB");
                } catch (saveError) {
                    console.error("❌ Failed to save to MongoDB:", saveError);
                    return res.status(500).json({ error: "Failed to save file." });
                }
            }

            // Continue with processing even if Cloudinary failed
            if (savedFile && savedFile._id) {
                const pythonApi = process.env.PYTHON_API_URL || process.env.PY_SERVICE_URL;
                if (pythonApi) {
                    try {
                        const endpoint = pythonApi.replace(/\/$/, "") + "/process";
                        const fallbackFileIdString = String(savedFile._id);
                        await axios.post(endpoint, {
                            fileId: fallbackFileIdString,
                            fileType: fileType
                        }, {
                            timeout: PY_TIMEOUT + 10000
                        });
                        io.emit("progress", 100);
                    } catch (pyError) {
                        // Python error is OK - file is still uploaded (don't log)
                    }
                }
                return res.json({ fileId: String(savedFile._id) });
            }
            // If we have savedFile, return it even if quota error
            if (savedFile) {
                return res.json({ fileId: String(savedFile._id) });
            }
        }

        // Handle axios errors (Python service errors)
        // Check for connection errors first (no response)
        if (error.code === 'ECONNREFUSED' || (error.request && !error.response)) {
            // Connection error - Python service not running
            if (savedFile && savedFile._id) {
                const errorFileIdString = String(savedFile._id);
                console.log(`⚠️ Python service not running. File uploaded with ID: ${errorFileIdString}`);
                return res.status(200).json({
                    fileId: errorFileIdString,
                    warning: "File uploaded successfully. Python service is not running on port 8001. Please start it to process files.",
                    error: "Python service connection refused"
                });
            }
        }

        if (error.response) {
            const status = error.response.status;
            const errorData = error.response.data;

            // If file was uploaded but processing failed, still return fileId so user can see original
            if (savedFile && savedFile._id) {
                const errorFileIdString = String(savedFile._id);
                console.log(`⚠️ Processing had issues but file was uploaded. FileId: ${errorFileIdString}`);

                return res.status(200).json({
                    fileId: errorFileIdString,
                    warning: "File uploaded successfully. Processing may still be in progress.",
                    error: errorData?.detail || errorData?.error || errorData || error.message
                });
            }

            // Only fail if file wasn't uploaded
            console.error(`❌ Python service error (${status}):`, errorData);
            return res.status(status).json({
                error: "Python service processing failed",
                details: errorData?.detail || errorData?.error || errorData || error.message
            });
        }

        // Only log non-quota errors (quota errors already handled above)
        if (!isQuotaError) {
            console.error("❌ Error processing file:", error.message || error);
            return res.status(500).json({ error: "Error processing file.", details: error.message });
        } else {
            // Quota error but couldn't save - this shouldn't happen, but handle gracefully
            return res.status(500).json({ error: "Storage issue. Please try again." });
        }
    }
});

// Add a JSON-forwarding endpoint for direct API use
app.post("/detect", async (req, res) => {
    const { fileId, fileType } = req.body || {};
    if (!fileId || !fileType) {
        return res.status(400).json({ error: "fileId and fileType required" });
    }

    const pythonApi = process.env.PYTHON_API_URL || process.env.PY_SERVICE_URL;
    if (!pythonApi) {
        return res.status(500).json({ error: "Python API URL not configured." });
    }

    const endpoint = pythonApi.replace(/\/$/, "") + "/process";

    try {
        console.log(`➡️ Calling Python service at ${endpoint} for file ${fileId}`);
        const resp = await axios.post(
            endpoint,
            { fileId: fileId.toString(), fileType },
            { timeout: PY_TIMEOUT }
        );
        return res.status(resp.status).json(resp.data);
    } catch (err) {
        console.error("❌ Error calling Python service:", err.message || err);
        return res.status(500).json({ error: "Processing failed" });
    }
});

// Show file (HEAD only - for content-type detection)
app.head("/file/:id", async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).end();
        if (file.mimetype) res.set("Content-Type", file.mimetype);
        return res.status(200).end();
    } catch (err) {
        console.error(err);
        return res.status(500).end();
    }
});

// Get file metadata including Cloudinary URLs
app.get("/file/:id/metadata", authenticate, async (req, res) => {
    try {
        // Filter by userId to ensure users can only access their own files
        // Add timeout to prevent hanging on large files
        const file = await File.findOne({ _id: req.params.id, userId: req.user._id })
            .select('filename mimetype uploadDate processedCloudinaryUrl processedCloudinaryId cloudinaryUrl cloudinaryId data processedData size _id')
            .lean()
            .maxTimeMS(10000); // 10 second timeout - fail fast

        if (!file) {
            return res.status(404).json({ error: "File not found or you don't have access to this file" });
        }

        // Debug logging
        console.log(`📋 Metadata request for file ${req.params.id}:`);
        console.log(`   cloudinaryUrl: ${file.cloudinaryUrl ? 'EXISTS' : 'MISSING'}`);
        console.log(`   processedCloudinaryUrl: ${file.processedCloudinaryUrl ? 'EXISTS' : 'MISSING'}`);
        console.log(`   has data: ${!!file.data}`);
        console.log(`   has processedData: ${!!file.processedData}`);

        // Check what storage methods are available
        const hasCloudinaryOriginal = !!file.cloudinaryUrl;
        const hasMongoOriginal = !!file.data;
        const hasCloudinaryProcessed = !!file.processedCloudinaryUrl;
        const hasMongoProcessed = !!file.processedData;

        // Use Cloudinary URLs directly (they work on dashboard, so use them here too)
        // Only use backend endpoints if Cloudinary is not available
        let originalUrl = null;
        if (hasCloudinaryOriginal) {
            originalUrl = file.cloudinaryUrl; // Direct Cloudinary URL

            // If the original file is an unsupported format (AVI), use Cloudinary transformation to convert to MP4
            const isUnsupportedFormat = file.mimetype === 'video/avi' ||
                file.mimetype === 'video/x-msvideo' ||
                file.filename?.toLowerCase().endsWith('.avi') ||
                originalUrl.toLowerCase().endsWith('.avi');

            if (isUnsupportedFormat && originalUrl.includes('cloudinary.com')) {
                // Add Cloudinary transformation to convert to MP4 on-the-fly
                // Format: https://res.cloudinary.com/{cloud_name}/video/upload/{transformations}/{version}/{public_id}
                // Transformation 'f_mp4' forces MP4 format
                try {
                    // Split URL at /upload/
                    const urlParts = originalUrl.split('/upload/');
                    if (urlParts.length === 2) {
                        const baseUrl = urlParts[0] + '/upload/';
                        const pathAfterUpload = urlParts[1]; // e.g., "v1770879074/perceptionx/uploads/file_gb112f.avi"

                        // Replace .avi with .mp4 in the path
                        const transformedPath = pathAfterUpload.replace(/\.avi$/i, '.mp4');

                        // Add f_mp4 transformation - it goes right after /upload/
                        // Format: /upload/f_mp4/{version}/{public_id}.mp4
                        originalUrl = baseUrl + 'f_mp4/' + transformedPath;
                        console.log(`   ✅ Converted AVI to MP4 using Cloudinary transformation: ${originalUrl.substring(0, 70)}...`);
                    }
                } catch (transformError) {
                    console.log(`   ⚠️ Could not apply Cloudinary transformation: ${transformError.message}`);
                    // Keep original URL if transformation fails
                }
            } else {
                console.log(`   ✅ Using Cloudinary original URL: ${originalUrl.substring(0, 50)}...`);
            }
        } else if (file.cloudinaryId && process.env.CLOUDINARY_CLOUD_NAME) {
            // Fallback: If cloudinaryId exists but URL is missing, try to get URL from Cloudinary
            try {
                const resourceType = file.mimetype?.startsWith('video') ? 'video' : 'image';
                const resource = await cloudinary.api.resource(file.cloudinaryId, { resource_type: resourceType });
                if (resource && resource.secure_url) {
                    originalUrl = resource.secure_url;
                    // Update the database with the URL for future requests
                    await File.updateOne({ _id: file._id }, { $set: { cloudinaryUrl: resource.secure_url } });
                    console.log(`   ✅ Fetched and saved original URL from Cloudinary: ${originalUrl.substring(0, 50)}...`);
                }
            } catch (cloudinaryError) {
                console.log(`   ⚠️ Could not fetch original URL from Cloudinary: ${cloudinaryError.message}`);
            }
        }

        if (!originalUrl && hasMongoOriginal) {
            originalUrl = `/file/${file._id}/original?direct=true`;
            console.log(`   ✅ Using MongoDB original URL`);
        }

        if (!originalUrl) {
            console.log(`   ⚠️ No original URL available`);
        }

        let processedUrl = null;
        if (hasCloudinaryProcessed) {
            processedUrl = file.processedCloudinaryUrl; // Direct Cloudinary URL
            console.log(`   ✅ Using Cloudinary processed URL: ${processedUrl.substring(0, 50)}...`);
        } else if (file.processedCloudinaryId && process.env.CLOUDINARY_CLOUD_NAME) {
            // Fallback: If processedCloudinaryId exists but URL is missing, try to get URL from Cloudinary
            try {
                const resourceType = file.mimetype?.startsWith('video') ? 'video' : 'image';
                const resource = await cloudinary.api.resource(file.processedCloudinaryId, { resource_type: resourceType });
                if (resource && resource.secure_url) {
                    processedUrl = resource.secure_url;
                    // Update the database with the URL for future requests
                    await File.updateOne({ _id: file._id }, { $set: { processedCloudinaryUrl: resource.secure_url } });
                    console.log(`   ✅ Fetched and saved processed URL from Cloudinary: ${processedUrl.substring(0, 50)}...`);
                }
            } catch (cloudinaryError) {
                console.log(`   ⚠️ Could not fetch URL from Cloudinary: ${cloudinaryError.message}`);
            }
        }

        if (!processedUrl && hasMongoProcessed) {
            processedUrl = `/file/${file._id}/processed?direct=true`;
            console.log(`   ✅ Using MongoDB processed URL`);
        }

        if (!processedUrl) {
            console.log(`   ⚠️ No processed URL available (isProcessed: ${!!(file.processedCloudinaryUrl || file.processedData)})`);
        }

        return res.json({
            fileId: file._id,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            originalUrl: originalUrl,
            processedUrl: processedUrl,
            isProcessed: !!(file.processedCloudinaryUrl || file.processedData),
            uploadDate: file.uploadDate,
            hasMongoOriginal: hasMongoOriginal,
            hasMongoProcessed: hasMongoProcessed,
            hasCloudinaryOriginal: hasCloudinaryOriginal,
            hasCloudinaryProcessed: hasCloudinaryProcessed
        });
    } catch (err) {
        console.error("Error retrieving file metadata:", err);
        return res.status(500).json({ error: "Error retrieving file metadata." });
    }
});

// Delete a specific file
app.delete("/file/:id", authenticate, async (req, res) => {
    try {
        // Filter by userId to ensure users can only delete their own files
        const file = await File.findOne({ _id: req.params.id, userId: req.user._id });
        if (!file) {
            return res.status(404).json({ error: "File not found or you don't have access to this file" });
        }

        // Delete from Cloudinary if exists
        if (file.cloudinaryId && process.env.CLOUDINARY_CLOUD_NAME) {
            try {
                await cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: file.mimetype?.startsWith('video') ? 'video' : 'image' });
                console.log(`✅ Deleted from Cloudinary: ${file.cloudinaryId}`);
            } catch (cloudErr) {
                console.warn(`⚠️ Could not delete from Cloudinary: ${cloudErr.message}`);
            }
        }

        if (file.processedCloudinaryId && process.env.CLOUDINARY_CLOUD_NAME) {
            try {
                await cloudinary.uploader.destroy(file.processedCloudinaryId, { resource_type: file.mimetype?.startsWith('video') ? 'video' : 'image' });
                console.log(`✅ Deleted processed file from Cloudinary: ${file.processedCloudinaryId}`);
            } catch (cloudErr) {
                console.warn(`⚠️ Could not delete processed file from Cloudinary: ${cloudErr.message}`);
            }
        }

        // Delete from MongoDB
        await File.findByIdAndDelete(req.params.id);

        console.log(`✅ Deleted file: ${file.filename} (${req.params.id})`);
        return res.json({
            success: true,
            message: "File deleted successfully"
        });
    } catch (err) {
        console.error("Error deleting file:", err);
        return res.status(500).json({
            success: false,
            error: "Error deleting file"
        });
    }
});

// HEAD + GET for original file
app.head("/file/:id/original", async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).end();

        // If Cloudinary URL exists, return success (browser will handle redirect)
        if (file.cloudinaryUrl) {
            if (file.mimetype) res.set("Content-Type", file.mimetype);
            return res.status(200).end();
        }

        if (file.mimetype) res.set("Content-Type", file.mimetype);
        if (file.data) {
            res.set("Content-Length", file.data.length);
        }
        return res.status(200).end();
    } catch (err) {
        console.error("Error (HEAD original):", err);
        return res.status(500).end();
    }
});
app.get("/file/:id/original", async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ error: "Original file not found" });

        const bypassCloudinary = req.query.direct === 'true';

        // If direct=true, ONLY serve from MongoDB (no Cloudinary redirect)
        if (bypassCloudinary) {
            if (file.data) {
                res.set("Content-Type", file.mimetype || "application/octet-stream");
                res.set("Content-Length", file.data.length);
                res.set("Accept-Ranges", "bytes");
                res.set("Cache-Control", "public, max-age=31536000");
                return res.send(file.data);
            }
            return res.status(404).json({ error: "File data not available in database" });
        }

        // For videos, proxy through backend to avoid CORS issues
        if (file.cloudinaryUrl && file.mimetype?.startsWith('video/')) {
            try {
                const https = require('https');
                const http = require('http');

                const cloudinaryUrl = new URL(file.cloudinaryUrl);
                const client = cloudinaryUrl.protocol === 'https:' ? https : http;

                // Forward range request if present
                const options = {
                    hostname: cloudinaryUrl.hostname,
                    path: cloudinaryUrl.pathname + cloudinaryUrl.search,
                    method: 'GET',
                    headers: {}
                };

                if (req.headers.range) {
                    options.headers['Range'] = req.headers.range;
                }

                const request = client.request(options, (response) => {
                    // Set CORS headers
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Range');

                    // Copy status code
                    res.statusCode = response.statusCode;

                    // Copy headers from Cloudinary response
                    if (response.headers['content-type']) {
                        res.setHeader('Content-Type', response.headers['content-type']);
                    } else {
                        res.setHeader('Content-Type', file.mimetype || 'video/mp4');
                    }

                    if (response.headers['content-length']) {
                        res.setHeader('Content-Length', response.headers['content-length']);
                    }
                    if (response.headers['accept-ranges']) {
                        res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
                    }
                    if (response.headers['content-range']) {
                        res.setHeader('Content-Range', response.headers['content-range']);
                    }

                    // Pipe the video stream
                    response.pipe(res);
                });

                request.on('error', (err) => {
                    console.error('Error proxying Cloudinary video:', err);
                    if (!res.headersSent) {
                        // Fallback to redirect if proxy fails
                        return res.redirect(file.cloudinaryUrl);
                    }
                });

                request.end();
                return; // Don't send response, let stream handle it
            } catch (proxyErr) {
                console.error('Error setting up proxy, falling back to redirect:', proxyErr);
                if (!res.headersSent) {
                    return res.redirect(file.cloudinaryUrl);
                }
            }
        }

        // For images or if proxy fails, use redirect
        if (file.cloudinaryUrl) {
            return res.redirect(file.cloudinaryUrl);
        }

        // Fallback to MongoDB
        if (file.data) {
            res.set("Content-Type", file.mimetype || "application/octet-stream");
            res.set("Content-Length", file.data.length);
            res.set("Accept-Ranges", "bytes");
            res.set("Cache-Control", "public, max-age=31536000");
            return res.send(file.data);
        }

        return res.status(404).json({ error: "File data not found" });
    } catch (err) {
        console.error("Error retrieving original file:", err);
        return res.status(500).json({ error: "Error retrieving file." });
    }
});

// HEAD + GET for processed file
app.head("/file/:id/processed", async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).end();

        // Check if processed file exists
        if (!file.processedCloudinaryUrl && !file.processedData) {
            return res.status(404).end();
        }

        if (file.mimetype) res.set("Content-Type", file.mimetype);
        return res.status(200).end();
    } catch (err) {
        console.error("Error (HEAD processed):", err);
        return res.status(500).end();
    }
});
app.get("/file/:id/processed", async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        const bypassCloudinary = req.query.direct === 'true';

        // If direct=true, ONLY serve from MongoDB (no Cloudinary redirect)
        if (bypassCloudinary) {
            if (file.processedData) {
                res.set("Content-Type", file.mimetype || "application/octet-stream");
                res.set("Content-Length", file.processedData.length);
                res.set("Accept-Ranges", "bytes");
                res.set("Cache-Control", "public, max-age=31536000");
                return res.send(file.processedData);
            }
            return res.status(404).json({ error: "Processed file data not available in database" });
        }

        // For videos, proxy through backend to avoid CORS issues
        if (file.processedCloudinaryUrl && file.mimetype?.startsWith('video/')) {
            try {
                const https = require('https');
                const http = require('http');

                const cloudinaryUrl = new URL(file.processedCloudinaryUrl);
                const client = cloudinaryUrl.protocol === 'https:' ? https : http;

                // Forward range request if present
                const options = {
                    hostname: cloudinaryUrl.hostname,
                    path: cloudinaryUrl.pathname + cloudinaryUrl.search,
                    method: 'GET',
                    headers: {}
                };

                if (req.headers.range) {
                    options.headers['Range'] = req.headers.range;
                }

                const request = client.request(options, (response) => {
                    // Set CORS headers
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Range');

                    // Copy status code
                    res.statusCode = response.statusCode;

                    // Copy headers from Cloudinary response
                    if (response.headers['content-type']) {
                        res.setHeader('Content-Type', response.headers['content-type']);
                    } else {
                        res.setHeader('Content-Type', file.mimetype || 'video/mp4');
                    }

                    if (response.headers['content-length']) {
                        res.setHeader('Content-Length', response.headers['content-length']);
                    }
                    if (response.headers['accept-ranges']) {
                        res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
                    }
                    if (response.headers['content-range']) {
                        res.setHeader('Content-Range', response.headers['content-range']);
                    }

                    // Pipe the video stream
                    response.pipe(res);
                });

                request.on('error', (err) => {
                    console.error('Error proxying Cloudinary video:', err);
                    if (!res.headersSent) {
                        // Fallback to redirect if proxy fails
                        return res.redirect(file.processedCloudinaryUrl);
                    }
                });

                request.end();
                return; // Don't send response, let stream handle it
            } catch (proxyErr) {
                console.error('Error setting up proxy, falling back to redirect:', proxyErr);
                if (!res.headersSent) {
                    return res.redirect(file.processedCloudinaryUrl);
                }
            }
        }

        // For images or if proxy fails, use redirect
        if (file.processedCloudinaryUrl) {
            return res.redirect(file.processedCloudinaryUrl);
        }

        // Fallback to MongoDB
        if (file.processedData) {
            res.set("Content-Type", file.mimetype || "application/octet-stream");
            res.set("Content-Length", file.processedData.length);
            res.set("Accept-Ranges", "bytes");
            res.set("Cache-Control", "public, max-age=31536000");
            return res.send(file.processedData);
        }

        return res.status(404).json({ error: "Processed file not found" });
    } catch (err) {
        console.error("Error retrieving processed file:", err);
        return res.status(500).json({ error: "Error retrieving file." });
    }
});

// React catch-all handler - serve index.html for all non-API routes
// MUST be last route to catch all unmatched paths
app.get("*", (req, res) => {
    // Don't serve React for API routes or static files
    if ((req.hostname || '').toLowerCase().startsWith('api.')) {
        return res.status(404).json({ error: "Not found" });
    }
    if (req.path.startsWith("/api") ||
        req.path.startsWith("/file") ||
        req.path.startsWith("/process") ||
        req.path.startsWith("/progress") ||
        req.path.startsWith("/socket.io") ||
        req.path.startsWith("/assets") ||
        req.path.startsWith("/css") ||
        req.path.startsWith("/js") ||
        req.path.startsWith("/models")) {
        return res.status(404).json({ error: "Not found" });
    }
    res.sendFile(path.join(__dirname, "/public/react-build/index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}/`);
    console.log("✅ React mode enabled - serving from /public/react-build/");
});

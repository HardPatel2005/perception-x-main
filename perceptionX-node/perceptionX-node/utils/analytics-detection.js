/**
 * Detection-Based Analytics Engine
 * Computes analytics ONLY from raw detection data (no tracking)
 */

// Traffic-relevant classes
const VEHICLE_CLASSES = ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'train', 'boat', 'vehicle'];
const PEDESTRIAN_CLASSES = ['person', 'hand', 'face', 'head', 'body'];
const INFRASTRUCTURE_CLASSES = ['traffic light', 'stop sign', 'parking meter', 'fire hydrant'];

// Density thresholds
const DENSITY_THRESHOLDS = {
    vehicle: { low: 3, moderate: 8, high: 15 },
    pedestrian: { low: 2, moderate: 5, high: 10 }
};

/**
 * Calculate scene overview from detection events
 * Uses average per frame to avoid counting same object multiple times
 */
function calculateSceneOverview(detectionEvents) {
    if (!detectionEvents || detectionEvents.length === 0) {
        return {
            totalObjects: 0,
            vehicles: 0,
            pedestrians: 0,
            infrastructure: 0,
            avgVehiclesPerFrame: 0,
            avgPedestriansPerFrame: 0,
            avgObjectsPerFrame: 0,
            totalFrames: 0,
            currentFrame: {
                totalObjects: 0,
                vehicles: 0,
                pedestrians: 0,
                infrastructure: 0
            }
        };
    }

    let totalVehicles = 0;
    let totalPedestrians = 0;
    let totalInfrastructure = 0;
    let totalObjects = 0;
    let framesWithData = 0;

    // Get current frame (last frame)
    const currentFrame = detectionEvents[detectionEvents.length - 1];
    let currentVehicles = 0;
    let currentPedestrians = 0;
    let currentInfrastructure = 0;
    let currentTotal = 0;

    if (currentFrame && currentFrame.detectedObjects) {
        currentFrame.detectedObjects.forEach(obj => {
            const className = (obj.class || '').toLowerCase();
            currentTotal++;
            if (VEHICLE_CLASSES.some(v => className.includes(v))) {
                currentVehicles++;
            } else if (PEDESTRIAN_CLASSES.some(p => className.includes(p))) {
                currentPedestrians++;
            } else if (INFRASTRUCTURE_CLASSES.some(i => className.includes(i))) {
                currentInfrastructure++;
            }
        });
    }

    // Calculate average per frame (not sum across all frames)
    let framesWithVehicles = 0;
    let framesWithPedestrians = 0;

    detectionEvents.forEach(event => {
        if (event.detectedObjects && Array.isArray(event.detectedObjects) && event.detectedObjects.length > 0) {
            framesWithData++;
            let frameVehicles = 0;
            let framePedestrians = 0;
            let frameInfrastructure = 0;
            let frameObjects = 0;

            event.detectedObjects.forEach(obj => {
                const className = (obj.class || '').toLowerCase();
                frameObjects++;
                if (VEHICLE_CLASSES.some(v => className.includes(v))) {
                    frameVehicles++;
                } else if (PEDESTRIAN_CLASSES.some(p => className.includes(p))) {
                    framePedestrians++;
                } else if (INFRASTRUCTURE_CLASSES.some(i => className.includes(i))) {
                    frameInfrastructure++;
                }
            });

            // Track frames with detections
            if (frameVehicles > 0) framesWithVehicles++;
            if (framePedestrians > 0) framesWithPedestrians++;

            // Add to totals (for average calculation)
            totalVehicles += frameVehicles;
            totalPedestrians += framePedestrians;
            totalInfrastructure += frameInfrastructure;
            totalObjects += frameObjects;
        }
    });

    // Calculate averages
    const totalFrames = detectionEvents.length;
    const avgVehiclesPerFrame = framesWithData > 0 ? totalVehicles / framesWithData : 0;
    const avgPedestriansPerFrame = framesWithData > 0 ? totalPedestrians / framesWithData : 0;
    const avgObjectsPerFrame = framesWithData > 0 ? totalObjects / framesWithData : 0;

    // Calculate MODE (most common count) for more accurate unique count estimation
    // This is better than average for static cameras
    const vehicleCounts = {};
    const pedestrianCounts = {};

    detectionEvents.forEach(event => {
        if (event.detectedObjects && Array.isArray(event.detectedObjects)) {
            let frameVehicles = 0;
            let framePedestrians = 0;

            event.detectedObjects.forEach(obj => {
                const className = (obj.class || '').toLowerCase();
                if (VEHICLE_CLASSES.some(v => className.includes(v))) {
                    frameVehicles++;
                } else if (PEDESTRIAN_CLASSES.some(p => className.includes(p))) {
                    framePedestrians++;
                }
            });

            vehicleCounts[frameVehicles] = (vehicleCounts[frameVehicles] || 0) + 1;
            pedestrianCounts[framePedestrians] = (pedestrianCounts[framePedestrians] || 0) + 1;
        }
    });

    // Find MODE (most common count)
    const vehicleMode = Object.keys(vehicleCounts).reduce((a, b) =>
        vehicleCounts[a] > vehicleCounts[b] ? a : b, '0'
    );
    const pedestrianMode = Object.keys(pedestrianCounts).reduce((a, b) =>
        pedestrianCounts[a] > pedestrianCounts[b] ? a : b, '0'
    );

    // Use MODE as the representative unique count (most common scene state)
    // This avoids counting the same object multiple times across frames
    const estimatedUniqueVehicles = parseInt(vehicleMode) || Math.round(avgVehiclesPerFrame);
    const estimatedUniquePedestrians = parseInt(pedestrianMode) || Math.round(avgPedestriansPerFrame);

    // For infrastructure, use average (less variable)
    const estimatedUniqueInfrastructure = Math.round((framesWithData > 0 ? totalInfrastructure / framesWithData : 0));
    const estimatedUniqueObjects = estimatedUniqueVehicles + estimatedUniquePedestrians + estimatedUniqueInfrastructure;

    // Calculate peak counts (maximum seen in any single frame)
    // This gives a better sense of unique objects than averages
    let peakVehicles = 0;
    let peakPedestrians = 0;
    let peakInfrastructure = 0;
    let peakObjects = 0;
    let peakVehicleTimestamp = null;
    let peakPedestrianTimestamp = null;

    // First pass: Find peak counts
    detectionEvents.forEach(event => {
        if (event.detectedObjects && Array.isArray(event.detectedObjects)) {
            let frameVehicles = 0;
            let framePedestrians = 0;
            let frameInfrastructure = 0;
            let frameObjects = 0;

            event.detectedObjects.forEach(obj => {
                const className = (obj.class || '').toLowerCase();
                frameObjects++;
                if (VEHICLE_CLASSES.some(v => className.includes(v))) {
                    frameVehicles++;
                } else if (PEDESTRIAN_CLASSES.some(p => className.includes(p))) {
                    framePedestrians++;
                } else if (INFRASTRUCTURE_CLASSES.some(i => className.includes(i))) {
                    frameInfrastructure++;
                }
            });

            if (frameVehicles > peakVehicles) {
                peakVehicles = frameVehicles;
            }
            if (framePedestrians > peakPedestrians) {
                peakPedestrians = framePedestrians;
            }
            peakInfrastructure = Math.max(peakInfrastructure, frameInfrastructure);
            peakObjects = Math.max(peakObjects, frameObjects);
        }
    });

    // Second pass: Find all frames with peak counts, then select a representative one (middle of peak period)
    const peakVehicleFrames = [];
    const peakPedestrianFrames = [];

    detectionEvents.forEach(event => {
        if (event.detectedObjects && Array.isArray(event.detectedObjects)) {
            let frameVehicles = 0;
            let framePedestrians = 0;

            event.detectedObjects.forEach(obj => {
                const className = (obj.class || '').toLowerCase();
                if (VEHICLE_CLASSES.some(v => className.includes(v))) {
                    frameVehicles++;
                } else if (PEDESTRIAN_CLASSES.some(p => className.includes(p))) {
                    framePedestrians++;
                }
            });

            if (frameVehicles === peakVehicles && peakVehicles > 0) {
                peakVehicleFrames.push(event);
            }
            if (framePedestrians === peakPedestrians && peakPedestrians > 0) {
                peakPedestrianFrames.push(event);
            }
        }
    });

    // Select representative frame (middle of peak period) and extract timestamp
    if (peakVehicleFrames.length > 0) {
        const middleIndex = Math.floor(peakVehicleFrames.length / 2);
        const representativeFrame = peakVehicleFrames[middleIndex];
        let timestamp = representativeFrame.timestamp;

        // Convert to seconds if timestamp is in milliseconds (timestamp > 1000000 suggests milliseconds)
        if (timestamp && timestamp > 1000000) {
            timestamp = timestamp / 1000;
        }
        peakVehicleTimestamp = timestamp || null;
    }

    if (peakPedestrianFrames.length > 0) {
        const middleIndex = Math.floor(peakPedestrianFrames.length / 2);
        const representativeFrame = peakPedestrianFrames[middleIndex];
        let timestamp = representativeFrame.timestamp;

        // Convert to seconds if timestamp is in milliseconds (timestamp > 1000000 suggests milliseconds)
        if (timestamp && timestamp > 1000000) {
            timestamp = timestamp / 1000;
        }
        peakPedestrianTimestamp = timestamp || null;
    }

    // Calculate detection frequency (percentage of frames with detections)
    const vehicleDetectionFrequency = totalFrames > 0 ? Math.round((framesWithVehicles / totalFrames) * 100) : 0;
    const pedestrianDetectionFrequency = totalFrames > 0 ? Math.round((framesWithPedestrians / totalFrames) * 100) : 0;

    // Calculate detection rate (detections per minute)
    // Estimate duration: assume ~30 FPS if no timestamps, or use actual timestamps
    let estimatedDurationSeconds = 0;
    if (detectionEvents.length > 0) {
        const firstTimestamp = detectionEvents[0].timestamp || 0;
        const lastTimestamp = detectionEvents[detectionEvents.length - 1].timestamp || 0;
        if (lastTimestamp > firstTimestamp) {
            estimatedDurationSeconds = (lastTimestamp - firstTimestamp) / 1000; // Convert ms to seconds
        } else {
            // Fallback: assume 30 FPS
            estimatedDurationSeconds = detectionEvents.length / 30;
        }
    }
    const detectionRatePerMinute = estimatedDurationSeconds > 0
        ? Math.round((totalVehicles / estimatedDurationSeconds) * 60)
        : 0;
    const pedestrianDetectionRatePerMinute = estimatedDurationSeconds > 0
        ? Math.round((totalPedestrians / estimatedDurationSeconds) * 60)
        : 0;

    // Calculate pedestrian activity level based on frequency and average density
    // Use 5 levels: Very Low, Low, Moderate, High, Very High
    // Fixed logic: 1 person should be "Low", not "Moderate"
    let pedestrianActivityLevel = 'Very Low';

    // Priority: Check density first for accurate classification
    // Very High: High density (>=3 per frame) AND good frequency (>=50%)
    if (avgPedestriansPerFrame >= 3 && pedestrianDetectionFrequency >= 50) {
        pedestrianActivityLevel = 'Very High';
    }
    // High: Moderate-high density (>=2 per frame) AND good frequency (>=40%)
    else if (avgPedestriansPerFrame >= 2 && pedestrianDetectionFrequency >= 40) {
        pedestrianActivityLevel = 'High';
    }
    // Moderate: Moderate density (>=1.5 per frame) AND some frequency (>=25%)
    else if (avgPedestriansPerFrame >= 1.5 && pedestrianDetectionFrequency >= 25) {
        pedestrianActivityLevel = 'Moderate';
    }
    // Low: Low density (>=0.5 per frame) OR (density >=0.8 AND density <1.5)
    // This ensures 1 person (avg ~1.0) is classified as "Low" regardless of frequency
    else if (avgPedestriansPerFrame >= 0.5 || (avgPedestriansPerFrame >= 0.8 && avgPedestriansPerFrame < 1.5)) {
        pedestrianActivityLevel = 'Low';
    }
    // Very Low: Everything else (density <0.5)
    else {
        pedestrianActivityLevel = 'Very Low';
    }

    // Calculate pedestrian activity score (0-100) based on multiple factors
    const frequencyScore = pedestrianDetectionFrequency; // 0-100
    const densityScore = Math.min(avgPedestriansPerFrame * 20, 100); // Scale avg to 0-100
    const pedestrianActivityScore = Math.round((frequencyScore * 0.6 + densityScore * 0.4));

    return {
        totalObjects: estimatedUniqueObjects,
        vehicles: estimatedUniqueVehicles,
        pedestrians: estimatedUniquePedestrians,
        infrastructure: estimatedUniqueInfrastructure,
        totalVehicleDetections: totalVehicles,
        totalPedestrianDetections: totalPedestrians,
        totalObjectDetections: totalObjects,
        avgVehiclesPerFrame: Math.round(avgVehiclesPerFrame * 10) / 10,
        avgPedestriansPerFrame: Math.round(avgPedestriansPerFrame * 10) / 10,
        avgObjectsPerFrame: Math.round(avgObjectsPerFrame * 10) / 10,
        peakVehicles: peakVehicles,
        peakPedestrians: peakPedestrians,
        peakInfrastructure: peakInfrastructure,
        peakObjects: peakObjects,
        peakVehicleTimestamp: peakVehicleTimestamp,
        peakPedestrianTimestamp: peakPedestrianTimestamp,
        totalFrames: totalFrames,
        framesWithVehicles: framesWithVehicles,
        framesWithPedestrians: framesWithPedestrians,
        vehicleDetectionFrequency: vehicleDetectionFrequency,
        pedestrianDetectionFrequency: pedestrianDetectionFrequency,
        vehicleDetectionRatePerMinute: detectionRatePerMinute,
        pedestrianDetectionRatePerMinute: pedestrianDetectionRatePerMinute,
        pedestrianActivityLevel: pedestrianActivityLevel,
        pedestrianActivityScore: pedestrianActivityScore,
        currentFrame: {
            totalObjects: currentTotal,
            vehicles: currentVehicles,
            pedestrians: currentPedestrians,
            infrastructure: currentInfrastructure
        }
    };
}

/**
 * Calculate scene density per frame
 */
function calculateSceneDensity(detectionEvents) {
    if (!detectionEvents || detectionEvents.length === 0) {
        return {
            frames: [],
            vehicleDensityLevel: 'Very Low',
            pedestrianDensityLevel: 'Very Low',
            avgVehicleDensity: 0,
            avgPedestrianDensity: 0
        };
    }

    // OPTIMIZATION: Sample frames for density chart (every 10th frame)
    const densityFrames = [];
    let totalVehicleCount = 0;
    let totalPedestrianCount = 0;
    const sampleRate = Math.max(1, Math.floor(detectionEvents.length / 100)); // Max 100 frames for chart

    for (let i = 0; i < detectionEvents.length; i += sampleRate) {
        const event = detectionEvents[i];
        let vehicleCount = 0;
        let pedestrianCount = 0;
        let totalCount = 0;

        if (event.detectedObjects && Array.isArray(event.detectedObjects)) {
            const objects = event.detectedObjects;
            for (let j = 0; j < objects.length; j++) {
                const obj = objects[j];
                const className = (obj.class || '').toLowerCase();
                totalCount++;
                // Quick class check (optimized)
                if (className.includes('car') || className.includes('truck') || className.includes('bus') ||
                    className.includes('motorcycle') || className.includes('bicycle') || className.includes('vehicle')) {
                    vehicleCount++;
                } else if (className.includes('person') || className.includes('pedestrian')) {
                    pedestrianCount++;
                }
            }
        }

        totalVehicleCount += vehicleCount;
        totalPedestrianCount += pedestrianCount;

        // Store frame index and actual timestamp for time calculation
        densityFrames.push({
            frame: i,
            timestamp: event.timestamp || null, // Don't use frame index as timestamp
            totalObjects: totalCount,
            vehicles: vehicleCount,
            pedestrians: pedestrianCount
        });
    }

    // Calculate averages based on sampled frames
    const sampledFramesCount = densityFrames.length;
    const avgVehicleDensity = sampledFramesCount > 0
        ? totalVehicleCount / sampledFramesCount
        : 0;
    const avgPedestrianDensity = sampledFramesCount > 0
        ? totalPedestrianCount / sampledFramesCount
        : 0;

    // Determine density levels
    // Vehicle density levels: Very Low, Low, Moderate, High, Very High
    let vehicleDensityLevel = 'Very Low';
    if (avgVehicleDensity >= DENSITY_THRESHOLDS.vehicle.high) {
        vehicleDensityLevel = 'Very High';
    } else if (avgVehicleDensity >= DENSITY_THRESHOLDS.vehicle.moderate) {
        vehicleDensityLevel = 'High';
    } else if (avgVehicleDensity >= DENSITY_THRESHOLDS.vehicle.low) {
        vehicleDensityLevel = 'Moderate';
    } else if (avgVehicleDensity >= 1) {
        vehicleDensityLevel = 'Low';
    }

    // Pedestrian density levels: Very Low, Low, Moderate, High, Very High
    let pedestrianDensityLevel = 'Very Low';
    if (avgPedestrianDensity >= DENSITY_THRESHOLDS.pedestrian.high) {
        pedestrianDensityLevel = 'Very High';
    } else if (avgPedestrianDensity >= DENSITY_THRESHOLDS.pedestrian.moderate) {
        pedestrianDensityLevel = 'High';
    } else if (avgPedestrianDensity >= DENSITY_THRESHOLDS.pedestrian.low) {
        pedestrianDensityLevel = 'Moderate';
    } else if (avgPedestrianDensity >= 0.5) {
        pedestrianDensityLevel = 'Low';
    }

    // Calculate video duration from ALL detection events (not just sampled frames)
    // This ensures we get the full video duration, not just the sampled portion
    let videoDurationSeconds = 0;
    if (detectionEvents.length > 0) {
        const firstTimestamp = detectionEvents[0].timestamp || 0;
        const lastTimestamp = detectionEvents[detectionEvents.length - 1].timestamp || 0;
        if (lastTimestamp > firstTimestamp && lastTimestamp > 1000) {
            // Timestamps are in milliseconds
            videoDurationSeconds = (lastTimestamp - firstTimestamp) / 1000;
        } else if (lastTimestamp > firstTimestamp) {
            // Timestamps might be in seconds
            videoDurationSeconds = lastTimestamp - firstTimestamp;
        } else {
            // Fallback: calculate from total number of events (assume 30 FPS)
            // This gives us the full video duration, not just sampled frames
            videoDurationSeconds = detectionEvents.length / 30;
        }
    }

    return {
        frames: densityFrames,
        vehicleDensityLevel,
        pedestrianDensityLevel,
        avgVehicleDensity: Math.round(avgVehicleDensity * 10) / 10,
        avgPedestrianDensity: Math.round(avgPedestrianDensity * 10) / 10,
        videoDurationSeconds: videoDurationSeconds,
        totalFrames: detectionEvents.length // Store total frames for reference
    };
}

/**
 * Calculate object distribution (vehicle classes)
 */
function calculateObjectDistribution(detectionEvents) {
    const distribution = {
        car: 0,
        bus: 0,
        truck: 0,
        motorcycle: 0,
        bicycle: 0,
        other: 0
    };

    detectionEvents.forEach(event => {
        if (event.detectedObjects && Array.isArray(event.detectedObjects)) {
            event.detectedObjects.forEach(obj => {
                const className = (obj.class || '').toLowerCase();
                if (VEHICLE_CLASSES.some(v => className.includes(v))) {
                    if (className.includes('car')) {
                        distribution.car++;
                    } else if (className.includes('bus')) {
                        distribution.bus++;
                    } else if (className.includes('truck')) {
                        distribution.truck++;
                    } else if (className.includes('motorcycle')) {
                        distribution.motorcycle++;
                    } else if (className.includes('bicycle') || className.includes('bike')) {
                        distribution.bicycle++;
                    } else {
                        distribution.other++;
                    }
                }
            });
        }
    });

    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total === 0) {
        return [];
    }

    const distributionArray = Object.entries(distribution)
        .filter(([_, count]) => count > 0)
        .map(([mode, count]) => ({
            name: mode.charAt(0).toUpperCase() + mode.slice(1),
            value: count,
            percentage: ((count / total) * 100).toFixed(1)
        }))
        .sort((a, b) => b.value - a.value);

    // Find most common vehicle type
    const mostCommonVehicleType = distributionArray.length > 0 ? distributionArray[0] : null;

    // Return array for backward compatibility with ObjectDistribution component
    return distributionArray;
}

/**
 * Calculate temporal detection trends
 */
function calculateTemporalTrends(detectionEvents, timeWindowSeconds = 60) {
    if (!detectionEvents || detectionEvents.length === 0) return [];

    const firstTimestamp = detectionEvents[0].timestamp || 0;
    const timeBins = {};

    // OPTIMIZATION: Process every 5th event for trends
    const sampleRate = Math.max(1, Math.floor(detectionEvents.length / 100)); // Max 100 data points (reduced)

    for (let i = 0; i < detectionEvents.length; i += sampleRate) {
        const event = detectionEvents[i];
        const bin = Math.floor((event.timestamp - firstTimestamp) / timeWindowSeconds);

        if (!timeBins[bin]) {
            timeBins[bin] = {
                vehicles: 0,
                pedestrians: 0,
                signals: 0
            };
        }

        if (event.detectedObjects && Array.isArray(event.detectedObjects)) {
            const objects = event.detectedObjects;
            for (let j = 0; j < objects.length; j++) {
                const obj = objects[j];
                const className = (obj.class || '').toLowerCase();
                // Quick class check
                if (className.includes('car') || className.includes('truck') || className.includes('bus') ||
                    className.includes('motorcycle') || className.includes('bicycle') || className.includes('vehicle')) {
                    timeBins[bin].vehicles++;
                } else if (className.includes('person') || className.includes('pedestrian')) {
                    timeBins[bin].pedestrians++;
                } else if (className.includes('traffic light') || className.includes('stop sign')) {
                    timeBins[bin].signals++;
                }
            }
        }
    }

    const trends = [];
    const maxBin = Math.max(...Object.keys(timeBins).map(Number), 0);

    for (let bin = 0; bin <= maxBin; bin++) {
        const timeLabel = `${Math.floor((bin * timeWindowSeconds) / 60)}:${String((bin * timeWindowSeconds) % 60).padStart(2, '0')}`;
        trends.push({
            time: timeLabel,
            vehicles: timeBins[bin]?.vehicles || 0,
            pedestrians: timeBins[bin]?.pedestrians || 0,
            signals: timeBins[bin]?.signals || 0
        });
    }

    return trends;
}

/**
 * Calculate detection confidence analytics
 */
function calculateConfidenceAnalytics(detectionEvents) {
    if (!detectionEvents || detectionEvents.length === 0) {
        return {
            avgConfidence: 0,
            avgConfidenceByClass: {},
            confidenceTrend: [],
            lowConfidenceCount: 0
        };
    }

    const confidenceByClass = {};
    const confidenceTrend = [];
    let totalConfidence = 0;
    let confidenceCount = 0;
    let lowConfidenceCount = 0;
    const LOW_CONFIDENCE_THRESHOLD = 0.5;

    // OPTIMIZATION: Sample frames for confidence trend (every 10th frame)
    const trendSampleRate = Math.max(1, Math.floor(detectionEvents.length / 30)); // Max 30 data points (reduced)

    for (let i = 0; i < detectionEvents.length; i++) {
        const event = detectionEvents[i];
        let frameConfidence = 0;
        let frameConfidenceCount = 0;

        if (event.detectedObjects && Array.isArray(event.detectedObjects)) {
            const objects = event.detectedObjects;
            for (let j = 0; j < objects.length; j++) {
                const obj = objects[j];
                const conf = obj.confidence || 0;
                const className = (obj.class || '').toLowerCase();

                if (conf > 0) {
                    totalConfidence += conf;
                    confidenceCount++;
                    frameConfidence += conf;
                    frameConfidenceCount++;

                    if (conf < LOW_CONFIDENCE_THRESHOLD) {
                        lowConfidenceCount++;
                    }

                    if (!confidenceByClass[className]) {
                        confidenceByClass[className] = { sum: 0, count: 0 };
                    }
                    confidenceByClass[className].sum += conf;
                    confidenceByClass[className].count++;
                }
            }
        }

        // Only add to trend if sampled
        if (i % trendSampleRate === 0 && frameConfidenceCount > 0) {
            confidenceTrend.push({
                frame: i,
                timestamp: event.timestamp || i,
                avgConfidence: frameConfidence / frameConfidenceCount
            });
        }
    }

    const avgConfidence = confidenceCount > 0
        ? Math.round((totalConfidence / confidenceCount) * 1000) / 1000
        : 0;

    const avgConfidenceByClass = {};
    Object.keys(confidenceByClass).forEach(className => {
        const data = confidenceByClass[className];
        avgConfidenceByClass[className] = data.count > 0
            ? Math.round((data.sum / data.count) * 1000) / 1000
            : 0;
    });

    return {
        avgConfidence,
        avgConfidenceByClass,
        confidenceTrend: confidenceTrend.slice(0, 50), // Sample for chart
        lowConfidenceCount
    };
}

/**
 * Generate detection-based traffic alerts
 */
function generateDetectionAlerts(detectionEvents) {
    const alerts = [];
    const CONGESTION_THRESHOLD = 15; // vehicles per frame
    const CROWD_THRESHOLD = 10; // pedestrians per frame
    const SIGNAL_MISSING_FRAMES = 30; // consecutive frames without signal
    const SPIKE_THRESHOLD = 10; // sudden increase in vehicles

    let consecutiveFramesWithoutSignal = 0;
    let previousVehicleCount = 0;

    // OPTIMIZATION: Sample every 5th frame for alerts (still catch most issues)
    const alertSampleRate = Math.max(1, Math.floor(detectionEvents.length / 500)); // Max 500 checks (reduced)

    for (let frameIndex = 0; frameIndex < detectionEvents.length; frameIndex += alertSampleRate) {
        const event = detectionEvents[frameIndex];
        let vehicleCount = 0;
        let pedestrianCount = 0;
        let signalDetected = false;

        if (event.detectedObjects && Array.isArray(event.detectedObjects)) {
            event.detectedObjects.forEach(obj => {
                const className = (obj.class || '').toLowerCase();
                if (VEHICLE_CLASSES.some(v => className.includes(v))) {
                    vehicleCount++;
                } else if (PEDESTRIAN_CLASSES.some(p => className.includes(p))) {
                    pedestrianCount++;
                } else if (className.includes('traffic light') || className.includes('stop sign')) {
                    signalDetected = true;
                }
            });
        }

        // High Traffic Density Alert
        if (vehicleCount > CONGESTION_THRESHOLD) {
            alerts.push({
                type: 'High Traffic Density',
                message: `${vehicleCount} vehicles detected in frame ${frameIndex} (threshold: ${CONGESTION_THRESHOLD})`,
                severity: 'high',
                timestamp: event.timestamp || frameIndex,
                frame: frameIndex
            });
        }

        // Pedestrian Crowd Alert
        if (pedestrianCount > CROWD_THRESHOLD) {
            alerts.push({
                type: 'Pedestrian Crowd',
                message: `${pedestrianCount} pedestrians detected in frame ${frameIndex} (threshold: ${CROWD_THRESHOLD})`,
                severity: 'medium',
                timestamp: event.timestamp || frameIndex,
                frame: frameIndex
            });
        }

        // Signal Visibility Failure Alert
        if (signalDetected) {
            consecutiveFramesWithoutSignal = 0;
        } else {
            consecutiveFramesWithoutSignal += alertSampleRate; // Account for sampling
            if (consecutiveFramesWithoutSignal >= SIGNAL_MISSING_FRAMES) {
                alerts.push({
                    type: 'Signal Visibility Failure',
                    message: `Traffic signal not detected for ${consecutiveFramesWithoutSignal} consecutive frames`,
                    severity: 'medium',
                    timestamp: event.timestamp || frameIndex,
                    frame: frameIndex
                });
                consecutiveFramesWithoutSignal = 0; // Reset after alert
            }
        }

        // Sudden Traffic Spike Alert
        if (frameIndex >= alertSampleRate) {
            const vehicleIncrease = vehicleCount - previousVehicleCount;
            if (vehicleIncrease > SPIKE_THRESHOLD) {
                alerts.push({
                    type: 'Sudden Traffic Spike',
                    message: `Vehicle count increased by ${vehicleIncrease} in frame ${frameIndex}`,
                    severity: 'high',
                    timestamp: event.timestamp || frameIndex,
                    frame: frameIndex
                });
            }
        }

        previousVehicleCount = vehicleCount;
    }

    // Sort by severity and timestamp
    alerts.sort((a, b) => {
        if (a.severity === 'high' && b.severity !== 'high') return -1;
        if (a.severity !== 'high' && b.severity === 'high') return 1;
        return b.timestamp - a.timestamp;
    });

    return alerts.slice(0, 20); // Return top 20 alerts
}

/**
 * Calculate performance metrics
 */
function calculatePerformanceMetrics(detectionEvents) {
    if (!detectionEvents || detectionEvents.length === 0) {
        return {
            avgLatency: 0,
            minLatency: 0,
            maxLatency: 0,
            fps: 0,
            detectionThroughput: 0,
            latencyTrend: []
        };
    }

    const inferenceTimes = [];
    detectionEvents.forEach(event => {
        if (event.inferenceTimeMs && event.inferenceTimeMs > 0) {
            inferenceTimes.push(event.inferenceTimeMs);
        }
    });

    const totalDuration = (detectionEvents[detectionEvents.length - 1].timestamp || 0) - (detectionEvents[0].timestamp || 0);
    const fps = totalDuration > 0 ? detectionEvents.length / totalDuration : 0;
    const detectionThroughput = totalDuration > 0
        ? Math.round((detectionEvents.length / totalDuration) * 60)
        : 0; // detections per minute

    const avgLatency = inferenceTimes.length > 0
        ? Math.round((inferenceTimes.reduce((a, b) => a + b, 0) / inferenceTimes.length) * 10) / 10
        : 0;

    const minLatency = inferenceTimes.length > 0 ? Math.min(...inferenceTimes) : 0;
    const maxLatency = inferenceTimes.length > 0 ? Math.max(...inferenceTimes) : 0;

    // Latency trend (sample every 10th frame)
    const latencyTrend = [];
    for (let i = 0; i < detectionEvents.length; i += 10) {
        const event = detectionEvents[i];
        if (event && event.inferenceTimeMs && event.inferenceTimeMs > 0) {
            latencyTrend.push({
                frame: i,
                timestamp: event.timestamp || i,
                latency: event.inferenceTimeMs
            });
        }
    }

    return {
        avgLatency,
        minLatency,
        maxLatency,
        fps: Math.round(fps * 10) / 10,
        detectionThroughput,
        latencyTrend: latencyTrend.slice(0, 50)
    };
}

/**
 * Main detection-based analytics computation
 * Optimized for speed with early returns and efficient processing
 */
function computeDetectionAnalytics(detectionEvents) {
    try {
        if (!detectionEvents || !Array.isArray(detectionEvents) || detectionEvents.length === 0) {
            return {
                sceneOverview: calculateSceneOverview([]),
                sceneDensity: calculateSceneDensity([]),
                objectDistribution: [],
                temporalTrends: [],
                confidenceAnalytics: calculateConfidenceAnalytics([]),
                alerts: [],
                performanceMetrics: calculatePerformanceMetrics([])
            };
        }

        // Limit events to prevent timeout (safety check - already sampled in app.js)
        const MAX_EVENTS = 300; // Match app.js limit - very aggressive
        const eventsToProcess = detectionEvents.length > MAX_EVENTS
            ? detectionEvents.slice(0, MAX_EVENTS)
            : detectionEvents;

        console.log(`⚡ Computing analytics for ${eventsToProcess.length} events...`);
        const startTime = Date.now();

        // Compute all analytics in parallel where possible
        const sceneOverview = calculateSceneOverview(eventsToProcess);
        const sceneDensity = calculateSceneDensity(eventsToProcess);
        const objectDistribution = calculateObjectDistribution(eventsToProcess);
        const temporalTrends = calculateTemporalTrends(eventsToProcess, 60); // 1 minute windows
        const confidenceAnalytics = calculateConfidenceAnalytics(eventsToProcess);
        const alerts = generateDetectionAlerts(eventsToProcess);
        const performanceMetrics = calculatePerformanceMetrics(eventsToProcess);

        // Add most common vehicle type to sceneOverview
        const mostCommonVehicle = objectDistribution && objectDistribution.length > 0
            ? objectDistribution[0]
            : null;
        if (mostCommonVehicle) {
            sceneOverview.mostCommonVehicleType = mostCommonVehicle.name;
            sceneOverview.mostCommonVehicleCount = mostCommonVehicle.value;
            sceneOverview.mostCommonVehiclePercentage = mostCommonVehicle.percentage;
        }

        const computationTime = Date.now() - startTime;
        console.log(`✅ Analytics computed in ${computationTime}ms`);

        return {
            sceneOverview,
            sceneDensity,
            objectDistribution,
            temporalTrends,
            confidenceAnalytics,
            alerts,
            performanceMetrics
        };
    } catch (err) {
        console.error('❌ Error computing detection analytics:', err);
        return {
            sceneOverview: calculateSceneOverview([]),
            sceneDensity: calculateSceneDensity([]),
            objectDistribution: [],
            temporalTrends: [],
            confidenceAnalytics: calculateConfidenceAnalytics([]),
            alerts: [],
            performanceMetrics: calculatePerformanceMetrics([])
        };
    }
}

module.exports = {
    computeDetectionAnalytics,
    calculateSceneOverview,
    calculateSceneDensity,
    calculateObjectDistribution,
    calculateTemporalTrends,
    calculateConfidenceAnalytics,
    generateDetectionAlerts,
    calculatePerformanceMetrics
};

const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
    filename: String,
    mimetype: String,
    size: Number,
    data: Buffer, // Stores input file as binary data (for small images only)
    processedData: Buffer, // Stores processed file as binary data (for small images only)
    // Cloudinary fields
    cloudinaryId: String,
    cloudinaryUrl: String,
    processedCloudinaryId: String,
    processedCloudinaryUrl: String,
    uploadDate: { type: Date, default: Date.now },
    // Service type/solution type
    serviceType: { type: String, default: 'traffic-monitoring' },
    // Detection events for analytics
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    detectionEvents: [{
        frameId: Number,
        timestamp: Number, // Frame timestamp in seconds
        detectedObjects: [{
            class: String,
            confidence: Number,
            bbox: {
                x1: Number,
                y1: Number,
                x2: Number,
                y2: Number
            }
        }],
        inferenceTimeMs: Number,
        objectCounts: mongoose.Schema.Types.Mixed // { "person": 2, "laptop": 1, ... }
    }]
});

// Add a compound index to support filtering by user and sorting by date
// This prevents "Sort exceeded memory limit" errors and improves performance
fileSchema.index({ userId: 1, uploadDate: -1 });

module.exports = mongoose.model("File", fileSchema);
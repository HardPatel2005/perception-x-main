// Quick script to check if .env file is being loaded correctly
// Run: node check_env.js

require('dotenv').config();

console.log("=".repeat(60));
console.log("Node.js Environment Variables Checker");
console.log("=".repeat(60));

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
const api_key = process.env.CLOUDINARY_API_KEY;
const api_secret = process.env.CLOUDINARY_API_SECRET;

console.log("\nChecking Cloudinary Variables:");
console.log("=".repeat(60));
console.log(`CLOUDINARY_CLOUD_NAME: ${cloud_name ? '[OK] ' + cloud_name : '[MISSING] Not set'}`);
console.log(`CLOUDINARY_API_KEY: ${api_key ? '[OK] ' + api_key.substring(0, 10) + '...' : '[MISSING] Not set'}`);
console.log(`CLOUDINARY_API_SECRET: ${api_secret ? '[OK] ' + api_secret.substring(0, 10) + '...' : '[MISSING] Not set'}`);

if (cloud_name && api_key && api_secret) {
    console.log("\n[SUCCESS] All Cloudinary credentials are set!");
    console.log("   Restart your Node.js server to apply changes.");
} else {
    console.log("\n[ERROR] Some Cloudinary credentials are missing!");
    console.log("   Please add them to your .env file:");
    console.log("   CLOUDINARY_CLOUD_NAME=your_cloud_name");
    console.log("   CLOUDINARY_API_KEY=your_api_key");
    console.log("   CLOUDINARY_API_SECRET=your_api_secret");
}

console.log("\n" + "=".repeat(60));
console.log("Other Important Variables:");
console.log("=".repeat(60));
console.log(`MONGO_URI: ${process.env.MONGO_URI ? '[OK] Set' : '[MISSING] Not set'}`);
console.log(`PYTHON_API_URL: ${process.env.PYTHON_API_URL || process.env.PY_SERVICE_URL || 'Not set (default: http://localhost:8001)'}`);

# Cloudinary Integration Setup

## ✅ Implementation Complete

All video handling has been migrated from MongoDB/GridFS to Cloudinary for better performance and scalability.

## Environment Variables Required

Add these to your `.env` file in `perceptionX-node/`:

```env
# Cloudinary Configuration (REQUIRED for video uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Existing variables
MONGO_URI=your_mongodb_uri
PYTHON_API_URL=http://localhost:8001
PORT=3000
```

Add these to your `.env` file in `perceptionX-python/`:

```env
# Cloudinary Configuration (REQUIRED for video processing)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Existing variables
MONGO_URI=your_mongodb_uri
PORT=8001
```

## How to Get Cloudinary Credentials

1. Sign up at https://cloudinary.com (free tier available)
2. Go to Dashboard → Settings
3. Copy your:
   - Cloud Name
   - API Key
   - API Secret

## How It Works Now

### Video Upload Flow:
1. User uploads video → Node.js receives file
2. Node.js uploads directly to Cloudinary CDN
3. MongoDB stores only metadata (filename, size, Cloudinary URL)
4. Node.js calls Python service with Cloudinary URL
5. Python downloads from Cloudinary (fast CDN)
6. Python processes video with YOLO
7. Python uploads processed video to Cloudinary
8. MongoDB updated with processed Cloudinary URL
9. Frontend streams directly from Cloudinary CDN

### Image Upload Flow (Small Images < 1MB):
1. Still uses MongoDB for speed (no Cloudinary needed)
2. Works exactly as before

## Benefits

✅ **Fast Uploads**: Direct to Cloudinary CDN  
✅ **Fast Processing**: Python downloads from CDN (much faster than GridFS)  
✅ **Fast Playback**: Browser streams from Cloudinary CDN  
✅ **No MongoDB Storage**: Only metadata stored  
✅ **Automatic CDN**: Global content delivery  
✅ **Video Optimization**: Cloudinary can auto-optimize  
✅ **Scalable**: Handles any video size  
✅ **Cost Effective**: Much cheaper than MongoDB storage  

## Testing

1. Make sure both services have Cloudinary credentials in `.env`
2. Restart both Node.js and Python services
3. Upload a video - it should upload to Cloudinary
4. Check Python service logs - should show Cloudinary download
5. After processing, video should stream from Cloudinary CDN

## Troubleshooting

- **"Cloudinary not configured"**: Check `.env` file has all 3 Cloudinary variables
- **Upload fails**: Check Cloudinary credentials are correct
- **Video blank**: Check browser console for errors, verify Cloudinary URL is accessible
- **Processing fails**: Check Python service logs for Cloudinary download errors

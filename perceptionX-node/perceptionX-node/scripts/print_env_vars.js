// Quick helper to print env vars used by app
try { require('dotenv').config(); } catch(e){}
console.log('PYTHON_API_URL=', process.env.PYTHON_API_URL);
console.log('FORCE_CLOUDINARY=', process.env.FORCE_CLOUDINARY);
console.log('CLOUDINARY_CLOUD_NAME=', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING');
console.log('MONGO_URI=', process.env.MONGO_URI ? 'SET' : 'MISSING');

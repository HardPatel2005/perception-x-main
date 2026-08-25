
require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Missing MONGO_URI in environment');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function bufferFromDocData(doc) {
  // Try common shapes returned by Mongo/ODM
  if (!doc || typeof doc.data === 'undefined' || doc.data === null) return null;
  const d = doc.data;
  // Buffer (native driver)
  if (Buffer.isBuffer(d)) return d;
  // BSON Binary / Mongoose Buffer often expose a nested buffer value
  if (d.buffer) {
    if (Buffer.isBuffer(d.buffer)) return d.buffer;
    if (ArrayBuffer.isView(d.buffer)) return Buffer.from(d.buffer.buffer, d.buffer.byteOffset, d.buffer.byteLength);
    if (d.buffer instanceof ArrayBuffer) return Buffer.from(d.buffer);
    try {
      return Buffer.from(d.buffer);
    } catch (err) {
      // fall through to other shapes
    }
  }
  // BSON JSON export shape: { $binary: { base64: '...', subType: '00' } }
  if (d.$binary && d.$binary.base64) return Buffer.from(d.$binary.base64, 'base64');
  // Mongoose/JSON shape: { type: 'Buffer', data: [..] }
  if (d.type === 'Buffer' && Array.isArray(d.data)) return Buffer.from(d.data);
  return null;
}

async function uploadFile(tmpPath, isVideo, sizeBytes) {
  const resource_type = isVideo ? 'video' : 'image';
  const LARGE_THRESHOLD = 100 * 1024 * 1024; // 100MB
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (sizeBytes > LARGE_THRESHOLD && resource_type === 'video' && cloudinary.uploader.upload_large) {
        return await cloudinary.uploader.upload_large(tmpPath, { resource_type, folder: 'perceptionx/originals' });
      }
      return await cloudinary.uploader.upload(tmpPath, { resource_type, folder: 'perceptionx/originals' });
    } catch (err) {
      const retryable = err && (err.http_code === 499 || err.http_code === 408 || err.name === 'TimeoutError');
      if (!retryable || attempt === maxAttempts) {
        throw err;
      }
      const waitMs = attempt * 1000;
      console.warn(`Upload attempt ${attempt} failed for ${path.basename(tmpPath)}; retrying in ${waitMs}ms (${err.http_code || err.name || 'unknown error'})`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const collection = mongoose.connection.collection('files');

  // Find documents missing cloudinaryUrl but having data
  const cursor = collection.find({
    $or: [{ cloudinaryUrl: null }, { cloudinaryUrl: '' }],
    data: { $exists: true, $ne: null },
  });
  let count = 0;
  for await (const doc of cursor) {
    try {
      const id = doc._id;
      const buffer = await bufferFromDocData(doc);
      if (!buffer) {
        console.log(id, '-> no buffer, skipping (data shape not recognized)');
        continue;
      }

      const mimetype = doc.mimetype || '';
      const isVideo = mimetype.startsWith('video/');
      const ext = isVideo ? '.mp4' : (path.extname(doc.filename || '') || '.jpg');
      const tmpPath = path.join(os.tmpdir(), `upload_${id}${ext}`);

      await fs.writeFile(tmpPath, buffer);
      const stats = await fs.stat(tmpPath);

      console.log(`Uploading ${id} (${(stats.size/1024).toFixed(1)} KB) as ${isVideo ? 'video' : 'image'}`);
      const res = await uploadFile(tmpPath, isVideo, stats.size);

      if (res && (res.secure_url || res.url)) {
        const update = {
          cloudinaryId: res.public_id,
          cloudinaryUrl: res.secure_url || res.url,
        };
        await collection.updateOne({ _id: id }, { $set: update });
        console.log(id, '-> uploaded:', update.cloudinaryUrl);
        count++;
      } else {
        console.warn(id, '-> upload returned unexpected result', res && Object.keys(res));
      }

      // cleanup
      try { await fs.unlink(tmpPath); } catch(e){/* ignore */}
    } catch (err) {
      console.error('Error processing doc', doc._id, err && err.stack ? err.stack : (err.message || err));
    }
  }

  console.log(`Done. Uploaded ${count} documents.`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });

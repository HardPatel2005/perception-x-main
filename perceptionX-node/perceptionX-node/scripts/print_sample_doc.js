require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      console.error('Missing MONGO_URI in environment');
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const collection = mongoose.connection.collection('files');
    const doc = await collection.findOne({});
    if (!doc) {
      console.log('No document found in `files` collection');
    } else {
      console.log('Sample document from `files` collection:');
      console.log(JSON.stringify(doc, null, 2));
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
    process.exit(1);
  }
})();

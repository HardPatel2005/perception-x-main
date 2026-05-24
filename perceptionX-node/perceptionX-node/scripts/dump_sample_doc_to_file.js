require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs').promises;

(async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      await fs.writeFile('scripts/sample_doc_output.json', JSON.stringify({ error: 'Missing MONGO_URI' }, null, 2), 'utf8');
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    const collection = mongoose.connection.collection('files');
    const doc = await collection.findOne({});
    if (!doc) {
      await fs.writeFile('scripts/sample_doc_output.json', JSON.stringify({ message: 'No document found in files collection' }, null, 2), 'utf8');
    } else {
      // remove large binary content before writing
      const safe = Object.assign({}, doc);
      try { delete safe.data; } catch(e){}
      try { delete safe.processedData; } catch(e){}
      await fs.writeFile('scripts/sample_doc_output.json', JSON.stringify(safe, null, 2), 'utf8');
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    await fs.writeFile('scripts/sample_doc_output.json', JSON.stringify({ error: err && err.message ? err.message : String(err), stack: err && err.stack }, null, 2), 'utf8');
    process.exit(1);
  }
})();

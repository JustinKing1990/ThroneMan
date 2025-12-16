const { MongoClient } = require('mongodb');
const { env } = require('../config');

async function restoreCollection(sourceArchive, targetCollection) {
  const client = new MongoClient(env.mongoUri);
  await client.connect();
  const db = client.db('Throneman');
  try {
    const archive = db.collection(sourceArchive);
    const target = db.collection(targetCollection);

    const docs = await archive.find({}).toArray();
    if (!docs.length) {
      console.log(`No documents in ${sourceArchive}. Nothing to restore.`);
      return;
    }

    let restored = 0;
    for (const doc of docs) {
      const {_id, ...rest} = doc; // remove immutable _id
      const res = await target.updateOne(
        { userId: doc.userId },
        { $set: rest },
        { upsert: true }
      );
      await archive.deleteOne({ _id });
      restored++;
    }
    console.log(`Restored ${restored} docs from ${sourceArchive} to ${targetCollection}.`);
    console.log(`Restored ${docs.length} docs from ${sourceArchive} to ${targetCollection}.`);
  } finally {
    await client.close();
  }
}

module.exports = { restoreCollection };

async function restoreUserDocs(userId) {
  const client = new MongoClient(env.mongoUri);
  await client.connect();
  const db = client.db('Throneman');
  try {
    const pairs = [
      { archive: 'characterArchive', target: 'characters' },
      { archive: 'importantCharacterArchive', target: 'importantCharacters' },
      { archive: 'loreArchive', target: 'lore' },
    ];
    let restoredTotal = 0;
    for (const { archive, target } of pairs) {
      const arch = db.collection(archive);
      const tgt = db.collection(target);
      const docs = await arch.find({ userId }).toArray();
      for (const doc of docs) {
        const { _id, ...rest } = doc;
        await tgt.updateOne({ userId: doc.userId, name: doc.name }, { $set: rest }, { upsert: true });
        await arch.deleteOne({ _id });
        restoredTotal++;
      }
    }
    return restoredTotal;
  } finally {
    await client.close();
  }
}

module.exports.restoreUserDocs = restoreUserDocs;

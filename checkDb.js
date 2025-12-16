const { MongoClient } = require('mongodb');
const { env } = require('./config');

const mongoUrl = env.mongoUri;
const dbName = 'Throneman';

async function checkDb() {
  const client = new MongoClient(mongoUrl);
  try {
    await client.connect();
    const db = client.db(dbName);
    
    const charCount = await db.collection('characters').countDocuments();
    const archiveCount = await db.collection('characterArchive').countDocuments();
    const importantCount = await db.collection('importantCharacters').countDocuments();
    const importantArchiveCount = await db.collection('importantCharacterArchive').countDocuments();
    
    console.log(`Characters: ${charCount}`);
    console.log(`Character Archive: ${archiveCount}`);
    console.log(`Important Characters: ${importantCount}`);
    console.log(`Important Character Archive: ${importantArchiveCount}`);
    
    // Show what's in archive
    if (archiveCount > 0) {
      const archived = await db.collection('characterArchive').find({}).limit(3).toArray();
      console.log('\nSample archived characters:');
      archived.forEach(char => console.log(`  - ${char.name} (${char.userId})`));
    }
    
  } finally {
    await client.close();
  }
}

checkDb().catch(err => console.error('Error:', err.message));

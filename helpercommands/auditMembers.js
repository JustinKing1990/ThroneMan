const { getDb } = require('../mongoClient');
const { env } = require('../config');

async function archiveUnmatchedMembers(client) {
  const db = getDb();
  const guildId = env.guildId || process.env.DISCORD_GUILD_ID;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    console.warn(`Guild ${guildId} not found; skipping member audit.`);
    return { charactersArchived: 0, importantArchived: 0 };
  }

  const collections = [
    { source: 'characters', archive: 'characterArchive' },
    { source: 'importantCharacters', archive: 'importantCharacterArchive' },
  ];

  let charactersArchived = 0;
  let importantArchived = 0;

  for (const { source, archive } of collections) {
    const sourceCol = db.collection(source);
    const archiveCol = db.collection(archive);
    const docs = await sourceCol.find({}).project({ userId: 1, name: 1 }).toArray();
    for (const doc of docs) {
      try {
        await guild.members.fetch(doc.userId);
      } catch {
        await archiveCol.updateOne(
          { userId: doc.userId },
          { $set: doc },
          { upsert: true }
        );
        await sourceCol.deleteOne({ userId: doc.userId });
        if (source === 'characters') charactersArchived++;
        if (source === 'importantCharacters') importantArchived++;
      }
    }
  }

  return { charactersArchived, importantArchived };
}

module.exports = { archiveUnmatchedMembers };

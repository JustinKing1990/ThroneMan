const { getDb } = require('../mongoClient');
const updateListMessage = require('../helpercommands/updateListMessage');
const { readAppConfig } = require('../config');

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  async execute(member) {
    try {
      const db = getDb();
      const userId = member.id;

      const collections = [
        { source: 'characters', archive: 'characterArchive', actionType: 'Character' },
        { source: 'importantCharacters', archive: 'importantCharacterArchive', actionType: 'ImportantCharacter' },
      ];

      let totalArchived = 0;

      for (const { source, archive } of collections) {
        const sourceCol = db.collection(source);
        const archiveCol = db.collection(archive);

        const docs = await sourceCol.find({ userId }).toArray();
        
        for (const doc of docs) {
          await archiveCol.updateOne(
            { userId: doc.userId },
            { $set: doc },
            { upsert: true }
          );
          await sourceCol.deleteOne({ userId: doc.userId });
          totalArchived++;
        }
      }

      if (totalArchived > 0) {
        console.log(`Archived ${totalArchived} entries for user ${userId} who left the server.`);

        // Update list messages after archiving
        try {
          const config = readAppConfig();
          const settingsCollection = db.collection('settings');

          await Promise.all([
            updateListMessage(
              member.client,
              null,
              db.collection('characters'),
              settingsCollection,
              config.allCharacterChannelId,
              config.allCharactersMessageId,
              'Character',
            ),
            updateListMessage(
              member.client,
              null,
              db.collection('importantCharacters'),
              settingsCollection,
              config.allImportantCharacterChannelId,
              config.allImportantCharacterMessage,
              'ImportantCharacter',
            ),
          ]);
        } catch (updateErr) {
          console.error('Failed to update list messages after archiving on leave:', updateErr);
        }
      }
    } catch (e) {
      console.error(`Archive on leave failed for ${member.id}:`, e.message);
    }
  },
};

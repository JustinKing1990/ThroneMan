const { restoreUserDocs } = require('../helpercommands/restoreFromArchive');
const { getDb } = require('../mongoClient');
const updateListMessage = require('../helpercommands/updateListMessage');
const { readAppConfig } = require('../config');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member) {
    try {
      const restored = await restoreUserDocs(member.id);
      if (restored > 0) {
        console.log(`Restored ${restored} archived docs for user ${member.id} on join.`);

        // Update list messages after restoration
        try {
          const config = readAppConfig();
          const db = getDb();
          const settingsCollection = db.collection('settings');

          // Update all relevant lists
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
            updateListMessage(
              member.client,
              null,
              db.collection('lore'),
              settingsCollection,
              config.loreChannelId,
              config.loreMessageId,
              'Lore',
            ),
          ]);
        } catch (updateErr) {
          console.error('Failed to update list messages after restore on join:', updateErr);
        }
      }
    } catch (e) {
      console.warn(`Restore on join failed for ${member.id}:`, e.message);
    }
  },
};

const { getDb } = require('../mongoClient');
const updateListMessage = require('../helpercommands/updateListMessage');
const { readAppConfig } = require('../config');

const archiveMapping = {
  characterArchive: {
    target: 'characters',
    label: 'Character',
    actionType: 'Character',
    configKeys: { channelId: 'allCharacterChannelId', messageId: 'allCharactersMessageId' },
  },
  importantCharacterArchive: {
    target: 'importantCharacters',
    label: 'Important Character',
    actionType: 'ImportantCharacter',
    configKeys: {
      channelId: 'allImportantCharacterChannelId',
      messageId: 'allImportantCharacterMessage',
    },
  },
  loreArchive: {
    target: 'lore',
    label: 'Lore',
    actionType: 'Lore',
    configKeys: { channelId: 'loreChannelId', messageId: 'loreMessageId' },
  },
};

module.exports = {
  name: 'restoreSelection',
  async execute(interaction) {
    // Custom ID format: restore_<archiveName>
    const archiveName = interaction.customId.split('_')[1];
    const mapping = archiveMapping[archiveName];
    const selectedIds = interaction.values;

    const db = getDb();
    const archiveCol = db.collection(archiveName);
    const targetCol = db.collection(mapping.target);

    await interaction.deferReply({ flags: 64 });

    try {
      let restored = 0;
      for (const id of selectedIds) {
        // Find by userId or name depending on archive type
        const query = archiveName === 'loreArchive' ? { name: id } : { userId: id };
        const doc = await archiveCol.findOne(query);

        if (doc) {
          const { _id, ...rest } = doc;
          await targetCol.updateOne(query, { $set: rest }, { upsert: true });
          await archiveCol.deleteOne({ _id });
          restored++;
        }
      }

      await interaction.editReply({
        content: `Successfully restored ${restored} ${mapping.label.toLowerCase()}(s) from archive.`,
      });

      // Update the relevant list message
      try {
        const config = readAppConfig();
        const settingsCollection = db.collection('settings');
        await updateListMessage(
          interaction.client,
          null,
          targetCol,
          settingsCollection,
          config[mapping.configKeys.channelId],
          config[mapping.configKeys.messageId],
          mapping.actionType,
        );
      } catch (updateErr) {
        console.error('Failed to update list message after restore:', updateErr);
      }
    } catch (err) {
      console.error('Restore selection error:', err);
      await interaction.editReply({
        content: 'An error occurred while restoring entries.',
      });
    }
  },
};

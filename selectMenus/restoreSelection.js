const { getDb } = require('../mongoClient');
const updateListMessage = require('../helpercommands/updateListMessage');
const { readAppConfig } = require('../config');

const archiveMapping = {
  characterArchive: {
    target: 'characters',
    label: 'Character',
    actionType: 'Character',
    idField: 'userId',
    configKeys: { channelId: 'allCharacterChannelId', messageId: 'allCharactersMessageId' },
  },
  importantCharacterArchive: {
    target: 'importantCharacters',
    label: 'Important Character',
    actionType: 'ImportantCharacter',
    idField: 'userId',
    configKeys: {
      channelId: 'allImportantCharacterChannelId',
      messageId: 'allImportantCharacterMessage',
    },
  },
  loreArchive: {
    target: 'lore',
    label: 'Lore',
    actionType: 'Lore',
    idField: 'name',
    configKeys: { channelId: 'loreChannelId', messageId: 'loreMessageId' },
  },
  locationArchive: {
    target: 'locations',
    label: 'Location',
    actionType: 'Location',
    idField: 'name',
    configKeys: { channelId: 'locationChannelId', messageId: 'locationMessageId' },
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
        // Find by userId or name depending on archive type's idField
        const query = mapping.idField === 'name' ? { name: id } : { userId: id };
        const doc = await archiveCol.findOne(query);

        if (doc) {
          // Remove archive-specific fields before restoring
          const { _id, archivedAt, archivedBy, ...rest } = doc;
          await targetCol.updateOne({ name: doc.name }, { $set: rest }, { upsert: true });
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

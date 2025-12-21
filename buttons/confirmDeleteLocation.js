/**
 * Confirm location deletion - moves to archive instead of permanent delete
 */
const { getDb } = require('../mongoClient');
const { readAppConfig } = require('../config');

module.exports = async (interaction, _client) => {
  const [_action, ...nameParts] = interaction.customId.split('_');
  const locationName = nameParts.join('_');

  await interaction.deferReply({ flags: [64] });

  try {
    const db = getDb();
    const config = readAppConfig();
    const locationsCollection = db.collection('locations');
    const archiveCollection = db.collection('locationArchive');
    
    const location = await locationsCollection.findOne({
      name: locationName,
    });

    if (!location) {
      await interaction.editReply({ content: '❌ Location not found.' });
      return;
    }

    // Check permission - only staff can delete locations
    const isStaff = interaction.member.permissions.has('KickMembers');
    if (!isStaff) {
      await interaction.editReply({ content: '❌ Only moderators can delete locations.' });
      return;
    }

    // Move to archive instead of deleting
    const { _id, ...locationData } = location;
    await archiveCollection.insertOne({
      ...locationData,
      archivedAt: new Date(),
      archivedBy: interaction.user.id,
    });
    
    // Delete from main collection
    await locationsCollection.deleteOne({ _id: location._id });

    // Update the list message
    const updateListMessage = require('../helpercommands/updateListMessage');
    await updateListMessage(
      interaction.client,
      interaction,
      locationsCollection,
      db.collection('settings'),
      config.locationChannelId,
      config.locationMessageId,
      'Location'
    );

    await interaction.editReply({
      content: `✅ **${locationName}** has been archived. Use /restore to recover it if needed.`,
    });
  } catch (error) {
    console.error('Error archiving location:', error);
    await interaction.editReply({
      content: '❌ An error occurred. Please try again.',
    });
  }
};

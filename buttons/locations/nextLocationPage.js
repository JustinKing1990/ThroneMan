/**
 * Next page for locations list
 */
const { getDb } = require('../../mongoClient');
const updateListMessage = require('../../helpercommands/updateListMessage');
const { readAppConfig } = require('../../config');

module.exports = async (interaction, _client) => {
  const db = getDb();
  const settingsCollection = db.collection('settings');
  const locationsCollection = db.collection('locations');
  const config = readAppConfig();

  const totalLocations = await locationsCollection.countDocuments();
  const totalPages = Math.ceil(totalLocations / 25);
  const settings = await settingsCollection.findOne({ name: 'paginationSettings' });
  const currentPage = settings?.locationCurrentPage || 0;

  if (currentPage < totalPages - 1) {
    await settingsCollection.updateOne(
      { name: 'paginationSettings' },
      { $set: { locationCurrentPage: currentPage + 1 } },
      { upsert: true }
    );
  }

  await updateListMessage(
    interaction.client,
    interaction,
    locationsCollection,
    settingsCollection,
    config.locationChannelId,
    config.locationMessageId,
    'Location'
  );

  await interaction.deferUpdate();
};

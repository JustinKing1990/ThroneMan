/**
 * Finish location without adding more images - but upload any existing base64 images to storage
 */
const { getDb } = require('../../mongoClient');
const { readAppConfig } = require('../../config');
const { uploadImagesToDiscord } = require('../../helpercommands/uploadImagesToDiscord');

module.exports = async (interaction, _client) => {
  const [_action, ...nameParts] = interaction.customId.split('_');
  const locationName = nameParts.join('_');

  await interaction.deferReply({ flags: [64] });

  try {
    const db = getDb();
    const config = readAppConfig();
    const locationsCollection = db.collection('locations');
    
    // Try to find by name from customId, or get most recent for user
    let location;
    if (locationName) {
      location = await locationsCollection.findOne({
        userId: interaction.user.id,
        name: locationName,
      });
    }
    
    if (!location) {
      // Fallback: get most recent location for this user
      location = await locationsCollection
        .findOne({ userId: interaction.user.id }, { sort: { updatedAt: -1 } })
        .catch(() => null);
    }

    if (!location) {
      await interaction.editReply({ content: '❌ Location not found.' });
      return;
    }

    // Upload any base64 images to the proper storage channel
    if (location.imageUrls && location.imageUrls.length > 0) {
      const uploadResult = await uploadImagesToDiscord(location.imageUrls, {
        channelId: '1451795171434823852', // Location images channel
        userId: interaction.user.id,
        contentName: location.name,
        contentType: 'location',
        client: interaction.client,
      });
      
      if (uploadResult.urls.length > 0) {
        await locationsCollection.updateOne(
          { _id: location._id },
          { $set: { imageUrls: uploadResult.urls, imageMessageIds: uploadResult.messageIds } }
        );
      }
    }

    // Update the list message
    const updateListMessage = require('../../helpercommands/updateListMessage');
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
      content: `✅ **${location.name}** has been saved!\n\nYour location is now available in the locations list.`,
    });
  } catch (error) {
    console.error('Error finishing location:', error);
    await interaction.editReply({
      content: '❌ An error occurred. Please try again.',
    });
  }
};

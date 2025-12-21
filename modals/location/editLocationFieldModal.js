/**
 * Handle field edit modal submission for locations
 */
const { getDb } = require('../../mongoClient');
const { readAppConfig } = require('../../config');

module.exports = async (interaction, _client) => {
  const [_modalId, fieldName, ...rest] = interaction.customId.split('_');
  const userId = rest[rest.length - 1];
  const locationName = rest.slice(0, -1).join('_');

  const newValue = interaction.fields.getTextInputValue('fieldValue');

  await interaction.deferReply({ flags: [64] });

  try {
    const db = getDb();
    const config = readAppConfig();

    // Handle name change specially
    if (fieldName === 'name' && newValue !== locationName) {
      // Check if new name already exists
      const existing = await db.collection('locations').findOne({ name: newValue });
      if (existing) {
        await interaction.editReply({
          content: `❌ A location named "${newValue}" already exists.`,
        });
        return;
      }
    }

    await db.collection('locations').updateOne(
      { name: locationName, userId },
      {
        $set: {
          [fieldName]: newValue,
          updatedAt: new Date(),
        },
      }
    );

    // Update list message
    const updateListMessage = require('../../helpercommands/updateListMessage');
    await updateListMessage(
      interaction.client,
      interaction,
      db.collection('locations'),
      db.collection('settings'),
      config.locationChannelId,
      config.locationMessageId,
      'Location'
    );

    await interaction.editReply({
      content: `✅ Updated **${fieldName}** for **${fieldName === 'name' ? newValue : locationName}**!`,
    });
  } catch (error) {
    console.error('Error updating location field:', error);
    await interaction.editReply({
      content: '❌ Failed to update. Please try again.',
    });
  }
};

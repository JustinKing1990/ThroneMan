/**
 * Modal handler for additional location info (crime, geography, laws)
 */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../mongoClient');

module.exports = async (interaction, _client) => {
  const [_modalId, ...nameParts] = interaction.customId.split('_');
  const locationName = nameParts.join('_');

  const crime = interaction.fields.getTextInputValue('crime') || '';
  const geography = interaction.fields.getTextInputValue('geography') || '';
  const laws = interaction.fields.getTextInputValue('laws') || '';

  await interaction.deferReply({ flags: [64] });

  try {
    const db = getDb();
    const locationsCollection = db.collection('locations');

    // Update location data
    await locationsCollection.updateOne(
      { userId: interaction.user.id, name: locationName },
      {
        $set: {
          crime,
          geography,
          laws,
          updatedAt: new Date(),
        },
      }
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`locationCreationFinal_${locationName}`)
        .setLabel('Finish & Add Images')
        .setStyle(ButtonStyle.Success),
    );

    await interaction.editReply({
      content: `✅ Additional info saved for **${locationName}**!\n\nReady to finish?`,
      components: [row],
    });
  } catch (error) {
    console.error('Error saving location more info:', error);
    await interaction.editReply({
      content: '❌ Failed to save location data. Please try again.',
    });
  }
};

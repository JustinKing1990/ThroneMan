/**
 * Modal handler for location details (commerce, organizations, description)
 */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../mongoClient');

module.exports = async (interaction, _client) => {
  const [_modalId, ...nameParts] = interaction.customId.split('_');
  const locationName = nameParts.join('_');

  const commerce = interaction.fields.getTextInputValue('commerce') || '';
  const organizations = interaction.fields.getTextInputValue('organizations') || '';
  const description = interaction.fields.getTextInputValue('description') || '';

  await interaction.deferReply({ flags: [64] });

  try {
    const db = getDb();
    const locationsCollection = db.collection('locations');

    // Update location data
    await locationsCollection.updateOne(
      { userId: interaction.user.id, name: locationName },
      {
        $set: {
          commerce,
          organizations,
          description,
          updatedAt: new Date(),
        },
      }
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`locationCreationPart3_${locationName}`)
        .setLabel('Continue - More Details')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`locationCreationFinal_${locationName}`)
        .setLabel('Skip to Images')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.editReply({
      content: `✅ Details saved for **${locationName}**!\n\nWould you like to add crime, geography, and laws?`,
      components: [row],
    });
  } catch (error) {
    console.error('Error saving location details:', error);
    await interaction.editReply({
      content: '❌ Failed to save location data. Please try again.',
    });
  }
};

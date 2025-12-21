/**
 * Modal handler for basic location info
 */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../mongoClient');
const { stripMarkdown } = require('../../helpercommands/validateSchema');

module.exports = async (interaction, _client) => {
  // Strip markdown from name (e.g., from docx imports with headers)
  const name = stripMarkdown(interaction.fields.getTextInputValue('name'));
  const population = interaction.fields.getTextInputValue('population') || '';
  const government = interaction.fields.getTextInputValue('government') || '';
  const defense = interaction.fields.getTextInputValue('defense') || '';

  await interaction.deferReply({ flags: [64] });

  try {
    const db = getDb();
    const locationsCollection = db.collection('locations');

    // Save/update location data
    await locationsCollection.updateOne(
      { userId: interaction.user.id, name },
      {
        $set: {
          name,
          population,
          government,
          defense,
          userId: interaction.user.id,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`locationCreationPart2_${name}`)
        .setLabel('Continue - Add Details')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`locationCreationFinal_${name}`)
        .setLabel('Skip to Images')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.editReply({
      content: `✅ Basic info saved for **${name}**!\n\nWould you like to add more details?`,
      components: [row],
    });
  } catch (error) {
    console.error('Error saving location basic info:', error);
    await interaction.editReply({
      content: '❌ Failed to save location data. Please try again.',
    });
  }
};

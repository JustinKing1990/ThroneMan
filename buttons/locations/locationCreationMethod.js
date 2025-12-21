/**
 * Initial button to start location creation - choose method
 */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = async (interaction, _client) => {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('locationCreationManual')
      .setLabel('Manual Entry')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('locationCreationFileUpload')
      .setLabel('File Upload')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({
    content: '🏰 **Create New Location**\n\nHow would you like to enter your location data?',
    components: [row],
    flags: [64],
  });
};

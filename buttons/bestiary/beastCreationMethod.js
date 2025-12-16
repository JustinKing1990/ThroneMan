/**
 * Shows the user a choice between manual entry or file upload for beast creation
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = async (interaction, _client) => {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Beast Creation Method')
    .setDescription('How would you like to create your beast?')
    .addFields(
      {
        name: '📝 Manual Entry',
        value: 'Fill out the beast creation form step by step',
        inline: true,
      },
      {
        name: '📁 File Upload',
        value: 'Upload a JSON, DOCX, TXT, or PDF file with all beast data',
        inline: true,
      },
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('beastCreationManual')
      .setLabel('Manual Entry')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝'),
    new ButtonBuilder()
      .setCustomId('beastCreationFileUpload')
      .setLabel('File Upload')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📁'),
  );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    flags: [64],
  });
};

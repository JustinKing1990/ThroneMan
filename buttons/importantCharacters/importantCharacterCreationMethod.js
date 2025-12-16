/**
 * Shows the user a choice between manual entry or file upload for important character creation
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = async (interaction, _client) => {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Important Character Creation Method')
    .setDescription('How would you like to create your character?')
    .addFields(
      {
        name: '📝 Manual Entry',
        value: 'Fill out the character creation form step by step',
        inline: true,
      },
      {
        name: '📁 File Upload',
        value: 'Upload a JSON, DOCX, TXT, or PDF file with all character data',
        inline: true,
      },
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('importantCharacterCreationManual')
      .setLabel('Manual Entry')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝'),
    new ButtonBuilder()
      .setCustomId('importantCharacterCreationFileUpload')
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

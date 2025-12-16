/**
 * Shows the user a choice between manual entry or file upload for lore creation
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = async (interaction, _client) => {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Lore Creation Method')
    .setDescription('How would you like to create your lore entry?')
    .addFields(
      {
        name: '📝 Manual Entry',
        value: 'Fill out the lore creation form step by step',
        inline: true,
      },
      {
        name: '📁 File Upload',
        value: 'Upload a JSON, DOCX, TXT, or PDF file with lore data',
        inline: true,
      },
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('loreCreationManual')
      .setLabel('Manual Entry')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝'),
    new ButtonBuilder()
      .setCustomId('loreCreationFileUpload')
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

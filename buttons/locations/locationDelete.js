/**
 * Delete a location
 */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = async (interaction, _client) => {
  const [_action, ...nameParts] = interaction.customId.split('_');
  const locationName = nameParts.join('_');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`confirmDeleteLocation_${locationName}`)
      .setLabel('Yes, Delete')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('cancelDelete')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({
    content: `⚠️ Are you sure you want to delete **${locationName}**? This cannot be undone.`,
    components: [row],
    flags: [64],
  });
};

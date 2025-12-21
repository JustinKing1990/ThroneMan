/**
 * Continue location entry - Part 2 modal (commerce, organizations, description)
 */
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');

module.exports = async (interaction, _client) => {
  const [_action, ...nameParts] = interaction.customId.split('_');
  const locationName = nameParts.join('_');

  const modal = new ModalBuilder()
    .setCustomId(`locationDetailsModal_${locationName}`)
    .setTitle('Location - Details');

  const commerceInput = new TextInputBuilder()
    .setCustomId('commerce')
    .setLabel('Commerce')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder('Trade, shops, economy...');

  const organizationsInput = new TextInputBuilder()
    .setCustomId('organizations')
    .setLabel('Organizations')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder('Guilds, temples, factions...');

  const descriptionInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder('General description of the location...');

  modal.addComponents(
    new ActionRowBuilder().addComponents(commerceInput),
    new ActionRowBuilder().addComponents(organizationsInput),
    new ActionRowBuilder().addComponents(descriptionInput),
  );

  await interaction.showModal(modal);
};

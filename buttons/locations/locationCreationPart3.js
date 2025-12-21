/**
 * Continue location entry - Part 3 modal (crime, geography, laws)
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
    .setCustomId(`locationMoreModal_${locationName}`)
    .setTitle('Location - Additional Info');

  const crimeInput = new TextInputBuilder()
    .setCustomId('crime')
    .setLabel('Crime')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder('Criminal elements, underworld...');

  const geographyInput = new TextInputBuilder()
    .setCustomId('geography')
    .setLabel('Geography')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder('Terrain, climate, surroundings...');

  const lawsInput = new TextInputBuilder()
    .setCustomId('laws')
    .setLabel('Laws')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder('Rules, restrictions, customs...');

  modal.addComponents(
    new ActionRowBuilder().addComponents(crimeInput),
    new ActionRowBuilder().addComponents(geographyInput),
    new ActionRowBuilder().addComponents(lawsInput),
  );

  await interaction.showModal(modal);
};

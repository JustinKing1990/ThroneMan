/**
 * Start manual location entry - show first modal
 */
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');

module.exports = async (interaction, _client) => {
  const modal = new ModalBuilder()
    .setCustomId('locationBasicInfo')
    .setTitle('Location - Basic Info');

  const nameInput = new TextInputBuilder()
    .setCustomId('name')
    .setLabel('Location Name (Required)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const populationInput = new TextInputBuilder()
    .setCustomId('population')
    .setLabel('Population')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(200)
    .setPlaceholder('e.g., 5000 (65% humans, 20% elves, 15% other)');

  const governmentInput = new TextInputBuilder()
    .setCustomId('government')
    .setLabel('Government')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder('Who rules this place and how?');

  const defenseInput = new TextInputBuilder()
    .setCustomId('defense')
    .setLabel('Defense')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder('Military, guards, walls, etc.');

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(populationInput),
    new ActionRowBuilder().addComponents(governmentInput),
    new ActionRowBuilder().addComponents(defenseInput),
  );

  await interaction.showModal(modal);
};

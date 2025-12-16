const {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
} = require('discord.js');

module.exports = async (interaction, _client) => {
  const modal = new ModalBuilder()
    .setCustomId('loreCreationModalPart1')
    .setTitle('Lore Creation');

  const loreNameInput = new TextInputBuilder()
    .setCustomId('lore_name')
    .setLabel("What's your lore's name?")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const loreDataInput = new TextInputBuilder()
    .setCustomId('lore_data')
    .setLabel('Input your Lore')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const nameRow = new ActionRowBuilder().addComponents(loreNameInput);
  const dataRow = new ActionRowBuilder().addComponents(loreDataInput);

  modal.addComponents(nameRow, dataRow);

  await interaction.showModal(modal);
};

const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');

module.exports = async (interaction, _client) => {
  const [_action, loreName] = interaction.customId.split('_');
  const modal = new ModalBuilder()
    .setCustomId(`loreCreationModalAdditional_${loreName}`)
    .setTitle('Lore Creation - More Information');

  const loreAdditionalBackstory = new TextInputBuilder()
    .setCustomId('lore_additional')
    .setLabel('Continue with the lore')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const additionalBackstoryRow = new ActionRowBuilder().addComponents(loreAdditionalBackstory);

  modal.addComponents(additionalBackstoryRow);

  await interaction.showModal(modal);
};

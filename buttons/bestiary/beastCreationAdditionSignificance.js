const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');

module.exports = async (interaction, _client) => {
  const [_action, beastName] = interaction.customId.split('_');
  const modal = new ModalBuilder()
    .setCustomId(`beastCreationModalAdditionalSignificance_${beastName}`)
    .setTitle('Beast Creation - More Significance');

  const beastAdditionalSignificance = new TextInputBuilder()
    .setCustomId('beast_additional_significance')
    .setLabel('Continue with the significance')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const additionalSignificanceRow = new ActionRowBuilder().addComponents(
    beastAdditionalSignificance,
  );

  modal.addComponents(additionalSignificanceRow);

  await interaction.showModal(modal);
};

const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');

module.exports = async (interaction, _client) => {
  const [_action, characterName] = interaction.customId.split('_');
  const modal = new ModalBuilder()
    .setCustomId(`characterCreationModalAdditionalBackstory_${characterName}`)
    .setTitle('Character Creation - More Backstory');

  const characterAdditionalBackstory = new TextInputBuilder()
    .setCustomId('character_additional_backstory')
    .setLabel('Continue with the backstory')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const additionalBackstoryRow = new ActionRowBuilder().addComponents(characterAdditionalBackstory);

  modal.addComponents(additionalBackstoryRow);

  await interaction.showModal(modal);
};

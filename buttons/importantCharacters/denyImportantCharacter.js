const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');

module.exports = async (interaction, _client) => {
  // Extract userId and characterName from button customId
  const [_action, userId, characterName] = interaction.customId.split('_');

  const modal = new ModalBuilder()
    .setCustomId(`importantCharacterDenialModal_${userId}_${characterName}`)
    .setTitle('Character Denial - Additional Details');

  const characterDenialInput = new TextInputBuilder()
    .setCustomId('character_denial')
    .setLabel('Why is this denied, be descriptive')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const denyRow = new ActionRowBuilder().addComponents(characterDenialInput);

  modal.addComponents(denyRow);

  await interaction.showModal(modal);
};

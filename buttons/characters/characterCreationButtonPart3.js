const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');

module.exports = async (interaction, _client) => {
  const [_action, characterName] = interaction.customId.split('_');
  const modal = new ModalBuilder()
    .setCustomId(`characterCreationModalPart3_${characterName}`)
    .setTitle('Character Creation - Additional Details');

  const characterWeaponsInput = new TextInputBuilder()
    .setCustomId('character_weapons')
    .setLabel('What weapons does your character wield?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  const characterArmorInput = new TextInputBuilder()
    .setCustomId('character_armor')
    .setLabel("Describe your character's armor")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  const characterBeliefsInput = new TextInputBuilder()
    .setCustomId('character_beliefs')
    .setLabel("What are your character's beliefs?")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  const characterPowersInput = new TextInputBuilder()
    .setCustomId('character_powers')
    .setLabel('What powers does your character have?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const characterBackstoryInput = new TextInputBuilder()
    .setCustomId('character_backstory')
    .setLabel("Share your character's backstory")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const weaponsRow = new ActionRowBuilder().addComponents(characterWeaponsInput);
  const armorRow = new ActionRowBuilder().addComponents(characterArmorInput);
  const beliefsRow = new ActionRowBuilder().addComponents(characterBeliefsInput);
  const powersRow = new ActionRowBuilder().addComponents(characterPowersInput);
  const backstoryRow = new ActionRowBuilder().addComponents(characterBackstoryInput);

  modal.addComponents(weaponsRow, armorRow, beliefsRow, powersRow, backstoryRow);

  await interaction.showModal(modal);
};

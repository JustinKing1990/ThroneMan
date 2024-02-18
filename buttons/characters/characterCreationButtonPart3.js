const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');

module.exports = async (interaction, client) => {
    const [action, characterName] = interaction.customId.split('_')
    const modal = new ModalBuilder()
        .setCustomId(`characterCreationModalPart3_${characterName}`)
        .setTitle('Character Creation - Additional Details');

    // Continuing from previous fields...
    
    // Weapons
    const characterWeaponsInput = new TextInputBuilder()
        .setCustomId('character_weapons')
        .setLabel("What weapons does your character wield?")
        .setStyle(TextInputStyle.Paragraph) // For longer text
        .setRequired(false);

    // Armor
    const characterArmorInput = new TextInputBuilder()
        .setCustomId('character_armor')
        .setLabel("Describe your character's armor")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    // Beliefs
    const characterBeliefsInput = new TextInputBuilder()
        .setCustomId('character_beliefs')
        .setLabel("What are your character's beliefs?")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    // Powers
    const characterPowersInput = new TextInputBuilder()
        .setCustomId('character_powers')
        .setLabel("What powers does your character have?")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    // Backstory
    const characterBackstoryInput = new TextInputBuilder()
        .setCustomId('character_backstory')
        .setLabel("Share your character's backstory")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    // Creating an ActionRowBuilder for each new input
    const weaponsRow = new ActionRowBuilder().addComponents(characterWeaponsInput);
    const armorRow = new ActionRowBuilder().addComponents(characterArmorInput);
    const beliefsRow = new ActionRowBuilder().addComponents(characterBeliefsInput);
    const powersRow = new ActionRowBuilder().addComponents(characterPowersInput);
    const backstoryRow = new ActionRowBuilder().addComponents(characterBackstoryInput);

    // Adding all action rows to the modal
    modal.addComponents(weaponsRow, armorRow, beliefsRow, powersRow, backstoryRow);

    // Showing the modal to the user
    await interaction.showModal(modal);
};

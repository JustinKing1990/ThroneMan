const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');

module.exports = async (interaction, client) => {
    // First modal for character name
    const modal = new ModalBuilder()
        .setCustomId('importantCharacterCreationModalPart1')
        .setTitle('Character Creation');

    const characterNameInput = new TextInputBuilder()
        .setCustomId('character_name')
        .setLabel("What's your character's name?")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const characterTitleInput = new TextInputBuilder()
        .setCustomId('character_title')
        .setLabel("What's your character's title(s)?")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)

    const characterGenderInput = new TextInputBuilder()
        .setCustomId('character_gender')
        .setLabel("What's your character's gender?")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)

    const characterAgeInput = new TextInputBuilder()
        .setCustomId('character_age')
        .setLabel("How old is your character?")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)

    const characterBirthplaceInput = new TextInputBuilder()
        .setCustomId('character_birthplace')
        .setLabel("Where is your character from?")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
 
     const nameRow = new ActionRowBuilder().addComponents(characterNameInput);
     const titleRow = new ActionRowBuilder().addComponents(characterTitleInput);
     const genderRow = new ActionRowBuilder().addComponents(characterGenderInput);
     const ageRow = new ActionRowBuilder().addComponents(characterAgeInput);
     const birthplaceRow = new ActionRowBuilder().addComponents(characterBirthplaceInput);
 
     modal.addComponents(nameRow, titleRow, genderRow, ageRow, birthplaceRow);
 
    await interaction.showModal(modal);
};

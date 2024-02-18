const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');

module.exports = async (interaction, client) => {
    const [action, characterName] = interaction.customId.split('_')

    const modal = new ModalBuilder()
        .setCustomId(`importantCharacterCreationModalPart2_${characterName}`)
        .setTitle('Character Creation - More Details');

    
    const characterHeightInput = new TextInputBuilder()
        .setCustomId('character_height')
        .setLabel("What's your character's height?")
        .setStyle(TextInputStyle.Short)
        .setRequired(false); 

    
    const characterSpeciesInput = new TextInputBuilder()
        .setCustomId('character_species')
        .setLabel("What's your character's species?")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    
    const characterEyeColorInput = new TextInputBuilder()
        .setCustomId('character_eyecolor')
        .setLabel("What's your character's eye color?")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    
    const characterHairColorInput = new TextInputBuilder()
        .setCustomId('character_haircolor')
        .setLabel("What's your character's hair color?")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    
    const characterAppearanceInput = new TextInputBuilder()
        .setCustomId('character_appearance')
        .setLabel("Describe your character's appearance")
        .setStyle(TextInputStyle.Paragraph) 
        .setRequired(true);

    
    const heightRow = new ActionRowBuilder().addComponents(characterHeightInput);
    const speciesRow = new ActionRowBuilder().addComponents(characterSpeciesInput);
    const eyeColorRow = new ActionRowBuilder().addComponents(characterEyeColorInput);
    const hairColorRow = new ActionRowBuilder().addComponents(characterHairColorInput);
    const appearanceRow = new ActionRowBuilder().addComponents(characterAppearanceInput);

    
    modal.addComponents(heightRow, speciesRow, eyeColorRow, hairColorRow, appearanceRow);

    
    await interaction.showModal(modal);
};

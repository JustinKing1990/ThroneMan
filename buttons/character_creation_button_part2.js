const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');

module.exports = async (interaction, client) => {
    const modal = new ModalBuilder()
        .setCustomId('characterCreationModalPart2')
        .setTitle('Character Creation - More Details');

    // Height
    const characterHeightInput = new TextInputBuilder()
        .setCustomId('character_height')
        .setLabel("What's your character's height?")
        .setStyle(TextInputStyle.Short)
        .setRequired(false); // Adjust based on your requirement

    // Species
    const characterSpeciesInput = new TextInputBuilder()
        .setCustomId('character_species')
        .setLabel("What's your character's species?")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    // Eye Color
    const characterEyeColorInput = new TextInputBuilder()
        .setCustomId('character_eyecolor')
        .setLabel("What's your character's eye color?")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    // Hair Color
    const characterHairColorInput = new TextInputBuilder()
        .setCustomId('character_haircolor')
        .setLabel("What's your character's hair color?")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    // Appearance
    const characterAppearanceInput = new TextInputBuilder()
        .setCustomId('character_appearance')
        .setLabel("Describe your character's appearance")
        .setStyle(TextInputStyle.Paragraph) // For longer text
        .setRequired(true);

    // Creating an ActionRowBuilder for each input
    const heightRow = new ActionRowBuilder().addComponents(characterHeightInput);
    const speciesRow = new ActionRowBuilder().addComponents(characterSpeciesInput);
    const eyeColorRow = new ActionRowBuilder().addComponents(characterEyeColorInput);
    const hairColorRow = new ActionRowBuilder().addComponents(characterHairColorInput);
    const appearanceRow = new ActionRowBuilder().addComponents(characterAppearanceInput);

    // Adding action rows to modal
    modal.addComponents(heightRow, speciesRow, eyeColorRow, hairColorRow, appearanceRow);

    // Showing the modal to the user
    await interaction.showModal(modal);
};

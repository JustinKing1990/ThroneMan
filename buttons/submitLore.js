const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');

module.exports = async (interaction, client) => {
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
        .setLabel("Input your Lore")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)

 
     // Create an ActionRowBuilder for each input
     const nameRow = new ActionRowBuilder().addComponents(loreNameInput,);
     const dataRow = new ActionRowBuilder().addComponents(loreDataInput);
 
     // Add action rows to modal
     modal.addComponents(nameRow, dataRow);
 
    // Show the modal to the user
    await interaction.showModal(modal);
};

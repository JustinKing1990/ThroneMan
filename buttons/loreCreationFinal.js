const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getDb } = require('../mongoClient');

module.exports = async (interaction, client) => {
    const [action, loreName] = interaction.customId.split('_')
    const yesButton = new ButtonBuilder()
            .setCustomId(`imageLoreAdditionYes_${loreName}`)
            .setLabel('Yes')
            .setStyle(ButtonStyle.Success);

        const noButton = new ButtonBuilder()
            .setCustomId(`imageLoreAdditionNo_${loreName}`)
            .setLabel('No')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(yesButton, noButton);

        await interaction.followUp({
            content: 'Do you have images to add?',
            components: [row],
            ephemeral: true
        });
};
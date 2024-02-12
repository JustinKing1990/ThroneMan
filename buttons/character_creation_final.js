const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getDb } = require('../mongoClient');

module.exports = async (interaction, client) => {
    const yesButton = new ButtonBuilder()
            .setCustomId('image_addition_yes')
            .setLabel('Yes')
            .setStyle(ButtonStyle.Success);

        const noButton = new ButtonBuilder()
            .setCustomId('image_addition_no')
            .setLabel('No')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(yesButton, noButton);

        await interaction.update({
            content: 'Do you have images to add?',
            components: [row],
            ephemeral: true
        });
};
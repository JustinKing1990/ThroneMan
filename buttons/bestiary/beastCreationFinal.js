const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getDb } = require('../../mongoClient');

module.exports = async (interaction, client) => {
    const [action, beastName] = interaction.customId.split('_')
    const yesButton = new ButtonBuilder()
            .setCustomId(`imageBeastAdditionYes_${beastName}`)
            .setLabel('Yes')
            .setStyle(ButtonStyle.Success);

        const noButton = new ButtonBuilder()
            .setCustomId(`imageBeastAdditionNo_${beastName}`)
            .setLabel('No')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(yesButton, noButton);

        await interaction.update({
            content: 'Do you have images to add?',
            components: [row],
            ephemeral: true
        });
};
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');''

module.exports = async (interaction, client) => {
    const [action, beastName] = interaction.customId.split("_")
    
    await interaction.update({
        content: 'Do you have more significance to add?',
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`beastCreationAdditionSignificance_${beastName}`)
                    .setLabel('Yes')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`beastCreationFinal_${beastName}`)
                    .setLabel('No')
                    .setStyle(ButtonStyle.Danger),
            )
        ],
        ephemeral: true
    });
};

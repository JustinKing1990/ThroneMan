const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');''

module.exports = async (interaction, client) => {
    const [action, beastName] = interaction.customId.split("_")
    
    await interaction.reply({
        content: 'Do you have more significance to add?',
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`beastCreationAdditionalSignificance_${beastName}`)
                    .setLabel('Yes')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`beastCreationAdditionalFinal_${beastName}`)
                    .setLabel('No')
                    .setStyle(ButtonStyle.Danger),
            )
        ],
        ephemeral: true
    });
};

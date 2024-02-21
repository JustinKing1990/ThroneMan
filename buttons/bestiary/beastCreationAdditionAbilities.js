const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');

module.exports = async (interaction, client) => {
    const [action, beastName] = interaction.customId.split("_")
    const modal = new ModalBuilder()
        .setCustomId(`beastCreationModalAdditionalAbilities_${beastName}`)
        .setTitle('Beast Creation - More Abilities');

    const beastAdditionalAbilities = new TextInputBuilder()
        .setCustomId('beast_additional_abilities')
        .setLabel("Continue with the abilities")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const additionalAbilitiesRow = new ActionRowBuilder().addComponents(beastAdditionalAbilities);

    modal.addComponents(additionalAbilitiesRow);

    await interaction.showModal(modal);
};

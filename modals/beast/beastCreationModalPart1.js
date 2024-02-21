const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');''
const { getDb } = require('../../mongoClient');

module.exports = async (interaction, client) => {
    const beastName = interaction.fields.getTextInputValue('beast_name');
    const beastHabitat = interaction.fields.getTextInputValue('beast_habitat');
    const beastAppearance = interaction.fields.getTextInputValue('beast_appearance');
    const beastAbilities = [interaction.fields.getTextInputValue('beast_abilities')];
    const beastSignificance = [interaction.fields.getTextInputValue('beast_significance')];

    const db = getDb();
    const beastCollection = db.collection('bestiary');

    try {
        await beastCollection.updateOne(
            {
                name: beastName
            },
            {
                $set: {
                    habitat: beastHabitat,
                    appearance: beastAppearance,
                    abilities: beastAbilities,
                    significance: beastSignificance
                }
            },
            { upsert: true }
        );

        await interaction.reply({
            content: 'Do you have more abilities to add?',
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`beastCreationAdditionalAbilities_${beastName}`)
                        .setLabel('Yes')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`beastCreationAdditionalAbilitiesNo_${beastName}`)
                        .setLabel('No')
                        .setStyle(ButtonStyle.Danger),
                )
            ],
            ephemeral: true
        });

    } catch (error) {
        console.error('Failed to save beast name to MongoDB:', error);
        await interaction.reply({
            content: 'There was an error saving your beast. Please try again later.',
            ephemeral: true
        });
    }
};

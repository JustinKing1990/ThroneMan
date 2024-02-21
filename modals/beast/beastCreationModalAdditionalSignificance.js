const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../mongoClient');
const wait = require('node:timers/promises').setTimeout;

module.exports = async (interaction, client) => {
    const [action, beastName] = interaction.customId.split('_')
    const beastSignificance = interaction.fields.getTextInputValue('beast_additional_significance')

    const db = getDb();
    const beastCollection = db.collection('bestiary');

    try {
        const updateResult = await beastCollection.updateOne(
            {
                name: beastName
            },
            {
                $push: {
                    significance: beastSignificance
                }
            }
        );

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


    } catch (error) {
        console.error('Failed to save beast name to MongoDB:', error);
        await interaction.reply({
            content: 'There was an error saving your beast. Please try again later.',
            ephemeral: true
        });
    }
};

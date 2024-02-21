const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../mongoClient');
const wait = require('node:timers/promises').setTimeout;

module.exports = async (interaction, client) => {
    const [action, beastName] = interaction.customId.split('_')
    const beastAbilities = interaction.fields.getTextInputValue('beast_additional_abilities')

    const db = getDb();
    const beastCollection = db.collection('bestiary');

    try {
        const updateResult = await beastCollection.updateOne(
            {
                name: beastName
            },
            {
                $push: {
                    abilities: beastAbilities
                }
            }
        );

        await interaction.update({
            content: 'Do you have more abilities to add?',
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`beastCreationAdditionAbilities_${beastName}`)
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
        console.error('Failed to save beast to MongoDB:', error);
        await interaction.reply({
            content: 'There was an error saving your beast. Please try again later.',
            ephemeral: true
        });
    }
};

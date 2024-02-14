const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../mongoClient');
const wait = require('node:timers/promises').setTimeout;

module.exports = async (interaction, client) => {
    const [action, loreName] = interaction.customId.split('_')
    const loreData = interaction.fields.getTextInputValue('lore_additional')

    const db = getDb();
    const loreCollection = db.collection('lore');

    try {
        const updateResult = await loreCollection.updateOne(
            {
                name: loreName
            },
            {
                $push: {
                    info: loreData
                }
            }
        );

        await interaction.update({
            content: 'Do you have more lore to add?',
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`loreCreationModalAdditional${loreName}`)
                        .setLabel('Yes')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`loreCreationFinal_${loreName}`)
                        .setLabel('No')
                        .setStyle(ButtonStyle.Danger),
                )
            ],
            ephemeral: true
        });


    } catch (error) {
        console.error('Failed to save lore name to MongoDB:', error);
        await interaction.reply({
            content: 'There was an error saving your lore name. Please try again later.',
            ephemeral: true
        });
    }
};

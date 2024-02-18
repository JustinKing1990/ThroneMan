const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');''
const { getDb } = require('../../mongoClient');

module.exports = async (interaction, client) => {
    const loreName = interaction.fields.getTextInputValue('lore_name');
    const loreData = [interaction.fields.getTextInputValue('lore_data')];

    const db = getDb();
    const loreCollection = db.collection('lore');

    try {
        await loreCollection.updateOne(
            {
                name: loreName
            },
            {
                $set: {
                    info: loreData
                }
            },
            { upsert: true }
        );

        await interaction.reply({
            content: 'Do you have more lore to add?',
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`loreCreationAddition_${loreName}`)
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

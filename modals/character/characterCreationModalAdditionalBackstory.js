const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../mongoClient');
const wait = require('node:timers/promises').setTimeout;

module.exports = async (interaction, client) => {
    const [action, characterName] = interaction.customId.split('_')
    const characterAdditionalBackstory = interaction.fields.getTextInputValue('character_additional_backstory')

    const db = getDb();
    const charactersCollection = db.collection('character');

    try {
        const updateResult = await charactersCollection.updateOne(
            {
                userId: interaction.user.id,
                name: characterName
            },
            {
                $push: {
                    backstory: characterAdditionalBackstory
                }
            }
        );

        await interaction.update({
            content: 'Do you have more backstory to add?',
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`characterCreationAdditionBackstory_${characterName}`)
                        .setLabel('Yes')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`characterCreationFinal_${characterName}`)
                        .setLabel('No')
                        .setStyle(ButtonStyle.Danger),
                )
            ],
            ephemeral: true
        });


    } catch (error) {
        console.error('Failed to save character name to MongoDB:', error);
        await interaction.reply({
            content: 'There was an error saving your character name. Please try again later.',
            ephemeral: true
        });
    }
};

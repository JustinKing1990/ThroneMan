const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../mongoClient');

module.exports = async (interaction, client) => {
    const characterName = interaction.fields.getTextInputValue('character_name');
    const characterTitle = interaction.fields.getTextInputValue('character_title')
    const characterGender = interaction.fields.getTextInputValue('character_gender')
    const characterAge = interaction.fields.getTextInputValue('character_age')
    const characterBirthplace = interaction.fields.getTextInputValue('character_birthplace')

    const db = getDb();
    const charactersCollection = db.collection('character');

    try {
        await charactersCollection.updateOne(
            {
                userId: interaction.user.id,
                name: characterName
            },
            {
                $set: {
                    title: characterTitle,
                    gender: characterGender,
                    age: characterAge,
                    birthplace: characterBirthplace
                }
            },
            { upsert: true }
        );

        await interaction.reply({
            content: 'Character updated successfully! Click "Next" to continue.',
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`characterCreationButtonPart2_${characterName}`)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary),
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

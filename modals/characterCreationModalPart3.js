const { ActionRowBuilder, ButtonBuilder, ButtonStyle, IntegrationApplication } = require('discord.js');
const { getDb } = require('../mongoClient');
const wait = require('node:timers/promises').setTimeout;

module.exports = async (interaction, client) => {
    const characterWeapons = interaction.fields.getTextInputValue('character_weapons');
    const characterArmor = interaction.fields.getTextInputValue('character_armor')
    const characterBeliefs = interaction.fields.getTextInputValue('character_beliefs')
    const characterPowers = interaction.fields.getTextInputValue('character_powers')
    const characterBackstory = [interaction.fields.getTextInputValue('character_backstory')]

    const db = getDb();
    const charactersCollection = db.collection('character');

    try {
        await charactersCollection.updateOne(
            { userId: interaction.user.id },
            {
                $set: {
                    weapons: characterWeapons,
                    armor: characterArmor,
                    beliefs: characterBeliefs,
                    powers: characterPowers,
                    backstory: characterBackstory
                }
            },
            { upsert: true }
        );

        await interaction.update({
            content: 'Do you have more backstory to add?',
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('character_creation_additional_backstory')
                        .setLabel('Yes')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('character_creation_final')
                        .setLabel('No')
                        .setStyle(ButtonStyle.Danger),
                )
            ],
            ephemeral: true
        });
        // await interaction.deleteReply({ ephemeral: true});


    } catch (error) {
        console.error('Failed to save character name to MongoDB:', error);
        await interaction.reply({
            content: 'There was an error saving your character name. Please try again later.',
            ephemeral: true
        });
    }
};

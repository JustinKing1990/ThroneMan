const { getDb } = require('../mongoClient');
const ensureMessagePosted = require('../helpercommands/postTrackedMessage');
const config = require('../env/config.json');
const fs = require('fs');
const path = require('path');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');


async function updateAllCharactersMessage(client, charactersCollection, settingsCollection) {
    const channelId = "905554690966704159"; // All characters channel ID
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'allCharacterMessage'; // Key in config.json
    const { currentPage } = await settingsCollection.findOne({ name: 'paginationSettings' }) || { currentPage: 0 };
    const totalCharacters = await charactersCollection.countDocuments();
    const totalPages = Math.ceil(totalCharacters / 25);
    const charactersData = await charactersCollection.find({})
        .sort({ name: 1 })
        .skip(currentPage * 25)
        .limit(25)
        .toArray();

        const importantMemberFetchPromises = charactersData.map(character =>
            client.guilds.cache.get('903864074134249483')
                .members.fetch(character.userId)
                .catch(err => console.log(`Failed to fetch member for userId: ${character.userId}`, err))
        );
        const importantMembers = await Promise.all(importantMemberFetchPromises);

        const importantCharacterOptions = importantCharactersData.map((character, index) => {
            const member = importantMembers[index];
            const displayName = member ? member.displayName : 'Unknown User';

            return {
                label: character.name,
                value: `${character.name}::${character.userId}`,
                description: `Player: ${displayName}`,
            };
        });

    // Generate selectMenu for characters
    const selectMenu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('selectCharacter')
                .setPlaceholder('Select a character')
                .addOptions(charactersData.map(character => ({
                    label: character.name,
                    description: `Character ID: ${character._id.toString().substr(0, 18)}`, // Ensure the description is not too long
                    value: character._id.toString(),
                }))),
        );

    // Generate rowButtons for pagination
    const rowButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('prevPage')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('nextPage')
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage >= totalPages - 1),
        );

    await ensureMessagePosted(client, channelId, configPath, messageConfigKey, { components: [selectMenu, rowButtons]});
}

async function handleDeleteCharacterInteraction(interaction) {
    const db = getDb();
    const settingsCollection = db.collection('settings');
    const charactersCollection = db.collection('characters');
    const characterArchiveCollection = db.collection('characterArchive'); // Reference to the characterArchive collection

    const [action, characterId, userId] = interaction.customId.split('_');

    if (interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        try {
            // Fetch the character to be deleted and store it in the archive before deletion
            const characterToArchive = await charactersCollection.findOne({ name: characterId, userId: userId });
            if (characterToArchive) {
                await characterArchiveCollection.insertOne(characterToArchive);
                const deletionResult = await charactersCollection.deleteOne({ name: characterId, userId: userId });

                if (deletionResult.deletedCount === 0) {
                    await interaction.reply({ content: 'No character found or you do not have permission to delete this character.', ephemeral: true });
                    return;
                } else {
                    await interaction.reply({ content: 'Character successfully deleted and archived.', ephemeral: true });
                    // Continue with the rest of the logic since the deletion was successful
                }
            } else {
                await interaction.reply({ content: 'Character not found for archiving and deletion.', ephemeral: true });
                return; // Return early if character not found
            }
        } catch (error) {
            console.error('Error archiving and deleting character:', error);
            await interaction.reply({ content: 'An error occurred while trying to archive and delete the character.', ephemeral: true });
            return; // Return early to prevent further execution
        }
    } else {
        await interaction.reply({ content: 'You do not have permission to delete this character.', ephemeral: true });
        return; // Return early to prevent further execution
    }

    // Code to update the message with the list of characters after a deletion
    try {
        await updateAllCharactersMessage(interaction.client, charactersCollection, settingsCollection);
    } catch (error) {
        console.error('Error updating character list message:', error);
    }
}

module.exports = handleDeleteCharacterInteraction;

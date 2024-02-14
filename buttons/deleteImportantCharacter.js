const { getDb } = require('../mongoClient');
const config = require('../env/config.json');
const fs = require('fs');
const path = require('path');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');

async function handleDeleteCharacterInteraction(interaction) {
    const db = getDb();
    const settingsCollection = db.collection('settings');
    const charactersCollection = db.collection('importantCharacters');
    const characterArchiveCollection = db.collection('importantCharacterArchive'); 

    const [action, characterId, userId] = interaction.customId.split('_');

    if (interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        try {
            const characterToArchive = await charactersCollection.findOne({ name: characterId, userId: userId });
            if (characterToArchive) {
                await characterArchiveCollection.insertOne(characterToArchive);
                const deletionResult = await charactersCollection.deleteOne({ name: characterId, userId: userId });

                if (deletionResult.deletedCount === 0) {
                    await interaction.reply({ content: 'No character found or you do not have permission to delete this character.', ephemeral: true });
                    return;
                } else {
                    await interaction.reply({ content: 'Character successfully deleted and archived.', ephemeral: true });
                }
            } else {
                await interaction.reply({ content: 'Character not found for archiving and deletion.', ephemeral: true });
                return; 
            }
        } catch (error) {
            console.error('Error archiving and deleting character:', error);
            await interaction.reply({ content: 'An error occurred while trying to archive and delete the character.', ephemeral: true });
            return; 
        }
    } else {
        await interaction.reply({ content: 'You do not have permission to delete this character.', ephemeral: true });
        return; 
    }

    try {
        const { currentPage } = await settingsCollection.findOne({ name: 'paginationSettings' }) || { importantCurrentPage: 0 };

        const totalCharacters = await charactersCollection.countDocuments();
        const totalPages = Math.ceil(totalCharacters / 25);

        const charactersData = await charactersCollection.find({})
            .sort({ name: 1 })
            .skip(currentPage * 25)
            .limit(25)
            .toArray();

        const memberFetchPromises = charactersData.map(character =>
            interaction.client.guilds.cache.get('903864074134249483')
                .members.fetch(character.userId)
                .catch(err => console.log(`Failed to fetch member for userId: ${character.userId}`, err))
        );
        const members = await Promise.all(memberFetchPromises);

        const characterOptions = charactersData.map((character, index) => {
            const member = members[index];
            const displayName = member ? member.displayName : 'Unknown User';

            return {
                label: character.name,
                value: `${character.name}::${character.userId}`,
                description: `Player: ${displayName}`,
            };
        });

        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('selectImportantCharacter')
                    .setPlaceholder('Select a character')
                    .addOptions(characterOptions),
            );

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

        const allCharactersChannel = await interaction.client.channels.fetch("903864075405127706"); // Adjust channel ID accordingly
        const allCharactersMessageId = config.allCharacterMessage
        let allCharacterMessageExists = false;
        let allCharactersMessage

        try {
            const message = await allCharactersChannel.messages.fetch(allCharactersMessageId);
            allCharacterMessageExists = true;
        } catch (error) {
        }
        if (allCharacterMessageExists) {
            allCharactersMessage = await allCharactersChannel.messages.fetch(allCharactersMessageId);
            await allCharactersMessage.edit({ content: "Select a character to view more information:", components: [selectMenu, rowButtons] });
        } else {
            allCharactersMessage = await allCharactersChannel.send({ content: "Select a character to view more information:", components: [selectMenu, rowButtons] });
            config.allCharacterMessage = allCharactersMessage.id;
            fs.writeFileSync(path.join(__dirname, '../env/config.json'), JSON.stringify(config, null, 2));
        }
    } catch (error) {
        console.error('Error updating character list message:', error);
    }
}

module.exports = handleDeleteCharacterInteraction;

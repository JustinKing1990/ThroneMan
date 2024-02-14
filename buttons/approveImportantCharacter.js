const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../mongoClient');
const config = require('../env/config.json');
const { r } = require('tar');

module.exports = async (interaction, client) => {

    await interaction.deferUpdate({ ephemeral: true })
    const db = getDb();
    const sourceCollection = db.collection('importantCharacter');
    const targetCollection = db.collection('importantCharacters');
    const settingsCollection = db.collection('settings');
    const [action, userId, characterName] = interaction.customId.split('_')

    try {
        const characterDocument = await sourceCollection.findOne({ userId: userId, name: characterName });

        if (characterDocument) {
            await targetCollection.insertOne(characterDocument);
            await sourceCollection.deleteOne({ name: characterName, userId: userId });

            if (characterDocument.messageIds && characterDocument.messageIds.length > 0) {
                const targetChannel = await interaction.client.channels.fetch("1207157063357177947"); 
                for (const messageId of characterDocument.messageIds) {
                    try {
                        await targetChannel.messages.delete(messageId);
                    } catch (msgError) {
                        console.error(`Failed to delete message ${messageId}:`, msgError);
                    }
                }
            }

            const { currentPage } = await settingsCollection.findOne({ name: 'paginationSettings' }) || { importantCurrentPage: 0 };

            const totalCharacters = await targetCollection.countDocuments();
            const totalPages = Math.ceil(totalCharacters / 25);

            const charactersData = await targetCollection.find({})
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

            const allCharactersChannel = await interaction.client.channels.fetch("903864075405127706"); 
            const allCharactersMessageId = config.allImportantCharacterMessage
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


            await interaction.followUp({ content: "Character approved and moved successfully.", ephemeral: true });
        } else {
            await interaction.followUp({ content: "No pending character found for this user.", ephemeral: true });
        }
    } catch (error) {
        console.error('Error processing accept button interaction:', error);
        await interaction.update({ content: "There was an error processing the character approval. Yell at your local dev", ephemeral: true });
    }
};

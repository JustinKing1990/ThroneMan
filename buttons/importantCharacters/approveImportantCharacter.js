const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../../mongoClient');
const ensureMessagePosted = require('../../helpercommands/postTrackedMessage')
const config = require('../../env/config.json');



async function updateAllImportantCharactersMessage(client, charactersCollection, settingsCollection) {
    const channelId = "1207179211845140521"; // All characters channel ID
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'allImportantCharacterMessage'; // Key in config.json
    const { currentPage } = await settingsCollection.findOne({ name: 'paginationSettings' }) || { importantCurrentPage: 0 };
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
                .setCustomId('selectImportantCharacter')
                .setPlaceholder('Select a character')
                .addOptions(importantCharacterOptions),
        );

    // Generate rowButtons for pagination
    const rowButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('prevImportantPage')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('nextImportantPage')
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage >= totalPages - 1),
        );

    await ensureMessagePosted(client, channelId, configPath, messageConfigKey, { components: [selectMenu, rowButtons]});
}
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

            await updateAllImportantCharactersMessage(interaction.client, targetCollection, settingsCollection);

            await interaction.followUp({ content: "Character approved and moved successfully.", ephemeral: true });
        } else {
            await interaction.followUp({ content: "No pending character found for this user.", ephemeral: true });
        }
    } catch (error) {
        console.error('Error processing accept button interaction:', error);
        await interaction.update({ content: "There was an error processing the character approval. Yell at your local dev", ephemeral: true });
    }
};

const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../mongoClient');
const config = require('../env/config.json');

module.exports = async (interaction, client) => {
    const db = getDb();
    const sourceCollection = db.collection('character');
    const targetCollection = db.collection('characters');
    const settingsCollection = db.collection('settings');
    const [action, userId, characterName] = interaction.customId.split('_')
    console.log(characterName)

    try {
        const characterDocument = await sourceCollection.findOne({ userId: interaction.user.id });

        if (characterDocument) {
            await targetCollection.insertOne(characterDocument);
            await sourceCollection.deleteOne({ userId: interaction.user.id });

            // Delete associated messages if there are any messageIds
            if (characterDocument.messageIds && characterDocument.messageIds.length > 0) {
                const targetChannel = await interaction.client.channels.fetch("1206393672271134770"); // Channel ID where messages were posted
                for (const messageId of characterDocument.messageIds) {
                    try {
                        await targetChannel.messages.delete(messageId);
                    } catch (msgError) {
                        console.error(`Failed to delete message ${messageId}:`, msgError);
                    }
                }
            }

            // Notify the user in the specified channel about their character's acceptance
            const announcementChannel = await interaction.client.channels.fetch("904144926135164959"); // Update with your channel ID
            await announcementChannel.send(`<@${interaction.user.id}>, your character: ${characterDocument.name} has been accepted! 🎉 Please check <#${"905554690966704159"}> for your character.`);


            // Update the selectMenu to include the new character
            const { currentPage } = await settingsCollection.findOne({ name: 'paginationSettings' }) || { currentPage: 0 };

            const totalCharacters = await targetCollection.countDocuments();
            const totalPages = Math.ceil(totalCharacters / 25);

            const charactersData = await targetCollection.find({})
                .sort({ name: 1 })
                .skip(currentPage * 25)
                .limit(25)
                .toArray();

            const characterOptions = charactersData.map(character => ({
                label: character.name,
                value: character.name
            }));

            const selectMenu = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('selectCharacter')
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

            const allCharactersChannel = await interaction.client.channels.fetch("905554690966704159"); // Adjust channel ID accordingly
            const allCharactersMessageId = config.allCharacterMessage
            let allCharacterMessageExists = false;

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

            await interaction.update({ content: "Character approved and moved successfully.", ephemeral: true });
        } else {
            await interaction.update({ content: "No pending character found for this user.", ephemeral: true });
        }
    } catch (error) {
        console.error('Error processing accept button interaction:', error);
        await interaction.update({ content: "There was an error processing the character approval. Yell at your local dev", ephemeral: true });
    }
};

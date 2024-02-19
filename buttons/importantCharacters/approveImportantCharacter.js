const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../../mongoClient');
const ensureMessagePosted = require('../../helpercommands/postTrackedMessage')
const config = require('../../env/config.json');



async function updateAllImportantCharactersMessage(client, charactersCollection, settingsCollection) {
    const channelId = "1207179211845140521";
    const configPath = path.join(__dirname, '../../env/config.json');
    const messageConfigKey = 'allImportantCharacterMessage';
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



    const selectMenu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('selectImportantCharacter')
                .setPlaceholder('Select a character')
                .addOptions(importantCharacterOptions),
        );


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

    await ensureMessagePosted(client, channelId, configPath, messageConfigKey, { components: [selectMenu, rowButtons] });
}
module.exports = async (interaction, client) => {

    await interaction.deferUpdate({ ephemeral: true })
    const db = getDb();
    const sourceCollection = db.collection('importantCharacter');
    const targetCollection = db.collection('importantCharacters');
    const settingsCollection = db.collection('settings');
    const [action, userId, characterName] = interaction.customId.split('_')
    const receivingChannel = await interaction.client.channels.fetch('1207157063357177947')

    try {
        // Check if the user interacting is the same as the character's userId to prevent self-approval
        // if (interaction.user.id === userId) {
        //     await interaction.followUp({ content: "You cannot approve your own character submission.", ephemeral: true });
        //     return;
        // }

        const characterDocument = await charactersCollection.findOne({ userId: userId, name: characterName });

        if (characterDocument) {
            // Assume characterDocument.imageUrls is an array of image URLs
            const messageIds = characterDocument.messageIds || [];
            let attachments = [];

            // Fetch each message by ID and extract image URLs
            for (let messageId of messageIds) {
                try {
                    const message = await receivingChannel.messages.fetch(messageId);
                    const messageAttachments = message.attachments.filter(attachment => attachment.contentType.startsWith('image/')).values();
                    attachments = [...attachments, ...Array.from(messageAttachments)];
                } catch (error) {
                }
            }
            const imageEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Character Images')
                .setDescription(`Images for character: ${characterName ? characterName : "Unknown Character"}`)
                .addFields(
                    { name: 'User ID', value: interaction.user.id.toString() },
                    { name: 'Character Name', value: characterName }
                );


            // The channel to post the embed with images
            const targetChannel = await interaction.client.channels.fetch("1206381988559323166");
            await targetChannel.send({ embeds: [imageEmbed], files: attachments.map(attachment => attachment.url) });
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

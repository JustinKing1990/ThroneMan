const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../../mongoClient');
const ensureMessagePosted = require('../../helpercommands/postTrackedMessage')
const config = require('../../env/config.json');

async function updateAllCharactersMessage(client, charactersCollection, settingsCollection) {
    const channelId = "905554690966704159"; 
    const configPath = path.join(__dirname, '../../env/config.json');
    const messageConfigKey = 'allCharacterMessage'; 
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

        const importantCharacterOptions = charactersData.map((character, index) => {
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
                .setCustomId('selectCharacter')
                .setPlaceholder('Select a character')
                .addOptions(importantCharacterOptions),
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

    await ensureMessagePosted(client, channelId, configPath, messageConfigKey, { components: [selectMenu, rowButtons]});
}

module.exports = async (interaction, client) => {
    await interaction.deferUpdate({ ephemeral: true });
    const db = getDb();
    const charactersCollection = db.collection('characters');
    const settingsCollection = db.collection('settings');
    const [action, userId, characterName] = interaction.customId.split('_');

    try {
        // Check if the user interacting is the same as the character's userId to prevent self-approval
        if (interaction.user.id === userId) {
            await interaction.followUp({ content: "You cannot approve your own character submission.", ephemeral: true });
            return;
        }

        const characterDocument = await charactersCollection.findOne({ userId: userId, name: characterName });

        if (characterDocument) {
            // Assume characterDocument.imageUrls is an array of image URLs
            const imageUrls = characterDocument.imageUrls || [];

            const imageEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`Character Approval: ${characterName}`)
                .setDescription(`Approved character: ${characterName}`)
                .addFields(
                    { name: 'Player', value: `<@${userId}>` },
                    { name: 'Character Name', value: characterName },
                );

            // Add image URLs to the embed if available
            if (imageUrls.length > 0) {
                imageEmbed.setImage(imageUrls[0]); // Display the first image, or use .addFields to list all URLs
            }

            // The channel to post the embed with images
            const targetChannel = await client.channels.fetch("1206393672271134770");
            await targetChannel.send({ embeds: [imageEmbed] });
            await targetCollection.insertOne(characterDocument);
            await sourceCollection.deleteOne({ name: characterName, userId: userId });

            
            if (characterDocument.messageIds && characterDocument.messageIds.length > 0) {
                const targetChannel = await interaction.client.channels.fetch("1206393672271134770"); 
                for (const messageId of characterDocument.messageIds) {
                    try {
                        await targetChannel.messages.delete(messageId);
                    } catch (msgError) {
                        console.error(`Failed to delete message ${messageId}:`, msgError);
                    }
                }
            }

            
            const announcementChannel = await interaction.client.channels.fetch("904144926135164959"); 
            await announcementChannel.send(`<@${userId}>, your character: ${characterDocument.name} has been accepted! 🎉 Please check <#${"905554690966704159"}> for your character.`);


                    await updateAllCharactersMessage(interaction.client, targetCollection, settingsCollection);
;

            const guild = await interaction.client.guilds.cache.get('903864074134249483'); 
            const member = await guild.members.fetch(userId);
            let roleId = '903864074134249484'; 
            await member.roles.add(roleId);
            roleId = '989853929653305344';
            await member.roles.remove(roleId);

            await interaction.followUp({ content: "Character approved and moved successfully.", ephemeral: true });
        } else {
            await interaction.followUp({ content: "No pending character found for this user.", ephemeral: true });
        }
    } catch (error) {
        console.error('Error processing accept button interaction:', error);
        await interaction.update({ content: "There was an error processing the character approval. Yell at your local dev", ephemeral: true });
    }
};

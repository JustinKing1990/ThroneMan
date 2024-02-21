const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../../mongoClient');
const ensureMessagePosted = require('../../helpercommands/postTrackedMessage')
const updateListMessage = require('../../helpercommands/updateListMessage')
const config = require('../../env/config.json');

module.exports = async (interaction, client) => {
    await interaction.deferUpdate({ ephemeral: true });
    const db = getDb();
    const charactersCollection = db.collection('character');
    const targetCollection = db.collection('characters')
    const settingsCollection = db.collection('settings');
    const [action, userId, characterName] = interaction.customId.split('_');
    const receivingChannel = await interaction.client.channels.fetch('1206393672271134770')

    try {
        if (interaction.user.id === userId) {
            await interaction.followUp({ content: "You cannot approve your own character submission.", ephemeral: true });
            return;
        }

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
                    { name: 'User ID', value: userId },
                    { name: 'Character Name', value: characterName }
                );


            // The channel to post the embed with images
            const targetChannel = await interaction.client.channels.fetch("1206381988559323166");
            await targetChannel.send({ embeds: [imageEmbed], files: attachments.map(attachment => attachment.url) });
            characterDocument.approvedBy = interaction.member.displayName
            await targetCollection.insertOne(characterDocument);
            await charactersCollection.deleteOne({ name: characterName, userId: userId });


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


            await updateListMessage(null, interaction, targetCollection, settingsCollection, config.allCharacterChannelId, config.allCharactersMessageId, "Character");
            

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

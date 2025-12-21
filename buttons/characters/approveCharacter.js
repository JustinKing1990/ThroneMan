const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../../mongoClient');
const updateListMessage = require('../../helpercommands/updateListMessage');
const { uploadImagesToDiscord } = require('../../helpercommands/uploadImagesToDiscord');
const config = require('../../env/config.json');

module.exports = async (interaction, _client) => {
  await interaction.deferUpdate({ flags: [64] });
  const db = getDb();
  const pendingCollection = db.collection('characterPending');
  const finalCollection = db.collection('characters');
  const settingsCollection = db.collection('settings');
  const [_action, userId, characterName] = interaction.customId.split('_');
  const receivingChannel = await interaction.client.channels.fetch('1206393672271134770');

  try {
    if (interaction.user.id === userId) {
      await interaction.followUp({
        content: 'You cannot approve your own character submission.',
        flags: [64],
      });
      return;
    }

    const characterDocument = await pendingCollection.findOne({
      userId: userId,
      name: characterName,
    });

    if (characterDocument) {
      // Upload images to Discord now that character is approved
      if (characterDocument.imageUrls && characterDocument.imageUrls.length > 0) {
        const uploadResult = await uploadImagesToDiscord(characterDocument.imageUrls, {
          channelId: '1206381988559323166', // Character images channel
          userId: userId,
          contentName: characterName,
          contentType: 'character',
          client: interaction.client,
        });
        
        if (uploadResult.urls.length > 0) {
          characterDocument.imageUrls = uploadResult.urls;
          characterDocument.imageMessageIds = uploadResult.messageIds;
        }
      }
      
      // Move document from pending to final collection
      delete characterDocument._id; // Remove MongoDB ID to avoid conflicts
      await finalCollection.insertOne(characterDocument);
      
      // Fetch and delete all messages from the pending submission
      const messageIds = characterDocument.messageIds || [];
      if (messageIds && messageIds.length > 0) {
        for (const messageId of messageIds) {
          try {
            await receivingChannel.messages.delete(messageId);
          } catch (msgError) {
            console.error(`Failed to delete message ${messageId}:`, msgError);
          }
        }
      }
      
      // Delete from pending collection
      await pendingCollection.deleteOne({ name: characterName, userId: userId });

      const announcementChannel = await interaction.client.channels.fetch('904144926135164959');
      await announcementChannel.send(
        `<@${userId}>, your character: ${characterDocument.name} has been accepted! 🎉 Please check <#${'905554690966704159'}> for your character.`,
      );

      await updateListMessage(
        interaction.client,
        interaction,
        finalCollection,
        settingsCollection,
        config.allCharacterChannelId,
        config.allCharactersMessageId,
        'Character',
      );

      const guild = await interaction.client.guilds.cache.get('903864074134249483');
      const member = await guild.members.fetch(userId);
      let roleId = '903864074134249484';
      await member.roles.add(roleId);
      roleId = '989853929653305344';
      await member.roles.remove(roleId);

      await interaction.followUp({
        content: 'Character approved and moved successfully.',
        flags: [64],
      });
    } else {
      await interaction.followUp({
        content: 'No pending character found for this user.',
        flags: [64],
      });
    }
  } catch (error) {
    console.error('Error processing accept button interaction:', error);
    await interaction.update({
      content: 'There was an error processing the character approval. Yell at your local dev',
      flags: [64],
    });
  }
};

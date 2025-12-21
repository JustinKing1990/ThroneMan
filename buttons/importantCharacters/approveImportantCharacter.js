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
  const pendingCollection = db.collection('importantCharacterPending');
  const finalCollection = db.collection('importantCharacters');
  const settingsCollection = db.collection('settings');
  const [_action, userId, characterName] = interaction.customId.split('_');
  const receivingChannel = await interaction.client.channels.fetch('1207157063357177947');

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
          contentType: 'importantCharacter',
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
      let newTargetcollection = db.collection('importantCharacters');
      await updateListMessage(
        interaction.client,
        interaction,
        newTargetcollection,
        settingsCollection,
        config.allImportantCharacterChannelId,
        config.allImportantCharacterMessage,
        'ImportantCharacter',
      );

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

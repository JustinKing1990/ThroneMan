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
  const sourceCollection = db.collection('importantCharacter');
  const targetCollection = db.collection('importantCharacters');
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

    const characterDocument = await sourceCollection.findOne({
      userId: userId,
      name: characterName,
    });

    if (characterDocument) {
      // Upload base64 images to Discord now that character is approved
      if (characterDocument.imageUrls && characterDocument.imageUrls.length > 0) {
        const hasBase64Images = characterDocument.imageUrls.some(url => url.startsWith('data:'));
        
        if (hasBase64Images) {
          console.log(`Uploading ${characterDocument.imageUrls.length} images to Discord for approved important character...`);
          const discordImageUrls = await uploadImagesToDiscord(characterDocument.imageUrls, {
            channelId: '1206381988559323166', // Character images channel
            userId: userId,
            contentName: characterName,
            contentType: 'importantCharacter',
            client: interaction.client,
          });
          
          if (discordImageUrls.length > 0) {
            characterDocument.imageUrls = discordImageUrls;
            console.log(`Successfully uploaded ${discordImageUrls.length} images to Discord`);
          }
        }
      }
      
      // Assume characterDocument.imageUrls is an array of image URLs
      const messageIds = characterDocument.messageIds || [];
      let attachments = [];

      // Fetch each message by ID and extract image URLs
      for (let messageId of messageIds) {
        try {
          const message = await receivingChannel.messages.fetch(messageId);
          const messageAttachments = message.attachments
            .filter((attachment) => attachment.contentType.startsWith('image/'))
            .values();
          attachments = [...attachments, ...Array.from(messageAttachments)];
        } catch (error) {}
      }
      const imageEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Character Images')
        .setDescription(
          `Images for character: ${characterName ? characterName : 'Unknown Character'}`,
        )
        .addFields(
          { name: 'User ID', value: interaction.user.id.toString() },
          { name: 'Character Name', value: characterName },
        );

      // The channel to post the embed with images
      const targetChannel = await interaction.client.channels.fetch('1206381988559323166');
      await targetChannel.send({
        embeds: [imageEmbed],
        files: attachments.map((attachment) => attachment.url),
      });
      await targetCollection.insertOne(characterDocument);
      await sourceCollection.deleteOne({ name: characterName, userId: userId });

      if (characterDocument.messageIds && characterDocument.messageIds.length > 0) {
        const targetChannel = await interaction.client.channels.fetch('1207157063357177947');
        for (const messageId of characterDocument.messageIds) {
          try {
            await targetChannel.messages.delete(messageId);
          } catch (msgError) {
            console.error(`Failed to delete message ${messageId}:`, msgError);
          }
        }
      }
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

const { getDb } = require('../../mongoClient');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const https = require('https');
const http = require('http');

// Helper to download an image from URL and return as buffer
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadImage(response.headers.location).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

module.exports = async (interaction, _client) => {
  const [_action, characterName, userId] = interaction.customId.split('_');

  // Verify ownership
  if (interaction.user.id !== userId) {
    await interaction.reply({
      content: 'You can only edit your own characters.',
      flags: [64],
    });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  try {
    const db = getDb();
    const character = await db.collection('characters').findOne({ name: characterName, userId });

    if (!character) {
      await interaction.editReply({ content: 'Character not found.' });
      return;
    }

    // Fetch recent messages from the channel to find uploaded images
    const channel = interaction.channel;
    const messages = await channel.messages.fetch({ limit: 10 });

    // Find messages from this user with attachments
    const userMessages = messages.filter(
      (msg) => msg.author.id === userId && msg.attachments.size > 0
    );

    if (userMessages.size === 0) {
      await interaction.editReply({
        content: 'No images found in your recent messages. Please upload your image(s) first, then click the button again.',
      });
      return;
    }

    // Collect all image URLs and track messages to delete
    const newImageUrls = [];
    const messagesToDelete = [];
    userMessages.forEach((msg) => {
      let hasImages = false;
      msg.attachments.forEach((attachment) => {
        if (attachment.contentType && attachment.contentType.startsWith('image/')) {
          newImageUrls.push(attachment.url);
          hasImages = true;
        }
      });
      if (hasImages) {
        messagesToDelete.push(msg);
      }
    });

    if (newImageUrls.length === 0) {
      await interaction.editReply({
        content: 'No valid images found in your recent messages. Please make sure you uploaded image files (PNG, JPG, etc.).',
      });
      return;
    }

    // Download images BEFORE deleting the source messages (URLs expire after deletion)
    const downloadedImages = [];
    for (let i = 0; i < newImageUrls.length; i++) {
      try {
        const buffer = await downloadImage(newImageUrls[i]);
        const filename = newImageUrls[i].split('?')[0].split('/').pop() || `image_${i + 1}.png`;
        downloadedImages.push({ buffer, filename });
      } catch (e) {
        // Skip failed downloads
      }
    }

    if (downloadedImages.length === 0) {
      await interaction.editReply({
        content: 'Failed to process the uploaded images. Please try again.',
      });
      return;
    }

    // Delete the user's uploaded image messages from the channel AFTER downloading
    for (const msg of messagesToDelete) {
      try {
        await msg.delete();
      } catch (e) {
        // Silent fail - message may already be deleted or bot lacks permission
      }
    }

    // Get existing images or initialize empty array
    const existingImages = character.imageUrls || [];
    const existingImageMessageIds = character.imageMessageIds || [];

    // Post to the character images channel by re-uploading downloaded images
    const targetChannelId = '1206381988559323166';
    const newMessageIds = [];
    const newPermanentUrls = [];
    const IMAGES_PER_MESSAGE = 4; // Consolidate into batches of 4 for nice grid display
    
    try {
      const targetChannel = await interaction.client.channels.fetch(targetChannelId);
      if (targetChannel) {
        const existingCount = existingImages.length;
        const totalBatches = Math.ceil(downloadedImages.length / IMAGES_PER_MESSAGE);
        
        // Post images in batches
        for (let batch = 0; batch < totalBatches; batch++) {
          const batchStart = batch * IMAGES_PER_MESSAGE;
          const batchImages = downloadedImages.slice(batchStart, batchStart + IMAGES_PER_MESSAGE);
          
          // Create attachments for this batch
          const attachments = batchImages.map((img, idx) => 
            new AttachmentBuilder(img.buffer, { 
              name: `${characterName.replace(/[^a-zA-Z0-9]/g, '_')}_${existingCount + batchStart + idx + 1}.png` 
            })
          );
          
          const imageRange = batchImages.length === 1 
            ? `#${existingCount + batchStart + 1}`
            : `#${existingCount + batchStart + 1}-${existingCount + batchStart + batchImages.length}`;
          
          const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Character Images ${imageRange}`)
            .addFields(
              { name: 'Character Name', value: characterName, inline: true },
              { name: 'Owner ID', value: userId, inline: true },
              { name: 'Images', value: `${batchImages.length} image(s)`, inline: true }
            )
            .setTimestamp();
          
          const sentMsg = await targetChannel.send({ 
            embeds: [embed], 
            files: attachments 
          });
          newMessageIds.push(sentMsg.id);
          
          // Get the permanent URLs from the sent message's attachments
          sentMsg.attachments.forEach((att) => {
            newPermanentUrls.push(att.url);
          });
        }
      }
    } catch (e) {
      // Non-fatal, continue
    }

    // Update the character with new permanent image URLs and message IDs
    const allImages = [...existingImages, ...newPermanentUrls];
    const allMessageIds = [...existingImageMessageIds, ...newMessageIds];
    
    await db.collection('characters').updateOne(
      { name: characterName, userId },
      { 
        $set: { 
          imageUrls: allImages,
          imageMessageIds: allMessageIds,
          updatedAt: new Date()
        } 
      }
    );

    const batchInfo = allImages.length > 10 
      ? `\n📁 Images are organized in ${Math.ceil(allImages.length / 10)} batch(es).` 
      : '';

    await interaction.editReply({
      content: `✅ Successfully added **${downloadedImages.length}** image(s) to **${characterName}**!\n\nTotal images: ${allImages.length}${batchInfo}`,
    });

  } catch (error) {
    console.error('Error processing image upload:', error);
    await interaction.editReply({
      content: 'An error occurred while processing the images. Please try again.',
    });
  }
};

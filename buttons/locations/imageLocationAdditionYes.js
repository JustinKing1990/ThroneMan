/**
 * Handle image upload for location
 */
const { getDb } = require('../../mongoClient');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { readAppConfig } = require('../../config');
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
  const [_action, ...nameParts] = interaction.customId.split('_');
  const locationName = nameParts.join('_');

  await interaction.deferReply({ flags: [64] });

  try {
    const db = getDb();
    const location = await db.collection('locations').findOne({
      userId: interaction.user.id,
      name: locationName,
    });

    if (!location) {
      await interaction.editReply({ content: '❌ Location not found.' });
      return;
    }

    // Fetch recent messages to find uploaded images
    const channel = interaction.channel;
    const messages = await channel.messages.fetch({ limit: 15 });

    const newImageUrls = [];
    const messagesToDelete = [];

    messages.forEach((msg) => {
      if (msg.author.id === interaction.user.id && msg.attachments.size > 0) {
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
      }
    });

    if (newImageUrls.length === 0) {
      await interaction.editReply({
        content: '📷 Please upload your images first, then click this button again.',
      });
      return;
    }

    // Download images before deleting source messages
    const downloadedImages = [];
    for (let i = 0; i < newImageUrls.length; i++) {
      try {
        const buffer = await downloadImage(newImageUrls[i]);
        const filename = newImageUrls[i].split('?')[0].split('/').pop() || `location_${i + 1}.png`;
        downloadedImages.push({ buffer, filename });
      } catch (e) {
        // Skip failed downloads
      }
    }

    if (downloadedImages.length === 0) {
      await interaction.editReply({
        content: '❌ Failed to process images. Please try again.',
      });
      return;
    }

    // Delete source messages
    for (const msg of messagesToDelete) {
      try {
        await msg.delete();
      } catch (e) {
        // Silent fail
      }
    }

    // Upload to location images channel
    const targetChannelId = '1451795171434823852';
    const newMessageIds = [];
    const newPermanentUrls = [];
    const IMAGES_PER_MESSAGE = 4;

    try {
      const targetChannel = await interaction.client.channels.fetch(targetChannelId);
      if (targetChannel) {
        const existingImages = location.imageUrls || [];
        const totalBatches = Math.ceil(downloadedImages.length / IMAGES_PER_MESSAGE);

        for (let batch = 0; batch < totalBatches; batch++) {
          const batchStart = batch * IMAGES_PER_MESSAGE;
          const batchImages = downloadedImages.slice(batchStart, batchStart + IMAGES_PER_MESSAGE);

          const attachments = batchImages.map((img, idx) =>
            new AttachmentBuilder(img.buffer, {
              name: `${locationName.replace(/[^a-zA-Z0-9]/g, '_')}_${existingImages.length + batchStart + idx + 1}.png`,
            })
          );

          const imageRange = batchImages.length === 1
            ? `#${existingImages.length + batchStart + 1}`
            : `#${existingImages.length + batchStart + 1}-${existingImages.length + batchStart + batchImages.length}`;

          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle(`Location Images ${imageRange}`)
            .addFields(
              { name: 'Location Name', value: locationName, inline: true },
              { name: 'Creator ID', value: interaction.user.id, inline: true },
              { name: 'Images', value: `${batchImages.length} image(s)`, inline: true }
            )
            .setTimestamp();

          const sentMsg = await targetChannel.send({
            embeds: [embed],
            files: attachments,
          });
          newMessageIds.push(sentMsg.id);

          sentMsg.attachments.forEach((att) => {
            newPermanentUrls.push(att.url);
          });
        }
      }
    } catch (e) {
      console.error('Failed to upload location images:', e);
    }

    // Update database with new images
    const existingImages = location.imageUrls || [];
    const existingMessageIds = location.imageMessageIds || [];
    const allImages = [...existingImages, ...newPermanentUrls];
    const allMessageIds = [...existingMessageIds, ...newMessageIds];

    await db.collection('locations').updateOne(
      { userId: interaction.user.id, name: locationName },
      {
        $set: {
          imageUrls: allImages,
          imageMessageIds: allMessageIds,
          updatedAt: new Date(),
        },
      }
    );

    // Update the list message
    const updateListMessage = require('../../helpercommands/updateListMessage');
    const config = readAppConfig();
    await updateListMessage(
      interaction.client,
      interaction,
      db.collection('locations'),
      db.collection('settings'),
      config.locationChannelId,
      config.locationMessageId,
      'Location'
    );

    await interaction.editReply({
      content: `✅ **${locationName}** has been saved with ${allImages.length} image(s)!\n\nYour location is now available in the locations list.`,
    });
  } catch (error) {
    console.error('Error in location image upload:', error);
    await interaction.editReply({
      content: '❌ An error occurred. Please try again.',
    });
  }
};

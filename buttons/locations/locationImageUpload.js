/**
 * Process uploaded images for location edit
 */
const { getDb } = require('../../mongoClient');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const https = require('https');
const http = require('http');

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
  const [_action, ...rest] = interaction.customId.split('_');
  const userId = rest[rest.length - 1];
  const locationName = rest.slice(0, -1).join('_');

  // Verify ownership or staff
  const isStaff = interaction.member.permissions.has('KickMembers');
  if (interaction.user.id !== userId && !isStaff) {
    await interaction.reply({
      content: '❌ You can only edit your own locations.',
      flags: [64],
    });
    return;
  }

  await interaction.deferReply({ flags: [64] });

  try {
    const db = getDb();
    const location = await db.collection('locations').findOne({ name: locationName });

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
        content: '📷 No images found. Please upload your images first, then click the button again.',
      });
      return;
    }

    // Download images
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
      } catch (e) {}
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

          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle(`Location Images`)
            .addFields(
              { name: 'Location Name', value: locationName, inline: true },
              { name: 'Creator ID', value: userId, inline: true }
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

    // Update database
    const existingImages = location.imageUrls || [];
    const existingMessageIds = location.imageMessageIds || [];

    await db.collection('locations').updateOne(
      { name: locationName, userId },
      {
        $set: {
          imageUrls: [...existingImages, ...newPermanentUrls],
          imageMessageIds: [...existingMessageIds, ...newMessageIds],
          updatedAt: new Date(),
        },
      }
    );

    await interaction.editReply({
      content: `✅ Added ${downloadedImages.length} image(s) to **${locationName}**!`,
    });
  } catch (error) {
    console.error('Error uploading location images:', error);
    await interaction.editReply({
      content: '❌ An error occurred. Please try again.',
    });
  }
};

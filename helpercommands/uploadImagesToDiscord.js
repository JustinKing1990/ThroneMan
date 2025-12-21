const { AttachmentBuilder, EmbedBuilder } = require('discord.js');

/**
 * Upload base64 images to a Discord channel and return URLs
 * @param {Array<string>} base64Images - Array of base64 data URLs or raw base64 strings
 * @param {Object} options - Configuration object
 * @param {string} options.channelId - Discord channel ID to upload to
 * @param {string} options.userId - User ID who uploaded the images
 * @param {string} options.contentName - Name of the content (character/beast/etc)
 * @param {string} options.contentType - Type of content (character/beast/lore/important)
 * @param {Client} options.client - Discord client
 * @returns {Promise<{urls: Array<string>, messageIds: Array<string>}>} - Object with Discord image URLs and message IDs
 */
async function uploadImagesToDiscord(base64Images, options) {
  const { channelId, userId, contentName, contentType, client } = options;

  if (!base64Images || base64Images.length === 0) {
    return { urls: [], messageIds: [] };
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      return { urls: [], messageIds: [] };
    }

    const discordUrls = [];
    const messageIds = [];

    for (let i = 0; i < base64Images.length; i++) {
      const base64 = base64Images[i];

      // Skip if it's already a Discord URL (not base64)
      if (!base64.startsWith('data:') && base64.startsWith('http')) {
        // It's already a Discord URL, just post it as an embed
        const imageNumber = i + 1;
        const embed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} Image #${imageNumber}`)
          .addFields(
            { name: 'Content Name', value: contentName, inline: true },
            { name: 'User ID', value: userId, inline: true },
          )
          .setImage(base64)
          .setTimestamp();

        const message = await channel.send({ embeds: [embed] });
        discordUrls.push(base64);
        messageIds.push(message.id);
        continue;
      }

      // Extract base64 data if it's a data URL
      let buffer;
      if (base64.startsWith('data:')) {
        const base64Data = base64.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        buffer = Buffer.from(base64, 'base64');
      }

      // Create attachment
      const attachment = new AttachmentBuilder(buffer, {
        name: `${contentName}_image_${i + 1}.png`,
      });

      // Create embed with metadata
      const imageNumber = i + 1;
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} Image #${imageNumber}`)
        .addFields(
          { name: 'Content Name', value: contentName, inline: true },
          { name: 'User ID', value: userId, inline: true },
        )
        .setTimestamp();

      // Upload to Discord
      const message = await channel.send({
        embeds: [embed],
        files: [attachment],
      });

      // Get the attachment URL from the sent message
      const discordAttachment = message.attachments.first();
      if (discordAttachment) {
        discordUrls.push(discordAttachment.url);
        messageIds.push(message.id);
      }
    }

    return { urls: discordUrls, messageIds };
  } catch (error) {
    return { urls: [], messageIds: [] };
  }
}

module.exports = { uploadImagesToDiscord };

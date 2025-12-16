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
 * @returns {Promise<Array<string>>} - Array of Discord image URLs
 */
async function uploadImagesToDiscord(base64Images, options) {
  const { channelId, userId, contentName, contentType, client } = options;

  if (!base64Images || base64Images.length === 0) {
    return [];
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error(`Channel ${channelId} not found`);
      return [];
    }

    const discordUrls = [];

    for (let i = 0; i < base64Images.length; i++) {
      const base64 = base64Images[i];

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
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} Image`)
        .addFields(
          { name: 'Content Name', value: contentName, inline: true },
          { name: 'User ID', value: userId, inline: true },
          { name: 'Type', value: contentType, inline: true },
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
      }
    }

    return discordUrls;
  } catch (error) {
    console.error('Error uploading images to Discord:', error);
    return [];
  }
}

module.exports = { uploadImagesToDiscord };

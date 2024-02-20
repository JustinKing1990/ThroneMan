const fs = require("fs");
const path = require("path");
const { EmbedBuilder, ActionRowBuilder } = require("discord.js");

/**
 * Ensures a message is posted in a specified channel. If the message does not exist, it posts a new one.
 * If it exists, it updates the existing message.
 *
 * @param {Object} client - The Discord client instance.
 * @param {String} channelId - The ID of the channel where the message should be.
 * @param {String} messageIdConfigPath - The path to the config JSON file storing the message ID.
 * @param {String} messageIdConfigKey - The key in the config file where the message ID is stored.
 * @param {Array} content - An array containing the message's content (embeds, components, etc.).
 */
async function ensureMessagePosted(
  client,
  channelId,
  messageIdConfigPath,
  messageIdConfigKey,
  content
) {
  const channel = await client.channels.fetch(channelId);
  let config = require(messageIdConfigPath);
  let messageExists = false;
  let message;

  let isKeyInConfig = messageIdConfigKey in config;

  try {
    message = await channel.messages.fetch(
      isKeyInConfig ? messageId : messageIdConfigKey
    );
    messageExists = true;
  } catch (error) {}

  if (messageExists) {
    await message.edit(content);
  } else {
    message = await channel.send(content);
    if (isKeyInConfig) {
      config[messageIdConfigKey] = message.id;
      fs.writeFileSync(messageIdConfigPath, JSON.stringify(config, null, 2));
    }
  }
}
module.exports = ensureMessagePosted;

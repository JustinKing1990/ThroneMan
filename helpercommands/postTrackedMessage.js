const fs = require("fs");
const path = require("path");
const { EmbedBuilder, ActionRowBuilder } = require("discord.js");

async function ensureMessagePosted(
  client,
  channelId,
  messageIdConfigPath,
  messageIdConfigKey,
  content
) {
  const channel = await client.channels.fetch(channelId);
  let config = JSON.parse(fs.readFileSync(messageIdConfigPath, "utf8"));
  let messageExists = false;
  let message;

  const keyToUpdate = Object.keys(config).find((key) => config[key] === messageIdConfigKey);

  try {
    message = await channel.messages.fetch(messageIdConfigKey);
    messageExists = true;
  } catch (error) {
    messageExists = false;
  }

  if (messageExists) {
    await message.edit(content);
  } else {
    message = await channel.send(content);
      config[keyToUpdate] = message.id;
      fs.writeFileSync(messageIdConfigPath, JSON.stringify(config, null, 2));
  }
}

module.exports = ensureMessagePosted;

const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder } = require('discord.js');

async function ensureMessagePosted(context, channelId, messageIdConfigPath, messageIdConfigKey, content) {
    let channel;
    console.log(context)
    try{
         channel = await context.channels.fetch(channelId);
    } catch{
         channel = await context.client.channels.fetch(channelId);
    }
    let config = require(messageIdConfigPath);
    let messageExists = false;
    let message;

    try {
        message = await channel.messages.fetch(config[messageIdConfigKey]);
        messageExists = true;
    } catch (error) {
    }

    if (messageExists) {
        await message.edit(content);
    } else {
        message = await channel.send(content);
        config[messageIdConfigKey] = message.id;
        fs.writeFileSync(messageIdConfigPath, JSON.stringify(config, null, 2));
    }
}
module.exports = ensureMessagePosted
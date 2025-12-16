const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { env } = require('./config');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

const clientId = env.clientId;
const guildId = env.guildId;

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(env.token);

async function deployCommands() {
  if (!clientId || !guildId) {
    throw new Error('DISCORD_CLIENT_ID and DISCORD_GUILD_ID must be set in the environment.');
  }

  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
    throw error;
  }
}

module.exports = deployCommands;

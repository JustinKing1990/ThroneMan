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
  // Handle both slash commands and context menu commands
  if (command.data) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(env.token);

async function deployCommands() {
  if (!clientId || !guildId) {
    throw new Error('DISCORD_CLIENT_ID and DISCORD_GUILD_ID must be set in the environment.');
  }

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    console.log(`Client ID: ${clientId}, Guild ID: ${guildId}`);

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Discord API request timed out after 15 seconds')), 15000)
    );

    const result = await Promise.race([
      rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands }),
      timeoutPromise
    ]);

    console.log('Successfully reloaded application (/) commands.');
    return result;
  } catch (error) {
    console.error('Deploy commands error:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  deployCommands();
}

module.exports = deployCommands;

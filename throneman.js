const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const { env } = require('./config');
const mongoClient = require('./mongoClient.js');

const client = new Client({
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});
client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));
const eventFiles = fs.readdirSync('./events').filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.on('error', (error) => {
  console.error(`[Discord Error]`, error);
});

client.on('shardError', (error, shardId) => {
  console.error(`[Discord] Shard ${shardId} error:`, error);
});

client.on('invalidated', () => {
  console.error(`[Discord] Session invalidated! Bot needs restart.`);
});

async function start() {
  try {
    await mongoClient.connectToServer();
    console.log('Connected to MongoDB.');

    // Skip command deployment for now - commands are already registered
    // const deployCommands = require('./deploy-commands.js');
    // await deployCommands();

    await client.login(env.token);
    console.log('Discord client login initiated.');
  } catch (error) {
    console.error('Startup failed:', error);
    process.exit(1);
  }
}

start();

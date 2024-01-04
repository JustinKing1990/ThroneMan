const { Client, GatewayIntentBits, Discord, Collection, Partials } = require('discord.js')
const fs = require('fs');
const config = require("./env/config.json")

const client = new Client({
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    intents: [32767, GatewayIntentBits.MessageContent]
  });
client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

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
client.login(config.token)

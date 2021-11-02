const { SlashCommandBuilder } = require('@discordjs/builders');
const { waitForDebugger } = require('inspector');
const MessageEmbed = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('payyaboi')
        .setDescription('Provides a link to pay the creator of this bot. '),
    async execute(client, message, args, Discord, interaction) {
        const messageEmbed = new MessageEmbed()
        .setColor("GREEN")
        .setTitle("Pay Ya Boi")
        .setDescription("This is how you can pay the creator of the bot. ILY if you do")
        .addField("PayPal link", "https://www.paypal.com/paypalme/itsyaboi1v4")
        .addFooter("If you pay into this, I'll be forever thankful of you <3")
    },
    
};
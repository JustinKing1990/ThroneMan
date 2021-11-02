const { SlashCommandBuilder } = require('@discordjs/builders');
const { waitForDebugger } = require('inspector');
const MessageEmbed = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('payyaboi')
        .setDescription('Provides a link to pay the creator of this bot. '),
    async execute(client, message, args, Discord, interaction) {
        const messageEmbed = new MessageEmbed()
        .setColor("PURPLE")
        .setTitle("Pay the dev")
        .setThumbnail(guildMember.displayAvatarURL({dynamic: true}))
        .addField("PayYaBoi", "https://www.paypal.com/paypalme/itsyaboi1v4")
        .setFooter("If you do this, I'll be forever thankful to you <3")
        message.channel.send({embeds: [messageEmbed]});
    },
    
};
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { waitForDebugger } = require('inspector');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whatsintheworks')
        .setDescription('Displays a list of all the things that is being worked on'),
    async execute(client, message, args, Discord, interaction) {
        guildMember = message.guild.members.cache.find(u => u.user.username === message.author.username);
        const changelogMessage = require('../intheworks.json');
        const footerMessage = JSON.stringify(changelogMessage.NewFeatures.footer).replace(/\[/gmi, "").replace(/\]/gmi, "").replace(/"/gmi, "")
        let messageTitleArray = [];
        let messageArray = [];
        for(let i =0; i < changelogMessage.NewFeatures.intheworks.length; i++){
            messageTitleArray[i] = changelogMessage.NewFeatures.intheworks[i].title;
            messageArray[i] = changelogMessage.NewFeatures.intheworks[i].text;
        }
        const messageEmbed = new MessageEmbed()
        .setColor("PURPLE")
        .setTitle("What I'm working on")
        .setThumbnail(guildMember.displayAvatarURL({dynamic: true}))
        .setFooter(footerMessage)
        for(let i = 0; i < messageTitleArray.length; i++){
            messageEmbed.addField(messageTitleArray[i], messageArray[i]);
        }
        message.channel.send({embeds: [messageEmbed]});
        message.delete();
    },
};
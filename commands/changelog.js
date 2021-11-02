const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { waitForDebugger } = require('inspector');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('changelog')
        .setDescription('Displays the current changelog message to show my users what\'s new'),
    async execute(client, message, args, Discord, interaction) {
        guildMember = message.guild.members.cache.find(u => u.user.username === message.author.username);
        const version = require('../package.json')
        const changelogMessage = require('../changelog.json');
        const footerMessage = JSON.stringify(changelogMessage.NewChanges.footer).replace(/\[/gmi, "").replace(/\]/gmi, "").replace(/"/gmi, "")
        let messageTitleArray = [];
        let messageArray = [];
        for(let i =0; i < changelogMessage.NewChanges.Changes.length; i++){
            messageTitleArray[i] = changelogMessage.NewChanges.Changes[i].title;
            messageArray[i] = changelogMessage.NewChanges.Changes[i].text;
        }
        const messageEmbed = new MessageEmbed()
        .setColor("AQUA")
        .setTitle(`Change Log ${version.version}`)
        .setThumbnail(guildMember.displayAvatarURL({dynamic: true}))
        .setFooter(footerMessage)
        for(let i = 0; i < messageTitleArray.length; i++){
            messageEmbed.addField(messageTitleArray[i], messageArray[i]);
        }
        message.channel.send({embeds: [messageEmbed]});
        message.delete();
    },
};
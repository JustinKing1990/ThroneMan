const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { waitForDebugger } = require('inspector');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whatsintheworks')
        .setDescription('Displays a list of all the things that is being worked on'),
    async execute(client, message, args, Discord, interaction) {
        guildMember = message.guild.members.cache.find(u => u.user.username === message.author.username);
        const inTheWorksMessage = require('../intheworks.json');
        const footerMessage = JSON.stringify(inTheWorksMessage.NewFeatures.footer).replace(/\[/gmi, "").replace(/\]/gmi, "").replace(/"/gmi, "")
        let messageTitleArray = [];
        let messageArray = [];
        for(let i =0; i < inTheWorksMessage.NewFeatures.intheworks.length; i++){
            messageTitleArray[i] = inTheWorksMessage.NewFeatures.intheworks[i].title;
            messageArray[i] = inTheWorksMessage.NewFeatures.intheworks[i].text;
        }
        const inTheWorksEmbed = new EmbedBuilder()
        .setColor("Purple")
        .setTitle("What I'm working on")
        .setThumbnail(guildMember.displayAvatarURL({dynamic: true}))
        .setFooter({
            text:footerMessage,
            iconURL: guildMember.displayAvatarURL({dynamic: true}),
        })
        for(let i = 0; i < messageTitleArray.length; i++){
            inTheWorksEmbed.addFields({
                name: messageTitleArray[i],
                value: messageArray[i],}
                );
        }
        message.channel.send({embeds: [inTheWorksEmbed]});
        message.delete();
    },
};
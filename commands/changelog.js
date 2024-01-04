const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { waitForDebugger } = require('inspector');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('changelog')
        .setDescription('Displays the current changelog message to show my users what\'s new'),
    async execute(client, message, args, Discord, interaction) {
        try {
            guildMember = message.guild.members.cache.find(u => u.user.username === message.author.username);
        } catch {
            guildMember = interaction
        }
        const version = require('../package.json')
        const changelogMessage = require('../changelog.json');
        const footerMessage = JSON.stringify(changelogMessage.NewChanges.footer).replace(/\[/gmi, "").replace(/\]/gmi, "").replace(/"/gmi, "")
        let messageTitleArray = [];
        let messageArray = [];
        for (let i = 0; i < changelogMessage.NewChanges.Changes.length; i++) {
            messageTitleArray[i] = changelogMessage.NewChanges.Changes[i].title;
            messageArray[i] = changelogMessage.NewChanges.Changes[i].text;
        }
        const changeLogEmbed = new EmbedBuilder()
            .setColor("AQUA")
            .setTitle(`Change Log ${version.version}`)
            .setThumbnail(guildMember.user.displayAvatarURL({ dynamic: true }))
            .setFooter({
                text: footerMessage,
                iconURL: guildMember.user.displayAvatarURL({ dynamic: true })
            })
        for (let i = 0; i < messageTitleArray.length; i++) {
            changeLogEmbed.addFields({
                name: messageTitleArray[i],
                value: messageArray[i],
            })
        } try {
            interaction.reply({ embeds: [changeLogEmbed] })
        } catch {
            message.channel.send({ embeds: [changeLogEmbed] });
            message.delete();
        }
    },
};
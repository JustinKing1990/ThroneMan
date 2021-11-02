const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { waitForDebugger } = require('inspector');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('changelog')
        .setDescription('Displays the current changelog message to show my users what\'s new'),
    async execute(client, message, args, Discord, interaction) {
        guildMember = message.guild.members.cache.find(u => u.user.username === message.author.username);
        const changelogMessage = require('../changelog.json');
        const messageString = JSON.stringify(changelogMessage.text).replace(/\[/gmi, "").replace(/\]/gmi, "").replace(/"/gmi, "").split(/\\n/)
        const messageEmbed = new MessageEmbed()
        .setColor("AQUA")
        .setTitle("Change Log")
        .addFields(
            { name: "Title", value: messageString[0]},
            {name: "Change List", value: messageString[1]},
            {name: "UserName", value: messageString[2] },
            {name: "UserID", value: messageString[3]},
            {name: "CharacterName", value: messageString[4]},
            {name: "CharacterSheet", value: messageString[5]},
            {name: "New Commands", value: messageString[6]},
            {name: "AllCharacters", value: messageString[7]},
            {name: "DeleteCharacter", value: messageString[8]}
        )
        .setThumbnail(guildMember.displayAvatarURL({dynamic: true}))
        .setFooter(changelogMessage.footer.join(" "))
        message.channel.send({embeds: [messageEmbed]});
    },
};
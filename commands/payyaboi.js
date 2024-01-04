const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { waitForDebugger } = require('inspector');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('payyaboi')
        .setDescription('Provides a link to pay the creator of this bot. '),
    async execute(client, message, args, Discord, interaction) {
        guildMember = message.guild.members.cache.find(u => u.user.username === message.author.username);

        const EmbedBuilder = new EmbedBuilder()
            .setColor("PURPLE")
            .setTitle("Pay the dev")
            .setThumbnail(guildMember.displayAvatarURL({ dynamic: true }))
            .addField("PayYaBoi", "https://www.paypal.com/paypalme/itsyaboi1v4")
            .setFooter({
                text: "If you do this, I'll be forever thankful to you <3"
        })
        message.channel.send({ embeds: [EmbedBuilder] });
        message.delete();
    },

};
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { waitForDebugger } = require('inspector');
const { Sequelize } = require('sequelize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('changelog')
        .setDescription('Displays the current changelog message to show my users what\'s new'),
    async execute(client, message, args, Discord, interaction) {
        const changelogMessage = require('../changelog.json');
        const changelogImage = require('../Images/changelog.gif')
        const messageEmbed = new MessageEmbed()
        .setColor("AQUA")
        .setTitle("Change Log")
        .setDescription(`${changelogMessage.text}`)
        .setThumbnail(changelogImage)
    },
};
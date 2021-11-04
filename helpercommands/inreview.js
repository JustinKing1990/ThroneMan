const { SlashCommandBuilder } = require('@discordjs/builders');
const { DiscordAPIError, ReactionCollector, Discord } = require('discord.js');
const { waitForDebugger } = require('inspector');
const request = require('request');
const fs = require('fs');
const path = require('path')

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'database.sqlite',
});

const Characters = sequelize.define('characters', {
    userID: Sequelize.INTEGER,
    userName: Sequelize.STRING,
    characterName: Sequelize.STRING,
    characterSheet: {
        type: Sequelize.STRING,
        unique: true
    }
})

module.exports = {
    async execute(message, reaction, user) {
        console.log(message.author.username)
    }
};
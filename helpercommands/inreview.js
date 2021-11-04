const { SlashCommandBuilder } = require('@discordjs/builders');
const { DiscordAPIError, ReactionCollector, Discord } = require('discord.js');
const { waitForDebugger } = require('inspector');
const request = require('request');
const fs = require('fs');
const path = require('path')

const { Sequelize } = require('sequelize');
const { channel } = require('diagnostics_channel');

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
        const thread = await message.startThread({
            name: `${message.author.username}\'s new character`,
            autoArchiveDuration: 1440,
            reason: 'To discuss the ins and outs of a new character'
        });
        if(thread.joinable){
            await thread.join();
            await thread.members.add(message.author.id)
        }
        // const staff = message.guild.roles.cache.get('903864074134249487')
        // const dms = message.guild.roles.cache.get('904122949940965468').members.map(m => m.user.id)
        // const membersToAdd = staff + dms
        // console.log(staff.members)
        // console.log(dms)
        // console.log(membersToAdd)
        // // for(let i = 0; i< membersToAdd.length;i++){
        // //     thread.members.add(membersToAdd[i])
        // // }
        thread.send(`<@${message.author.id}><@&903864074134249487><@&904122949940965468> A new thread has been created for you to talk about the new character that ${message.author.username} made.`)
    }
};
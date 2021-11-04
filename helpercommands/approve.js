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
        const wait = require('./timer');
        let characterNameCollected = '';
        let ImageLink = '';
        const filter = (message) => {
            return !message.author.bot
        }
        if (message.attachments.size > 0) {
            message.attachments.forEach(attachment => {
                ImageLink = attachment.attachment;
            });
            message.channel.send(`What is the character's name, <@${user.id}>`).then(() => {
                message.channel.awaitMessages({ filter, max: 1, time: 10000, errors: ['time'] })
                    .then(collected => {
                        characterNameCollected = collected.first().content.toLowerCase();
                        download(ImageLink);
                        const characters = Characters.create({
                            userID: message.author.id,
                            userName: message.author.username,
                            characterName: characterNameCollected,
                            characterSheet: `/root/throneman/ThroneMan/Character_PDFs/${characterNameCollected}_${message.author.username}.pdf`
                        })
                    })
            })
        } else {
            ImageLink = message.content;
            message.channel.send(`What is the character's name, <@${user.id}>`).then(() => {
                message.channel.awaitMessages({ filter, max: 1, time: 10000, errors: ['time'] })
                    .then(collected => {
                        characterNameCollected = collected.first().content.toLowerCase();
                        const characters = Characters.create({
                            userID: message.author.id,
                            userName: message.author.username,
                            characterName: characterNameCollected,
                            characterSheet: message.content
                        })
                    })
            })
        }
        await wait.execute(10000);
        message.channel.send("I have added this character to the datbase. Please don't forget to delete the original posting.")
        characterListChannelID = "904144926135164959"
        characterListChannel = message.guild.channels.cache.get(characterListChannelID)
        const characterPost = await Characters.findOne({where: {characterName: characterNameCollected, userID: message.author.id}})
        if(characterPost.characterSheet.endsWith('.pdf')){
            characterListChannel.send(`User Name: ${characterPost.userName}\nCharacter Name: ${characterPost.characterName[0].toUpperCase() + characterPost.characterName.substring(1)}`);
            characterListChannel.send({
                files: [
                    characterPost.characterSheet
                ]
            })
        } else {
            characterListChannel.send(`User Name: ${characterPost.userName}\nCharacter Name: ${characterPost.characterName[0].toUpperCase() + characterPost.characterName.substring(1)}\nCharacter Sheet: ${characterPost.characterSheet}`);
        }
        const thread = message.channel.threads.cache.find(x => x.name === `${message.author.username} new character}`)
        await thread.delete();
        function download(url) {
            let dirname = `/root/throneman/ThroneMan/Character_PDFs/${characterNameCollected}_${message.author.username}.pdf`
           
            request.get(url)
                .on('error', console.error)
                .pipe(fs.createWriteStream(dirname));
            
        }
    }

};
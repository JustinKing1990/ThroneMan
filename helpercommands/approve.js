const { SlashCommandBuilder } = require('@discordjs/builders');
const { DiscordAPIError, ReactionCollector, Discord } = require('discord.js');
const { waitForDebugger } = require('inspector');
const request = require('request');
const fs = require('fs');

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
        if(message.attachments.length > 0){
        message.attachments.forEach(attachment => {
            ImageLink = attachment.attachment;
            });
        message.channel.send(`What is the character's name, <@${user.id}>`).then(() => {
            message.channel.awaitMessages({ filter, max: 1, time: 10000, errors: ['time']})
                .then(collected => {
                    characterNameCollected = collected.first().content.toLowerCase();
                    download(ImageLink);
                    const characters = Characters.create({
                        userID: message.author.id,
                        userName: message.author.username,
                        characterName: characterNameCollected,
                        characterSheet: `./Character PDFs/${characterNameCollected}_${message.author.username}.pdf`
                    })
                })
        })
    } else {
        ImageLink = message.content;
        message.channel.send(`What is the character's name, <@${user.id}>`).then(() => {
            message.channel.awaitMessages({ filter, max: 1, time: 10000, errors: ['time']})
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
        message.delete();
        
    function download(url){
        request.get(url)
            .on('error', console.error)
            .pipe(fs.createWriteStream(`./Character PDFs/${characterNameCollected}_${message.author.username}.pdf`));
    }
    }
    
};
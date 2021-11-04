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
        let usernameToFind = '';
        let ImageLink = '';
        let listString = []
        const filter = (message) => {
            return !message.author.bot
        }
        message.attachments.forEach(attachment => {
            ImageLink = attachment.attachment;
        });
        const userCharacters = await Characters.findAll({ attributes: ['userID', "characterName"], where: { userID: message.author.id } })
        const characterList = userCharacters.map(c => c.characterName);
        if (characterList.length > 1) {
            for (let i = 0; i < characterList.length; i++) {
                listString[i] = `[${i + 1}] ${characterList[i]}`
            }
            listString = listString.join("\n")
            message.channel.send(`This user has more than one character. Please respond with the character you wish to update.\n${listString}`).then(() => {
                message.channel.awaitMessages({ filter, max: 1, time: 10000, errors: ['time'] })
                    .then(collected => {
                        usernameToFind = collected.first().content
                    })
            })
            await wait.execute(10000);
            const characterFromList = await Characters.findOne({ where: { characterName: characterList[usernameToFind - 1]} })
            characterNameCollected = characterFromList.characterName
            if(characterFromList.characterSheet.endswith('.pdf')){
            download(ImageLink)
            } else{
                const updateCharacter = await Characters.update({characterSheet: message.content}, {where: {characterName: characterNameCollected}})
            }
            message.channel.send(`I've successfully updated ${characterNameCollected}!`)

        } else if (characterList.length === 1) {
            const characterToUpdate = await Characters.findOne({where: {userName: message.author.username}})
            characterNameCollected = characterToUpdate.characterName
            if(characterToUpdate.characterSheet.endswith('.pdf')){
            download(ImageLink)
            } else{
                const updateSingleCharacter = await Characters.update({characterSheet: message.content}, {where: {userName: characterToUpdate.userName}})
            }
            message.channel.send(`I've successfully updated ${characterNameCollected}!`)
        } else {
            message.reply(`Sorry, I could not find a character named: ${name[0].toUpperCase() + name.substring(1)}. Please check your spelling and try again.`)
        }
        await wait.execute(1000);
        message.delete();

        function download(url) {
            let dirname = `/root/throneman/ThroneMan/Character_PDFs/${characterNameCollected}_${message.author.username}.pdf`
            request.get(url)
                .on('error', console.error)
                .pipe(fs.createWriteStream(dirname));
        }
    }

};
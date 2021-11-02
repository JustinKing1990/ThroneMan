const { SlashCommandBuilder } = require('@discordjs/builders');
const { waitForDebugger } = require('inspector');
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
    data: new SlashCommandBuilder()
        .setName('character')
        .setDescription('Shows information about a character'),
    async execute(client, message, args, Discord, interaction) {
        const name = args.join(" ").toLowerCase()
        const wait = require('../helpercommands/timer')
        let listString = [];
        let usernameToFind = "";
        if(!interaction){
        const filter = (message) => {
            return message.author === message.author
        }
        try{
        const charactersAll = await Characters.findAll({ attributes: ['characterName', 'userName', 'characterSheet'], where: { characterName: name } });
        const list = charactersAll.map(c => c.userName);
        if (charactersAll.length === 1) {
            const characters = await Characters.findOne({ where: { characterName: name } });
            message.channel.send(characters)
            if(characters.characterSheet.endsWith('.pdf')){
            message.channel.send(`User Name: ${characters.userName}\nCharacter Name: ${characters.characterName[0].toUpperCase() + characters.characterName.substring(1)}`);
            message.channel.send({
                files:[
                    characters.characterSheet
                ]
            })
        } else{
            message.channel.send(`User Name: ${characters.userName}\nCharacter Name: ${characters.characterName[0].toUpperCase() + characters.characterName.substring(1)}\nCharacter Sheet: ${characters.characterSheet}`);

        }
        } else if(charactersAll.length > 1) {
            for (let i = 0; i < list.length; i++) {
                listString[i] = `[${i + 1}] ${message.guild.members.cache.find(n => n.user.username === list[i])}`
            }
            listString = listString.join("\n")
            message.channel.send(`I found more than one character with that name. Please respond with the number associate with the user you are looking for.\n${listString}`).then(() => {
                message.channel.awaitMessages({ filter, max: 1, time: 10000, errors: ['time'] })
                    .then(collected => {
                        usernameToFind = collected.first().content
                    })
            })
            await wait.execute(10000);
            const characterFromList = await Characters.findOne({where: {userName: list[usernameToFind-1], characterName: name}})
            if(characterFromList.characterSheet.endsWith('.pdf')){
            message.channel.send(`User Name: ${characterFromList.userName}\nCharacter Name: ${characterFromList.characterName[0].toUpperCase() + characterFromList.characterName.substring(1)}\nCharacter Sheet Link: ${characterFromList.characterSheet}`);
            } else{
                message.channel.send(`User Name: ${characterFromList.userName}\nCharacter Name: ${characterFromList.characterName[0].toUpperCase() + characterFromList.characterName.substring(1)}\nCharacter Sheet: ${characterFromList.characterSheet}`);
            }
        } else{
            message.reply(`Sorry, I could not find a character named: ${name[0].toUpperCase() + name.substring(1)}. Please check your spelling and try again.`)
        }
            } catch {
            message.reply(`Sorry, Something went catastrophically wrong. I'm probably on fire now. Do not panic, I will survive`)
        }
    } else {
        const filter = (message) => {
            return message.author === message.author
        }
        try{
        const charactersAll = await Characters.findAll({ attributes: ['characterName', 'userName', 'characterSheet'], where: { characterName: name } });
        const list = charactersAll.map(c => c.userName);
        if (charactersAll.length === 1) {
            const characters = await Characters.findOne({ where: { characterName: name } });
            message.channel.send(`User Name: ${characters.userName}\nCharacter Name: ${characters.characterName[0].toUpperCase() + characters.characterName.substring(1)}`);
            message.channel.send({
                files:[
                    characters.characterSheet
                ]
            })
        } else if(charactersAll.length > 1) {
            for (let i = 0; i < list.length; i++) {
                listString[i] = `[${i + 1}] ${message.guild.members.cache.find(n => n.user.username === list[i])}`
            }
            listString = listString.join("\n")
            message.channel.send(`I found more than one character with that name. Please respond with the number associate with the user you are looking for.\n${listString}`).then(() => {
                message.channel.awaitMessages({ filter, max: 1, time: 10000, errors: ['time'] })
                    .then(collected => {
                        usernameToFind = collected.first().content
                    })
            })
            await wait.execute(1000);
            const characterFromList = await Characters.findOne({where: {userName: list[usernameToFind-1], characterName: name}})
            message.channel.send(`User Name: ${characterFromList.userName}\nCharacter Name: ${characterFromList.characterName[0].toUpperCase() + characterFromList.characterName.substring(1)}\nCharacter Sheet Link: ${characterFromList.characterSheet}`);
        } else{
            message.reply(`Sorry, I could not find a character named: ${name[0].toUpperCase() + name.substring(1)}. Please check your spelling and try again.`)
        }
            } catch {
            message.reply(`Sorry, Something went catastrophically wrong. I'm probably on fire now. Do not panic, I will survive`)
        }

    }
    },

};
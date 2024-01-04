const { SlashCommandBuilder } = require('@discordjs/builders');
const { waitForDebugger } = require('inspector');
const { Sequelize } = require('sequelize');
const fs = require('fs')

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
        .setName('deletecharacter')
        .setDescription('Deletes a character from the database')
        .addStringOption(option => option.setName('charactername').setDescription("Input character you wish to delete")),
    async execute(client, message, args, Discord, interaction) {
        try {
            var name = args.join(" ").toLowerCase();
        } catch {
            var name = interaction.options._hoistedOptions[0].value
        }
        const wait = require('../helpercommands/timer')
        const usernameToFind = "";
        let listString = [];
        try {
            const filter = (message) => {
                return message.author === message.author
            }
        } catch { }
        try {
            const charactersAll = await Characters.findAll({ attributes: ['characterName', 'userName', 'characterSheet'], where: { characterName: name } });
            const list = charactersAll.map(c => c.userName);
            if (list.length === 1) {
                let deletePath = await Characters.findOne({ where: { characterName: name } })
                if (deletePath.characterSheet.endsWith(".pdf")) {
                    try {
                        fs.unlinkSync(deletePath.characterSheet)
                    } catch (err) {
                        console.error(err)
                    }
                }
                const characters = await Characters.destroy({ where: { characterName: name } });
                try {
                    message.channel.send(`I have destroyed ${name}. They shall forever exist within the void`)
                } catch {
                    interaction.reply(`I have destroyed ${name}. They shall forever exist within the void`)
                }
            } else if (list.length > 1) {
                for (let i = 0; i < list.length; i++) {
                    listString[i] = `[${i + 1}] ${message.guild.members.cache.find(n => n.user.username === list[i])}`
                }
                listString = listString.join("\n")
                try {
                    message.channel.send(`I found more than one character with that name. Please respond with the number associate with the user you are looking for.\n${listString}`).then(() => {
                        message.channel.awaitMessages({ filter, max: 1, time: 10000, errors: ['time'] })
                            .then(collected => {
                                usernameToFind = collected.first().content
                            })
                    })
                } catch {
                    interaction.reply(`I found more than one character with that name. Please respond with the number associate with the user you are looking for.\n${listString}`).then(() => {
                        interaction.channel.awaitMessages({ filter, max: 1, time: 10000, errors: ['time'] })
                            .then(collected => {
                                usernameToFind = collected.first().content
                            })
                    })
                }
                await wait.execute(10000);
                let deletePath = await Characters.findOne({ where: { userName: list[i] } })
                if (deletePath.characterSheet.endsWith(".pdf")) {
                    try {
                        fs.unlinkSync(deletePath.characterSheet);
                    } catch (err) {
                        console.error(err);
                    }
                }
                const characterFromList = await Characters.destroy({ where: { userName: list[usernameToFind - 1], characterName: name } })
                try {
                    message.channel.send(`I have destroyed ${name}. They shall forever exist within the void.`);
                } catch {
                    interaction.reply(`I have destroyed ${name}. They shall forever exist within the void.`)
                }

            } else {
                try {
                    message.reply(`Sorry, I could not find a character named: ${name[0].toUpperCase() + name.substring(1)}. Please check your spelling and try again.`)
                } catch {
                    interaction.reply(`Sorry, I could not find a character named: ${name[0].toUpperCase() + name.substring(1)}. Please check your spelling and try again.`)
                }
            }
        } catch {
            try {
                message.reply(`Sorry, Something went catastrophically wrong. I'm probably on fire now. Do not panic, I will survive`)
            } catch {
                interaction.reply(`Sorry, Something went catastrophically wrong. I'm probably on fire now. Do not panic, I will survive`)
            }
        }
        try {
            message.delete();
        } catch { }
    }
};
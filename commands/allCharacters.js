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
        .setName('allcharacters')
        .setDescription('Provides a list of all of the characters I have'),
    async execute(client, message, args, Discord, interaction) {
        const wait = require('../helpercommands/timer')
        let listString = [];
            try {
                const charactersAll = await Characters.findAll({ attributes: ['characterName', 'userName', 'characterSheet'] });
                const list = charactersAll.map(c => c.characterName);
                if (charactersAll.length >= 1) {
                    for (let i = 0; i < list.length; i++) {
                        listString[i] = `[${i + 1}] ${list[i]}`
                    }
                    listString = listString.join("\n")
                    try {
                        interaction.reply(`These are all of the charcters that I could find.\n${listString}`)
                    } catch {
                        message.channel.send(`These are all of the charcters that I could find.\n${listString}`)
                    }
                } else {
                    try {
                        interaction.reply(`Sorry, it appears as if I don't have any characters to show you. I don't know how this happened, or do I?`)
                    } catch {
                        message.reply(`Sorry, it appears as if I don't have any characters to show you. I don't know how this happened, or do I?`)
                    }
                }
            } catch {
                try {
                    interaction.reply(`Sorry, Something went catastrophically wrong. I'm probably on fire now. Do not panic, I will survive`)
                } catch {
                    message.reply(`Sorry, Something went catastrophically wrong. I'm probably on fire now. Do not panic, I will survive`)
                }
            }
            if(!interaction){
            message.delete();
            }
    }
};
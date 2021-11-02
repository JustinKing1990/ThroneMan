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
        .setName('deleteplayer')
        .setDescription('Deletes a player from the database'),
    async execute(client, message, args, Discord, interaction) {
        console.log(args.join(">"))
        const name = message.guild.members.cache.get().username.toLowerCase();
        const wait = require('../helpercommands/timer')
        const usernameToFind = "";
        let listString = [];
        if(!interaction){
            const filter = (message) => {
                return message.author === message.author
            }
            try{
            const charactersAll = await Characters.findAll({ attributes: ['characterName', 'userName', 'characterSheet', 'UserID'], where: { userName: name } });
            const list = charactersAll.map(c => c.userID);
            if (charactersAll.length === 1) {
                const characters = await Characters.destroy({ where: { userName: name} });
                message.channel.send(`I have destroyed ${name}. They shall forever exist within the void`)
            } else if(charactersAll.length > 1) {
                for(let i = 0; i < charactersAll.length; i++){
                    const deleteCharacter = await Characters.destroy({where: {userID: charactersAll[i]}});
                }
                await wait.execute(10000);
                message.channel.send(`I have destroyed ${name}. They shall forever exist within the void.`);
                
            } else{
                message.reply(`Sorry, I could not find a user named: ${name[0].toUpperCase() + name.substring(1)}. Please check your spelling and try again.`)
            }
                } catch {
                message.reply(`Sorry, Something went catastrophically wrong. I'm probably on fire now. Do not panic, I will survive`)
            }
        }
    }
};
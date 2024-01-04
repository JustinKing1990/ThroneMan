const { Sequelize } = require('sequelize');
const config = require('../env/config.json')
const { EmbedBuilder } = require('discord.js')
const changelogMessage = config.changelogMessage
const inTheWorksMessage = config.inTheWorksMessage

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
    name: "ready",
    once: true,
    async execute(client) {
        
        Characters.sync();
        setInterval(() => client.setPresence, 10 * 1000);
        console.log(`Successfully logged in as ${client.user.tag}`);


        //update the changelog message
        let changelogChannel = client.channels.fetch('1031376354974912633')
            .then(channel => channel.messages.fetch(changelogMessage))
            .then(message => {
                const version = require('../package.json')
                const changelogMessage = require('../changelog.json');
                const footerMessage = JSON.stringify(changelogMessage.NewChanges.footer).replace(/\[/gmi, "").replace(/\]/gmi, "").replace(/"/gmi, "")
                let messageTitleArray = [];
                let messageArray = [];
                for (let i = 0; i < changelogMessage.NewChanges.Changes.length; i++) {
                    messageTitleArray[i] = changelogMessage.NewChanges.Changes[i].title;
                    messageArray[i] = changelogMessage.NewChanges.Changes[i].text;

                    const changeLogEmbed = new EmbedBuilder()
                        .setColor("Aqua")
                        .setTitle(`Change Log ${version.version}`)
                        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                        .setFooter({
                            text: footerMessage,
                            iconURL: message.author.displayAvatarURL({ dynamic: true })
                        })
                    for (let i = 0; i < messageTitleArray.length; i++) {
                        changeLogEmbed.addFields({
                            name: messageTitleArray[i],
                            value: messageArray[i],
                        })
                    }
                    message.edit({ embeds: [changeLogEmbed] })
                }
            })

        //update the in the works message
        let inTheWorksChannel = client.channels.fetch('1031582807279030343')
            .then(channel => channel.messages.fetch(inTheWorksMessage))
            .then(message => {
                const inTheWorksMessage = require('../intheworks.json');
                const footerMessage = JSON.stringify(inTheWorksMessage.NewFeatures.footer).replace(/\[/gmi, "").replace(/\]/gmi, "").replace(/"/gmi, "")
                let messageTitleArray = [];
                let messageArray = [];
                for (let i = 0; i < inTheWorksMessage.NewFeatures.intheworks.length; i++) {
                    messageTitleArray[i] = inTheWorksMessage.NewFeatures.intheworks[i].title;
                    messageArray[i] = inTheWorksMessage.NewFeatures.intheworks[i].text;
                }
                const inTheWorksEmbed = new EmbedBuilder()
                    .setColor("Purple")
                    .setTitle("What I'm working on")
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                    .setFooter({
                        text: footerMessage,
                        iconURL: message.author.displayAvatarURL({ dynamic: true }),
                    })
                for (let i = 0; i < messageTitleArray.length; i++) {
                    inTheWorksEmbed.addFields({
                        name: messageTitleArray[i],
                        value: messageArray[i],
                    }
                    )
                    message.edit({ embeds: [inTheWorksEmbed] })
                }
            })
    }
}
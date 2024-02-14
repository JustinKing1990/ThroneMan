const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../mongoClient');
const mongoClient = require('../mongoClient')
const config = require('../env/config.json');
const interactioncreate = require('./interactioncreate');
const changelogMessage = config.changelogMessage
const inTheWorksMessage = config.inTheWorksMessage

module.exports = {
    name: "ready",
    once: true,
    async execute(client) {

        await mongoClient.connectToServer((err) => {
            if (err) {
                console.error('Failed to connect to MongoDB:', err);
                return;
            } else {
                console.log('Successfully connected to MongoDB.');
            }
        });

        console.log(`Successfully logged in as ${client.user.tag}`);

        const configPath = path.join(__dirname, '../env/config.json')

        const db = getDb();
        const settingsCollection = db.collection('settings');
        const charactersCollection = db.collection('characters');
        const importantCharactersCollection = db.collection('importantCharacters')

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

        const characterChannel = await client.channels.fetch("1207094079373049906");
        const characterMakingMessageId = config.characterMakingMessage
        let characterMessageExists = false;
        try {
            const message = await characterChannel.messages.fetch(characterMakingMessageId);
            characterMessageExists = true;
        } catch (error) {
        }

        if (!characterMessageExists) {
            const embed = new EmbedBuilder()
                .setDescription('Click the button below to submit your character!');
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('submitCharacter')
                        .setLabel('Submit Character')
                        .setStyle(ButtonStyle.Primary),
                );
            const sentMessage = await characterChannel.send({ embeds: [embed], components: [row] });
            config.characterMakingMessage = sentMessage.id;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        }

        const { currentPage } = await settingsCollection.findOne({ name: 'paginationSettings' }) || { currentPage: 0 };

        const totalCharacters = await charactersCollection.countDocuments();
        const totalPages = Math.ceil(totalCharacters / 25);

        const charactersData = await charactersCollection.find({})
            .sort({ name: 1 })
            .skip(currentPage * 25)
            .limit(25)
            .toArray();

        const memberFetchPromises = charactersData.map(character =>
            client.guilds.cache.get('903864074134249483') 
                .members.fetch(character.userId)
                .catch(err => console.log(`Failed to fetch member for userId: ${character.userId}`, err))
        );
        const members = await Promise.all(memberFetchPromises);

        const characterOptions = charactersData.map((character, index) => {
            const member = members[index];
            const displayName = member ? member.displayName : 'Unknown User';
            
            return {
                label: character.name,
                value: `${character.name}::${character.userId}`,
                description: `Player: ${displayName}`, 
            };
        });

        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('selectCharacter')
                    .setPlaceholder('Select a character')
                    .addOptions(characterOptions),
            );

        const rowButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('prevPage')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('nextPage')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= totalPages - 1),
            );
//edit all things after this other than the elements of a collection to be start with important. 
        const allCharactersChannel = await client.channels.fetch("905554690966704159"); 
        const allCharactersMessageId = config.allCharacterMessage
        let allCharacterMessageExists = false;

        try {
            const message = await allCharactersChannel.messages.fetch(allCharactersMessageId);
            allCharacterMessageExists = true;
        } catch (error) {
        }
        if (allCharacterMessageExists) {
            allCharactersMessage = await allCharactersChannel.messages.fetch(allCharactersMessageId);
            await allCharactersMessage.edit({ content: "Select a character to view more information:", components: [selectMenu, rowButtons] });
        } else {
            allCharactersMessage = await allCharactersChannel.send({ content: "Select a character to view more information:", components: [selectMenu, rowButtons] });
            config.allCharacterMessage = allCharactersMessage.id;
            fs.writeFileSync(path.join(__dirname, '../env/config.json'), JSON.stringify(config, null, 2));
        }

        const importantCharacterChannel = await client.channels.fetch("1207157109632802886");
        const importantCharacterMakingMessageId = config.importantCharacterMakingMessage
        let importantCharacterMessageExists = false;
        try {
            const message = await importantCharacterChannel.messages.fetch(importantCharacterMakingMessageId);
            importantCharacterMessageExists = true;
        } catch (error) {
        }

        if (!importantCharacterMessageExists) {
            const embed = new EmbedBuilder()
                .setDescription('Click the button below to submit your character!');
            const importantRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('submitImportantCharacter')
                        .setLabel('Submit Character')
                        .setStyle(ButtonStyle.Primary),
                );
            const sentImportantMessage = await importantCharacterChannel.send({ embeds: [embed], components: [importantRow] });
            config.importantCharacterMakingMessage = sentImportantMessage.id;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        }

        const { currentImportantPage } = await settingsCollection.findOne({ name: 'paginationSettings' }) || { importantCurrentPage: 0 };

        const totalImportantCharacters = await importantCharactersCollection.countDocuments();
        const totalImportantPages = Math.ceil(totalImportantCharacters / 25);

        const importantCharactersData = await importantCharactersCollection.find({})
            .sort({ name: 1 })
            .skip(currentImportantPage * 25)
            .limit(25)
            .toArray();

            const importantMemberFetchPromises = importantCharactersData.map(character =>
                client.guilds.cache.get('903864074134249483') 
                    .members.fetch(character.userId)
                    .catch(err => console.log(`Failed to fetch member for userId: ${character.userId}`, err))
            );
            const importantMembers = await Promise.all(importantMemberFetchPromises);
    
        const importantCharacterOptions = importantCharactersData.map((character, index) => {
            const member = importantMembers[index];
            const displayName = member ? member.displayName : 'Unknown User';
            
            return {
                label: character.name,
                value: `${character.name}::${character.userId}`,
                description: `Player: ${displayName}`, 
            };
        });

        const selectImportantMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('selectImportantCharacter')
                    .setPlaceholder('Select a character')
                    .addOptions(importantCharacterOptions),
            );

        const rowImportantButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('prevImportantPage')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('nextImportantPage')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= totalPages - 1),
            );

        const allImportantCharactersChannel = await client.channels.fetch("1207179211845140521");
        const allImportantCharactersMessageId = config.allImportantCharacterMessage
        let allImportantCharacterMessageExists = false;

        try {
            const message = await allImportantCharactersChannel.messages.fetch(allImportantCharactersMessageId);
            allImportantCharacterMessageExists = true;
        } catch (error) {
        }
        if (allImportantCharacterMessageExists) {
            allImportantCharactersMessage = await allImportantCharactersChannel.messages.fetch(allImportantCharactersMessageId);
            await allImportantCharactersMessage.edit({ content: "Select a character to view more information:", components: [selectImportantMenu, rowImportantButtons] });
        } else {
            allImportantCharactersMessage = await allImportantCharactersChannel.send({ content: "Select a character to view more information:", components: [selectImportantMenu, rowImportantButtons] });
            config.allImportantCharacterMessage = allImportantCharactersMessage.id;
            fs.writeFileSync(path.join(__dirname, '../env/config.json'), JSON.stringify(config, null, 2));
        }
    }
}
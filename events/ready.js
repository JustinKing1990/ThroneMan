const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../mongoClient');
const ensureMessagePosted = require('../helpercommands/postTrackedMessage')
const mongoClient = require('../mongoClient')
const config = require('../env/config.json');
const interactioncreate = require('./interactioncreate');
const changelogMessage = config.changelogMessage
const inTheWorksMessage = config.inTheWorksMessage

async function updateChangelogMessage(client) {
    const channelId = '1031376354974912633'; // Changelog channel ID
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'changelogMessage'; // Key in your config.json that stores the changelog message ID
    const version = require('../package.json');
    const changelogData = require('../changelog.json');
    const footerMessage = JSON.stringify(changelogData.NewChanges.footer).replace(/\[/gmi, "").replace(/\]/gmi, "").replace(/"/gmi, "");
    let messageTitleArray = changelogData.NewChanges.Changes.map(change => change.title);
    let messageArray = changelogData.NewChanges.Changes.map(change => change.text);
    const changeLogEmbed = new EmbedBuilder()
        .setColor("Aqua")
        .setTitle(`Change Log ${version.version}`)
        .setFooter({ text: footerMessage });
    messageTitleArray.forEach((title, index) => {
        changeLogEmbed.addFields({ name: title, value: messageArray[index] });
    });
    await ensureMessagePosted(client, channelId, configPath, messageConfigKey, { embeds: [changeLogEmbed] });
}

async function updateInTheWorksMessage(client) {
    const channelId = '1031582807279030343'; // In The Works channel ID
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'inTheWorksMessage'; // Key in your config.json that stores this message ID
    const inTheWorksData = require('../intheworks.json');
    const footerMessage = JSON.stringify(inTheWorksData.NewFeatures.footer).replace(/\[/gmi, "").replace(/\]/gmi, "").replace(/"/gmi, "");
    const inTheWorksEmbed = new EmbedBuilder()
        .setColor("Purple")
        .setTitle("What I'm working on")
        .setFooter({ text: footerMessage });
    inTheWorksData.NewFeatures.intheworks.forEach(feature => {
        inTheWorksEmbed.addFields({ name: feature.title, value: feature.text });
    });
    await ensureMessagePosted(client, channelId, configPath, messageConfigKey, { embeds: [inTheWorksEmbed] });
}

async function updateCharacterSubmissionMessage(client) {
    const channelId = "1207094079373049906"; // Character submission channel ID
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'characterMakingMessage'; // Key in your config.json that stores this message ID
    const embed = new EmbedBuilder()
        .setDescription('Click the button below to submit your character!');
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('submitCharacter')
                .setLabel('Submit Character')
                .setStyle(ButtonStyle.Primary),
        );
    await ensureMessagePosted(client, channelId, configPath, messageConfigKey, { embeds: [embed], components: [row] });
}

async function updateLoreSubmissionMessage(client) {
    const channelId = "1207323739163983906"; 
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'createLoreMessageId'; 
    const embed = new EmbedBuilder()
        .setDescription('Click the button below to create some lore!');
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('submitLore')
                .setLabel('Submit Lore')
                .setStyle(ButtonStyle.Primary),
        );
    await ensureMessagePosted(client, channelId, configPath, messageConfigKey, { embeds: [embed], components: [row] });
}

async function updateImportantCharacterSubmissionMessage(client) {
    const channelId = "1207157109632802886"; // Important character submission channel ID
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'importantCharacterMakingMessage'; // Key in config.json
    const embed = new EmbedBuilder()
        .setDescription('Click the button below to submit your important character!');
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('submitImportantCharacter')
                .setLabel('Submit Important Character')
                .setStyle(ButtonStyle.Primary),
        );
    await ensureMessagePosted(client, channelId, configPath, messageConfigKey, { embeds: [embed], components: [row] });
}

async function updateAllCharactersMessage(client, charactersCollection, settingsCollection) {
    const channelId = "905554690966704159"; // All characters channel ID
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'allCharacterMessage'; // Key in config.json
    const { currentPage } = await settingsCollection.findOne({ name: 'paginationSettings' }) || { currentPage: 0 };
    const totalCharacters = await charactersCollection.countDocuments();
    const totalPages = Math.ceil(totalCharacters / 25);
    const charactersData = await charactersCollection.find({})
        .sort({ name: 1 })
        .skip(currentPage * 25)
        .limit(25)
        .toArray();

        const importantMemberFetchPromises = charactersData.map(character =>
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

    // Generate selectMenu for characters
    const selectMenu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('selectCharacter')
                .setPlaceholder('Select a character')
                .addOptions(charactersData.map(character => ({
                    label: character.name,
                    description: `Character ID: ${character._id.toString().substr(0, 18)}`, // Ensure the description is not too long
                    value: character._id.toString(),
                }))),
        );

    // Generate rowButtons for pagination
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

    await ensureMessagePosted(client, channelId, configPath, messageConfigKey, { components: [selectMenu, rowButtons] });
}

async function updateAllImportantCharactersMessage(client, charactersCollection, settingsCollection) {
    const channelId = "1207179211845140521"; // All characters channel ID
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'allImportantCharacterMessage'; // Key in config.json
    const { currentPage } = await settingsCollection.findOne({ name: 'paginationSettings' }) || { importantCurrentPage: 0 };
    const totalCharacters = await charactersCollection.countDocuments();
    const totalPages = Math.ceil(totalCharacters / 25);
    const charactersData = await charactersCollection.find({})
        .sort({ name: 1 })
        .skip(currentPage * 25)
        .limit(25)
        .toArray();

        const importantMemberFetchPromises = charactersData.map(character =>
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


    // Generate selectMenu for characters
    const selectMenu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('selectImportantCharacter')
                .setPlaceholder('Select a character')
                .addOptions(charactersData.map(character => ({
                    label: character.name,
                    description: `Character ID: ${character._id.toString().substr(0, 18)}`, // Ensure the description is not too long
                    value: character._id.toString(),
                }))),
        );

    // Generate rowButtons for pagination
    const rowButtons = new ActionRowBuilder()
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

    await ensureMessagePosted(client, channelId, configPath, messageConfigKey, { components: [selectMenu, rowButtons] });
}

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

        const db = getDb();
        const settingsCollection = db.collection('settings');
        const charactersCollection = db.collection('characters');
        const importantCharactersCollection = db.collection('importantCharacters')
        
        // Use the functions to handle message updates
        await updateChangelogMessage(client);
        await updateInTheWorksMessage(client);
        await updateCharacterSubmissionMessage(client);
        await updateImportantCharacterSubmissionMessage(client);
        
        // Pass the necessary collection references to these functions
        await updateAllCharactersMessage(client, charactersCollection, settingsCollection);
        await updateAllImportantCharactersMessage(client, importantCharactersCollection, settingsCollection);


    }
}
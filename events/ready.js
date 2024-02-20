const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../mongoClient');
const ensureMessagePosted = require('../helpercommands/postTrackedMessage')
const updateListMessage = require('../helpercommands/updateListMessage')
const mongoClient = require('../mongoClient')
const config = require('../env/config.json');
const interactioncreate = require('./interactioncreate');
const changelogMessage = config.changelogMessage
const inTheWorksMessage = config.inTheWorksMessage
const { execSync } = require('child_process');

async function getLatestGitCommit() {
    try {
        const commitMessage = execSync('git log -1 --pretty=%B').toString().trim();
        return commitMessage;
    } catch (error) {
        console.error('Error fetching latest git commit:', error);
        return null;
    }
}

async function updateChangelog(commitMessage) {
    const changelogPath = path.join(__dirname, '../changelog.json');
    const changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    let commitMessages = commitMessage.split('\n').filter(line => line.trim());
    commitMessages = commitMessages.filter(commit => !commitMessages.includes("Automated update: version bump and changelog update"))
    let updateMade = false;

    commitMessages.forEach(message => {
        if (!changelog.NewChanges.Changes.some(change => change.text === message)) {
            changelog.NewChanges.Changes.push({ title: "New Update", text: message });
            updateMade = true;
        }
    });

    changelog.NewChanges.Changes = changelog.NewChanges.Changes.slice(-5);

    if (updateMade) {
        const versionParts = packageJson.version.split('.');
        versionParts[2] = parseInt(versionParts[2], 10) + 1;
        packageJson.version = versionParts.join('.');

        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }

    fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 4));
}

async function commitUpdates() {
    try {
        const projectRoot = path.join(__dirname, '..'); 
        const status = execSync('git status --porcelain').toString();

        if (!status) {
            console.log('No changes to commit.');
            return;
        }

        execSync('git add package.json changelog.json', { cwd: projectRoot });

        execSync('git commit -m "Automated update: version bump and changelog update"', { cwd: projectRoot });

        execSync('git push', { cwd: projectRoot });
    } catch (error) {
        console.error('Error committing updates:', error);
    }
}

async function updateChangelogMessage(client) {
    const channelId = '1031376354974912633';
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'changelogMessage';
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
    const channelId = '1031582807279030343';
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'inTheWorksMessage';
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
    const channelId = "1207094079373049906";
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'characterMakingMessage';
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

async function updateBestiarySubmissionMessage(client) {
    const channelId = "1209518924757209108";
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'createBestiaryMessageId';
    const embed = new EmbedBuilder()
        .setDescription('Click the button below to submit your beast!');
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('submitBeast')
                .setLabel('Submit Beast')
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
    const channelId = "1207157109632802886";
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'importantCharacterMakingMessage';
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
    const channelId = "905554690966704159";
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'allCharacterMessage';
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

    const importantCharacterOptions = charactersData.map((character, index) => {
        const member = importantMembers[index];
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
                .addOptions(importantCharacterOptions),
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

    await ensureMessagePosted(client, channelId, configPath, messageConfigKey, { components: [selectMenu, rowButtons] });
}

async function updateAllImportantCharactersMessage(client, charactersCollection, settingsCollection) {
    const channelId = "1207179211845140521";
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'allImportantCharacterMessage';
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

    const importantCharacterOptions = charactersData.map((character, index) => {
        const member = importantMembers[index];
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
                .setCustomId('selectImportantCharacter')
                .setPlaceholder('Select a character')
                .addOptions(importantCharacterOptions),
        );


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

async function updateAllLoreMessage(client, loreCollection, settingsCollection) {
    const channelId = "1207322800424091668";
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'loreMessageId';
    const { currentPage } = await settingsCollection.findOne({ name: 'paginationSettings' }) || { loreCurrentPage: 0 };
    const totalLore = await loreCollection.countDocuments();
    const totalPages = Math.ceil(totalLore / 25);
    const loreData = await loreCollection.find({})
        .sort({ name: 1 })
        .skip(currentPage * 25)
        .limit(25)
        .toArray();

    const loreOptions = loreData.map((lore, index) => {
        return {
            label: lore.name,
            value: `${lore.name}`
        };
    });


    const selectMenu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('selectLore')
                .setPlaceholder('Select a lore')
                .addOptions(loreData.map(lore => ({
                    label: lore.name,
                    value: lore.name,
                }))),
        );


    const rowButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('prevLorePage')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('nextLorePage')
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage >= totalPages - 1),
        );

    await ensureMessagePosted(client, channelId, configPath, messageConfigKey, { components: [selectMenu, rowButtons] });
}
async function updateAllBeastMessage(client, beastCollection, settingsCollection) {
    const channelId = "1209518814295892089";
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'bestiaryMessageId';
    const { currentPage } = await settingsCollection.findOne({ name: 'paginationSettings' }) || { beastCurrentPage: 0 };
    const totalBeasts = await beastCollection.countDocuments();
    const totalPages = Math.ceil(totalLore / 25);
    const loreData = await loreCollection.find({})
        .sort({ name: 1 })
        .skip(currentPage * 25)
        .limit(25)
        .toArray();

    const loreOptions = loreData.map((lore, index) => {
        return {
            label: lore.name,
            value: `${lore.name}`
        };
    });


    const selectMenu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('selectLore')
                .setPlaceholder('Select a lore')
                .addOptions(loreData.map(lore => ({
                    label: lore.name,
                    value: lore.name,
                }))),
        );


    const rowButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('prevLorePage')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('nextLorePage')
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
        const loreCollection = db.collection('lore');
        const beastCollection = db.collection('bestiary')

        const commitMessage = await getLatestGitCommit();
        if (commitMessage) {
            await updateChangelog(commitMessage);
        }
        await updateChangelogMessage(client);
        await commitUpdates();
        await updateInTheWorksMessage(client);
        await updateCharacterSubmissionMessage(client);
        await updateImportantCharacterSubmissionMessage(client);
        await updateLoreSubmissionMessage(client);
        await updateBestiarySubmissionMessage(client);

        await updateListMessage(client,null, charactersCollection, settingsCollection, config.allCharacterChannelId, config.allCharactersMessageId, "Character")
        await updateListMessage(client, null, importantCharactersCollection, settingsCollection, config.allImportantCharacterChannelId, config.allImportantCharacterMessage, "ImportantCharacter")
        await updateListMessage(client, null, loreCollection, settingsCollection, config.loreChannelId, config.loreMessageId, "Lore")
       
    }
}
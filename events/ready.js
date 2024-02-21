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
        await updateListMessage(client, null, beastCollection, settingsCollection, config.bestiaryChannelId, config.bestiaryMessageId, "Beast") 
    }
}
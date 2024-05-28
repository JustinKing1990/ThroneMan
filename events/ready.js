const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../mongoClient');
const ensureMessagePosted = require('../helpercommands/postTrackedMessage')
const updateListMessage = require('../helpercommands/updateListMessage')
const updateSubmissionMessage = require('../helpercommands/updateSubmissionMessage')
const mongoClient = require('../mongoClient')
const config = require('../env/config.json');
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
    const messageConfigKey = config.changelogMessage;
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
    const messageConfigKey = config.inTheWorksMessage;
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
        await updateSubmissionMessage(client, null, config.characterMakingChannelId, config.characterMakingMessage, "Character")
        await updateSubmissionMessage(client, null, config.importantCharacterMakingChannelId, config.importantCharacterMakingMessage, "ImportantCharacter")
        await updateSubmissionMessage(client, null, config.createLoreChannelId, config.createLoreMessageId, "Lore")
        await updateSubmissionMessage(client, null, config.createBeastChannelId, config. createBestiaryMessageId, "Beast")

        await updateListMessage(client, null, charactersCollection, settingsCollection, config.allCharacterChannelId, config.allCharactersMessageId, "Character")
        await updateListMessage(client, null, importantCharactersCollection, settingsCollection, config.allImportantCharacterChannelId, config.allImportantCharacterMessage, "ImportantCharacter")
        await updateListMessage(client, null, loreCollection, settingsCollection, config.loreChannelId, config.loreMessageId, "Lore")
        await updateListMessage(client, null, beastCollection, settingsCollection, config.bestiaryChannelId, config.bestiaryMessageId, "Beast") 
    }
}
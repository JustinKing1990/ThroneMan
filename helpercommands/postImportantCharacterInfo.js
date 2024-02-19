const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../mongoClient');

async function postCharacterInfo(interaction, client, characterName) {
    const db = getDb();
    const charactersCollection = db.collection('importantCharacter');

    
    const characterData = await charactersCollection.findOne({ userId: interaction.user.id, name: characterName });
    if (!characterData) {
        console.error('No character data found for the user.');
        await interaction.followUp({ content: 'No character data found. Please try again.', ephemeral: true });
        return;
    }

    let messageContent = `Character Information for ${interaction.user.username}:\n`;
    messageContent += `Name: ${characterData.name || 'N/A'}\n`;
    messageContent += `Title: ${characterData.title || 'N/A'}\n`;
    messageContent += `Gender: ${characterData.gender || 'N/A'}\n`;
    messageContent += `Age: ${characterData.age || 'N/A'}\n`;
    messageContent += `Birthplace: ${characterData.birthplace || 'N/A'}\n`;
    messageContent += `Height: ${characterData.height || 'N/A'}\n`;
    messageContent += `Species: ${characterData.species || 'N/A'}\n`;
    messageContent += `Eye Color: ${characterData.eyecolor || 'N/A'}\n`;  
    messageContent += `Hair Color: ${characterData.haircolor || 'N/A'}\n`;
    messageContent += `Appearance: ${characterData.appearance || 'N/A'}\n`;
    messageContent += `Weapons: ${characterData.weapons || 'N/A'}\n`;
    messageContent += `Armor: ${characterData.armor || 'N/A'}\n`;
    messageContent += `Beliefs: ${characterData.beliefs || 'N/A'}\n`;
    messageContent += `Powers: ${characterData.powers || 'N/A'}\n`;
    messageContent += `Backstory:\n`;
    characterData.backstory.forEach((element, index) => {
        messageContent += `${element}\n`;
    });
    const row = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
            .setCustomId(`approveCharacter_${characterData.userId}_${characterData.name}`)
            .setLabel('Approve')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`denyCharacter_${characterData.userId}_${characterData.name}`)
            .setLabel('Deny')
            .setStyle(ButtonStyle.Danger),
    );

const targetChannel = await interaction.client.channels.fetch("1206393672271134770");
let startIndex = 0;
const chunkSize = 1900; // Discord's character limit per message
const sentMessagesIds = [];

// Process and send message in chunks if necessary
while (startIndex < messageContent.length) {
    const endIndex = Math.min(startIndex + chunkSize, messageContent.length);
    const chunk = messageContent.substring(startIndex, endIndex);
    const isLastChunk = endIndex >= messageContent.length;

    const messageOptions = {
        content: chunk,
        components: isLastChunk ? [row] : [],
    };

    // Attach images in the last chunk
    if (isLastChunk && imageUrls.length > 0) {
        messageOptions.files = imageUrls;
    }

    const sentMessage = await targetChannel.send(messageOptions);
    sentMessagesIds.push(sentMessage.id);

    startIndex += chunkSize; // Prepare for the next chunk
}

// Update the database with the message IDs for future reference
await charactersCollection.updateOne(
    { userId: interaction.user.id, name: characterName },
    { $set: { messageIds: sentMessagesIds } }
);

// Optionally handle the image URLs (e.g., storing them for approval process)
if (imageUrls.length > 0) {
    // Example: Update document with image URLs for approval usage
    await charactersCollection.updateOne(
        { userId: interaction.user.id, name: characterName },
        { $addToSet: { imageUrls: { $each: imageUrls } } }
    );
}
}

module.exports = postImportantCharacterInfo;
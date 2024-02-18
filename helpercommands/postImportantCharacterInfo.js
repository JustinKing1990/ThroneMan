const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../mongoClient');

async function postCharacterInfo(interaction, client, characterName) {
    const db = getDb();
    const charactersCollection = db.collection('importantCharacter');

    
    const characterData = await charactersCollection.findOne({ userId: interaction.user.id, name: characterName });
    if (!characterData) {
        console.log('No character data found for the user.');
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
                .setCustomId(`approveImportantCharacter_${characterData.userId}_${characterData.name}`)
                .setLabel('Approve')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`denyImportantCharacter_${characterData.userId}_${characterData.name}`)
                .setLabel('Deny')
                .setStyle(ButtonStyle.Danger),
        );

    const targetChannel = await interaction.client.channels.fetch("1207157063357177947");
    let startIndex = 0;
    const chunkSize = 1900; 
    const sentMessagesIds = [];

    const numChunks = Math.ceil(messageContent.length / chunkSize);
    for (let i = 0; i < numChunks; i++) {
        const endIndex = startIndex + chunkSize;
        const chunk = messageContent.substring(startIndex, endIndex);

        const sentMessage = await targetChannel.send({
            content: chunk,
            components: i === numChunks - 1 ? [row] : []
        });

        sentMessagesIds.push(sentMessage.id);

        startIndex += chunkSize;
    }

    await charactersCollection.updateOne(
        {
            userId: interaction.user.id,
            name: characterName
        },
        { $set: { messageIds: sentMessagesIds } }
    );
}

module.exports = postCharacterInfo;

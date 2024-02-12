const { EmbedBuilder } = require('discord.js');
const { getDb } = require('../mongoClient');

const splitTextIntoFields = (text, maxLength = 1024) => {
    let parts = [];
    while (text.length) {
        let part = text.substring(0, maxLength);
        text = text.substring(maxLength);
        parts.push(part);
    }
    return parts;
};

const createEmbeds = (character) => {
    let embeds = [new EmbedBuilder().setColor('#0099ff')];
    let currentEmbed = embeds[0];
    let fieldCount = 0;

    const addFieldToEmbed = (name, values) => {
        values.forEach((value, index) => {
            if (fieldCount >= 25) {
                currentEmbed = new EmbedBuilder().setColor('#0099ff');
                embeds.push(currentEmbed);
                fieldCount = 0;
            }
            let fieldName = index === 0 ? name : `${name} (cont.)`;
            currentEmbed.addFields({ name: fieldName, value: value, inline: false });
            fieldCount++;
        });
    };


    const characterDetails = {
        'Age': [character.age || 'Unknown'],
        'Birthplace': [character.birthplace || 'Unknown'],
        'Gender': [character.gender || 'Unknown'],
        'Title': [character.title || 'None'],
        'Appearance': splitTextIntoFields(character.appearance || 'Not described', 1024),
        'Eye Color': [character.eyecolor || 'Unknown'],
        'Hair Color': [character.haircolor || 'Unknown'],
        'Height': [character.height || 'Unknown'],
        'Species': [character.species || 'Unknown'],
        'Armor': splitTextIntoFields(character.armor || 'Not described', 1024),
        'Beliefs': splitTextIntoFields(character.beliefs || 'None', 1024),
        'Powers': splitTextIntoFields(character.powers || 'None', 1024),
        'Weapons': splitTextIntoFields(character.weapons || 'None', 1024)
    };

    Object.entries(characterDetails).forEach(([name, value]) => {
        addFieldToEmbed(name, value);
    });

    return embeds;
};

module.exports = async (interaction, client) => {
    const db = getDb();
    const charactersCollection = db.collection('characters');
    const selectedCharacterId = interaction.values[0];

    try {
        const character = await charactersCollection.findOne({ name: selectedCharacterId });
        if (!character) {
            await interaction.reply({ content: 'Character not found.', ephemeral: true });
            return;
        }

        const embeds = createEmbeds(character);
        await interaction.reply({ embeds: [embeds.shift()], ephemeral: true });
        for (let embed of embeds) {
            await interaction.followUp({ embeds: [embed], ephemeral: true });
        }

        // Handle Backstory with continuous part numbering
        if (character.backstory && character.backstory.length) {
            let partNumber = 1; // Initialize a counter for backstory parts
            for (let story of character.backstory) {
                const splitStory = splitTextIntoFields(story, 1024);
                for (let part of splitStory) {
                    await interaction.followUp({ content: `**Backstory Part ${partNumber}**\n${part}`, ephemeral: true });
                    partNumber++; // Increment the part number for each split part
                }
            }
        } else {
            // If no backstory is provided
            await interaction.followUp({ content: '**Backstory:** Not available', ephemeral: true });
        }
    } catch (error) {
        console.error('Error fetching character from the database:', error);
        await interaction.reply({ content: 'An error occurred while fetching character details.', ephemeral: true });
    }
};

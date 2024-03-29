const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const { getDb } = require('../../mongoClient');
const MAX_EMBED_CHAR_LIMIT = 6000;
const MAX_FIELD_VALUE_LENGTH = 1024;

const splitTextIntoFields = (text, maxLength = 1024) => {
    let parts = [];
    while (text.length) {
        if (text.length <= maxLength) {
            parts.push(text);
            break;
        }

        let lastSpaceIndex = text.substring(0, maxLength).lastIndexOf(' ');
        
        if (lastSpaceIndex === -1) lastSpaceIndex = maxLength;

        let part = text.substring(0, lastSpaceIndex);
        text = text.substring(lastSpaceIndex + 1); 
        parts.push(part);
    }
    return parts;
};

function calculateEmbedFieldsLength(fields) {
    return fields.reduce((acc, field) => acc + field.name.length + field.value.length, 0);
}

const createEmbeds = async (character, interaction, imageUrl) => {
    const guildMember = await interaction.guild.members.fetch(character.userId);
    let userName = guildMember.displayName;

    const embeds = [];
    let currentEmbed = new EmbedBuilder().setColor('#0099ff');
    let currentEmbedSize = 0;

    const addEmbed = () => {
        embeds.push(currentEmbed);
        currentEmbed = new EmbedBuilder().setColor('#0099ff');
        currentEmbedSize = 0;
    };

    if (imageUrl) {
        currentEmbed.setImage(imageUrl);
        
        currentEmbedSize += imageUrl.length;
    }

    const addFieldToEmbed = (name, values) => {
        values.forEach((value, index) => {
            const fieldName = index === 0 ? name : `${name} (cont.)`;
            const fieldSize = fieldName.length + value.length;

            
            if (currentEmbedSize + fieldSize > MAX_EMBED_CHAR_LIMIT || currentEmbed.data.fields?.length >= 25) {
                addEmbed(); 
            }

            currentEmbed.addFields({ name: fieldName, value: value, inline: false });
            currentEmbedSize += fieldSize;
        });
    };


    const characterDetails = {
        'Player': [userName || 'Unknown'],
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

    
    if (currentEmbed.data.fields.length > 0) {
        addEmbed();
    }

    return embeds;
};

async function fetchRandomImage(characterName, userId, interaction) {
    const targetChannelId = '1206381988559323166';
    const targetChannel = await interaction.client.channels.fetch(targetChannelId);
    const messages = await targetChannel.messages.fetch({ limit: 100 });

    const imageUrls = [];

    messages.forEach(message => {
        
        if (message.author.bot && message.embeds.length > 0) {
            const embed = message.embeds[0]; 

            
            const hasCharacterName = embed.fields && embed.fields.some(field => field.value.includes(characterName));
            const hasUserId = embed.fields && embed.fields.some(field => field.value.includes(userId));

            if (hasCharacterName && hasUserId) {
                
                message.attachments.forEach(attachment => {
                    if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                        imageUrls.push(attachment.url);
                    }
                });

                
                if (embed.image && embed.image.url) {
                    imageUrls.push(embed.image.url);
                }
            }
        }
    });

    
    
    return imageUrls.length > 0 ? imageUrls[Math.floor(Math.random() * imageUrls.length)] : null;
}



module.exports = async (interaction, client) => {
    const db = getDb();
    const charactersCollection = db.collection('importantCharacters');
    const [selectedCharacterId, userId] = interaction.values[0].split("::");
 console.log(selectedCharacterId);
    try {
        const character = await charactersCollection.findOne({ name: selectedCharacterId, userId });
        if (!character) {
            await interaction.reply({ content: 'Character not found.', ephemeral: true });
            return;
        }

        const randomImageUrl = await fetchRandomImage(selectedCharacterId, userId, interaction);
        const embeds = await createEmbeds(character, interaction, randomImageUrl);

        const userHasKickPermission = interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers);

        
        let components = [];
        if (userHasKickPermission) {
            const deleteButton = new ButtonBuilder()
                .setCustomId(`deleteImportantCharacter_${selectedCharacterId}_${userId}`) 
                .setLabel('Delete Character')
                .setStyle(ButtonStyle.Danger);
            components.push(new ActionRowBuilder().addComponents(deleteButton));
        }

        await interaction.reply({ embeds: [embeds.shift()], components: [], ephemeral: true });

        
        for (let embed of embeds) {
            await interaction.followUp({ embeds: [embed], ephemeral: true });
        }

        
        if (character.backstory && character.backstory.length) {
            let partNumber = 0;
            let totalParts = character.backstory.reduce((acc, story) => acc + splitTextIntoFields(story, 1024).length, 0);

            for (let story of character.backstory) {
                const splitStory = splitTextIntoFields(story, 1024);
                for (let part of splitStory) {
                    partNumber++;
                    let isLastPart = partNumber === totalParts;
                    await interaction.followUp({
                        content: `**Backstory Part ${partNumber}**\n${part}`,
                        ephemeral: true,
                        components: isLastPart ? components : [] 
                    });
                }
            }
        } else {
            
            if (embeds.length === 0 && userHasKickPermission) {
                await interaction.followUp({ content: '**Backstory:** Not available', ephemeral: true, components });
            }
        }
    } catch (error) {
        console.error('Error fetching character from the database:', error);
        await interaction.reply({ content: 'An error occurred while fetching character details.', ephemeral: true });
    }
};
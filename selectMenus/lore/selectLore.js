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
        // If there's no space, we have to split at maxLength to avoid an infinite loop
        if (lastSpaceIndex === -1) lastSpaceIndex = maxLength;

        let part = text.substring(0, lastSpaceIndex);
        text = text.substring(lastSpaceIndex + 1); // Start after the last space to avoid leading spaces
        parts.push(part);
    }
    return parts;
};

function calculateEmbedFieldsLength(fields) {
    return fields.reduce((acc, field) => acc + field.name.length + field.value.length, 0);
}

const createEmbeds = async (lore, interaction, imageUrl) => {

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
                addEmbed(); // Push current embed to the list and start a new one
            }

            currentEmbed.addFields({ name: fieldName, value: value, inline: false });
            currentEmbedSize += fieldSize;
        });
    };


    const loreDetails = {
        'Lore': [lore.name || 'Unknown']
    };

    
    Object.entries(loreDetails).forEach(([name, value]) => {
        addFieldToEmbed(name, value);
    });

    // Don't forget to add the last embed if it has content
    if (currentEmbed.data.fields.length > 0) {
        addEmbed();
    }

    return embeds;
};

async function fetchRandomImage(loreName, interaction) {
    const targetChannelId = '1207398646035910726'; // Update this with your actual target channel ID
    const targetChannel = await interaction.client.channels.fetch(targetChannelId);
    const messages = await targetChannel.messages.fetch({ limit: 100 });

    const imageUrls = [];

    messages.forEach(message => {
        if (message.author.bot && message.embeds.length > 0) {
            const embed = message.embeds[0];

            // Check for lore name in the embed fields
            const hasLoreName = embed.fields && embed.fields.some(field => field.name === "Lore Name" && field.value.includes(loreName));

            if (hasLoreName) {
                // Collect URLs from attachments if any
                message.attachments.forEach(attachment => {
                    if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                        imageUrls.push(attachment.url);
                    }
                });

                // Collect the main image URL of the embed if present
                if (embed.image && embed.image.url) {
                    imageUrls.push(embed.image.url);
                }
            }
        }
    });

    // Select a random one to return
    return imageUrls.length > 0 ? imageUrls[Math.floor(Math.random() * imageUrls.length)] : null;
}

module.exports = async (interaction, client) => {
    const db = getDb();
    const loreCollection = db.collection('lore');
    const [SelectedLoreId] = interaction.values[0].split("::");

    console.log('Selected lore:', SelectedLoreId)
 
    try {
        const lore = await loreCollection.findOne({ name: SelectedLoreId });
        if (!lore) {
            await interaction.reply({ content: 'Lore not found.', ephemeral: true });
            return;
        }

        const randomImageUrl = await fetchRandomImage(SelectedLoreId, interaction);
        const embeds = await createEmbeds(lore, interaction, randomImageUrl);

        const userHasKickPermission = interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers);

        
        let components = [];
        // if (userHasKickPermission) {
        //     const deleteButton = new ButtonBuilder()
        //         .setCustomId(`deleteCharacter_${selectedCharacterId}_${userId}`) 
        //         .setLabel('Delete Character')
        //         .setStyle(ButtonStyle.Danger);
        //     components.push(new ActionRowBuilder().addComponents(deleteButton));
        // }

        await interaction.reply({ embeds: [embeds.shift()], components: [], ephemeral: true });

        
        for (let embed of embeds) {
            await interaction.followUp({ embeds: [embed], ephemeral: true });
        }

        
        if (lore.info && lore.info.length) {
            let partNumber = 0;
            let totalParts =lore.info.reduce((acc, story) => acc + splitTextIntoFields(story, 1024).length, 0);

            for (let story of lore.info) {
                const splitStory = splitTextIntoFields(story, 1024);
                for (let part of splitStory) {
                    partNumber++;
                    let isLastPart = partNumber === totalParts;
                    await interaction.followUp({
                        content: `**Details Part ${partNumber}**\n${part}`,
                        ephemeral: true,
                        components: isLastPart ? components : [] 
                    });
                }
            }
        } else {
            
            if (embeds.length === 0 && userHasKickPermission) {
                await interaction.followUp({ content: '**Lore:** Not available', ephemeral: true, components });
            }
        }
    } catch (error) {
        console.error('Error fetching lore from the database:', error);
        await interaction.followUp({ content: 'An error occurred while fetching character details.', ephemeral: true });
    }
};
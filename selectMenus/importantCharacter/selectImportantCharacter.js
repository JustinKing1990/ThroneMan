const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require('discord.js');
const { getDb } = require('../../mongoClient');
const MAX_EMBED_CHAR_LIMIT = 6000;
const MAX_FIELD_VALUE_LENGTH = 1024;

const splitTextIntoFields = (text, maxLength = 1024) => {
  if (!text || text.length === 0) return [''];
  
  let parts = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      parts.push(remaining);
      break;
    }

    // Find a good split point
    let splitPoint = maxLength;
    
    // Try to split at paragraph break first
    const paragraphBreak = remaining.lastIndexOf('\n\n', maxLength);
    if (paragraphBreak > maxLength * 0.3) {
      splitPoint = paragraphBreak;
    } else {
      // Try to split at line break
      const lineBreak = remaining.lastIndexOf('\n', maxLength);
      if (lineBreak > maxLength * 0.3) {
        splitPoint = lineBreak;
      } else {
        // Try to split at sentence end
        const sentenceEnd = remaining.lastIndexOf('. ', maxLength);
        if (sentenceEnd > maxLength * 0.3) {
          splitPoint = sentenceEnd + 1;
        } else {
          // Last resort: split at space
          const lastSpace = remaining.lastIndexOf(' ', maxLength);
          if (lastSpace > maxLength * 0.3) {
            splitPoint = lastSpace;
          }
        }
      }
    }

    let part = remaining.substring(0, splitPoint).trim();
    remaining = remaining.substring(splitPoint).trim();
    
    // Fix broken markdown - count asterisks
    const asteriskCount = (part.match(/\*/g) || []).length;
    if (asteriskCount % 2 !== 0) {
      // Odd number of asterisks - formatting is broken
      // Find the last unmatched asterisk pattern and move it to next chunk
      const lastBoldStart = part.lastIndexOf('**');
      const lastItalicStart = part.lastIndexOf('*');
      
      if (lastBoldStart > lastItalicStart - 1 && lastBoldStart !== -1) {
        // Check if this bold marker is unclosed
        const afterBold = part.substring(lastBoldStart + 2);
        if (!afterBold.includes('**')) {
          remaining = part.substring(lastBoldStart) + ' ' + remaining;
          part = part.substring(0, lastBoldStart).trim();
        }
      } else if (lastItalicStart !== -1) {
        // Check if this italic marker is unclosed
        const afterItalic = part.substring(lastItalicStart + 1);
        if (!afterItalic.includes('*')) {
          remaining = part.substring(lastItalicStart) + ' ' + remaining;
          part = part.substring(0, lastItalicStart).trim();
        }
      }
    }
    
    if (part.length > 0) {
      parts.push(part);
    }
  }
  
  return parts.length > 0 ? parts : [''];
};

function calculateEmbedFieldsLength(fields) {
  return fields.reduce((acc, field) => acc + field.name.length + field.value.length, 0);
}

const createEmbeds = async (character, interaction) => {
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

  const addFieldToEmbed = (name, values) => {
    values.forEach((value, index) => {
      const fieldName = index === 0 ? name : `${name} (cont.)`;
      const fieldSize = fieldName.length + value.length;

      if (
        currentEmbedSize + fieldSize > MAX_EMBED_CHAR_LIMIT ||
        currentEmbed.data.fields?.length >= 25
      ) {
        addEmbed();
      }

      currentEmbed.addFields({ name: fieldName, value: value, inline: false });
      currentEmbedSize += fieldSize;
    });
  };

  const characterDetails = {
    Player: [userName || 'Unknown'],
    Age: [character.age || 'Unknown'],
    Birthplace: [character.birthplace || 'Unknown'],
    Gender: [character.gender || 'Unknown'],
    Title: [character.title || 'None'],
    Appearance: splitTextIntoFields(character.appearance || 'Not described', 1024),
    'Eye Color': [character.eyecolor || 'Unknown'],
    'Hair Color': [character.haircolor || 'Unknown'],
    Height: [character.height || 'Unknown'],
    Species: [character.species || 'Unknown'],
    Armor: splitTextIntoFields(character.armor || 'Not described', 1024),
    Beliefs: splitTextIntoFields(character.beliefs || 'None', 1024),
    Powers: splitTextIntoFields(character.powers || 'None', 1024),
    Weapons: splitTextIntoFields(character.weapons || 'None', 1024),
  };

  Object.entries(characterDetails).forEach(([name, value]) => {
    addFieldToEmbed(name, value);
  });

  if (currentEmbed.data.fields.length > 0) {
    addEmbed();
  }

  return embeds;
};

async function fetchRandomImage(characterName, userId, interaction, characterDoc = null) {
  // Helper to check if a Discord CDN URL is expired
  const isUrlExpired = (url) => {
    if (!url) return true;
    const match = url.match(/ex=([0-9a-f]+)/i);
    if (match) {
      const expiryTimestamp = parseInt(match[1], 16);
      return Date.now() / 1000 > expiryTimestamp;
    }
    return false; // No expiry param means it might be a permanent URL
  };
  
  // Helper to convert a Date to a Discord snowflake ID
  const dateToSnowflake = (date) => {
    const discordEpoch = 1420070400000n;
    const timestamp = BigInt(date.getTime());
    return String((timestamp - discordEpoch) << 22n);
  };
  
  // First check if character document has imageUrls stored
  if (characterDoc && characterDoc.imageUrls && characterDoc.imageUrls.length > 0) {
    // Filter out expired URLs
    const validUrls = characterDoc.imageUrls.filter(url => !isUrlExpired(url));
    if (validUrls.length > 0) {
      return validUrls[Math.floor(Math.random() * validUrls.length)];
    }
    // All URLs expired, fall through to channel search
  }
  
  try {
    const targetChannelId = '1206381988559323166';
    const targetChannel = await Promise.race([
      interaction.client.channels.fetch(targetChannelId).catch(() => null),
      new Promise((resolve) => setTimeout(() => resolve(null), 5000))
    ]);
    if (!targetChannel) return null;
    
    // Try to get character creation date for smarter searching
    let creationDate = null;
    if (characterDoc) {
      if (characterDoc.createdAt) {
        creationDate = new Date(characterDoc.createdAt);
      } else if (characterDoc._id && characterDoc._id.getTimestamp) {
        creationDate = characterDoc._id.getTimestamp();
      }
    }
    
    let messages = null;
    
    // If we have a creation date, search around that time
    if (creationDate) {
      const searchDate = new Date(creationDate.getTime() + 24 * 60 * 60 * 1000);
      const snowflakeId = dateToSnowflake(searchDate);
      messages = await Promise.race([
        targetChannel.messages.fetch({ limit: 100, before: snowflakeId }).catch(() => null),
        new Promise((resolve) => setTimeout(() => resolve(null), 5000))
      ]);
    }
    
    // Fallback to recent messages if date-based search fails
    if (!messages || messages.size === 0) {
      messages = await Promise.race([
        targetChannel.messages.fetch({ limit: 100 }).catch(() => null),
        new Promise((resolve) => setTimeout(() => resolve(null), 5000))
      ]);
    }
    
    if (!messages) return null;

  const imageUrls = [];

  messages.forEach((message) => {
    if (message.author.bot && message.embeds.length > 0) {
      const embed = message.embeds[0];

      const hasCharacterName =
        embed.fields && embed.fields.some((field) => field.value.includes(characterName));
      const hasUserId = embed.fields && embed.fields.some((field) => field.value.includes(userId));

      if (hasCharacterName && hasUserId) {
        message.attachments.forEach((attachment) => {
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

    // If we found fresh URLs, update the database
    if (imageUrls.length > 0 && characterDoc) {
      try {
        const db = getDb();
        await db.collection('importantCharacters').updateOne(
          { name: characterName, userId },
          { $set: { imageUrls: imageUrls } }
        );
      } catch (e) {
        // Non-fatal
      }
    }

    return imageUrls.length > 0 ? imageUrls[Math.floor(Math.random() * imageUrls.length)] : null;
  } catch (e) {
    return null;
  }
}

module.exports = async (interaction, _client) => {
  // Defer immediately to prevent timeout
  try {
    await interaction.deferReply({ flags: 64 });
  } catch (deferError) {
    return;
  }

  const db = getDb();
  const charactersCollection = db.collection('importantCharacters');
  const [selectedCharacterId, userId] = interaction.values[0].split('::');

  // Reset the select menu to default (no selection) by updating the original message
  try {
    const originalMessage = interaction.message;
    if (originalMessage && originalMessage.components.length > 0) {
      // Clone components and reset placeholder
      const updatedComponents = originalMessage.components.map(row => {
        return ActionRowBuilder.from(row);
      });
      await interaction.message.edit({ components: updatedComponents });
    }
  } catch (err) {
    // Silently fail if we can't reset the menu
  }

  try {
    const character = await charactersCollection.findOne({ name: selectedCharacterId, userId });
    if (!character) {
      await interaction.editReply({ content: 'Character not found.' });
      return;
    }

    const randomImageUrl = await fetchRandomImage(selectedCharacterId, userId, interaction, character);
    const embeds = await createEmbeds(character, interaction);

    const userHasKickPermission = interaction.member.permissions.has(
      PermissionsBitField.Flags.KickMembers,
    );

    let components = [];
    let imageEmbed = null;
    if (randomImageUrl) {
      imageEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setImage(randomImageUrl);
    }
    if (userHasKickPermission) {
      const deleteButton = new ButtonBuilder()
        .setCustomId(`deleteImportantCharacter_${selectedCharacterId}_${userId}`)
        .setLabel('Delete Character')
        .setStyle(ButtonStyle.Danger);
      components.push(new ActionRowBuilder().addComponents(deleteButton));
    }

    await interaction.editReply({ embeds: [embeds.shift()], components: [] });

    for (let embed of embeds) {
      await interaction.followUp({ embeds: [embed], flags: [64] });
    }

    if (character.backstory && character.backstory.length) {
      // Normalize backstory to array
      const backstoryArray = Array.isArray(character.backstory) 
        ? character.backstory 
        : [character.backstory];
      
      // Combine all backstory parts into one string
      const fullBackstory = backstoryArray.map(s => String(s)).join('\n\n');
      const splitStory = splitTextIntoFields(fullBackstory, 4000);
      
      for (let i = 0; i < splitStory.length; i++) {
        const part = splitStory[i];
        
        const backstoryEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle(splitStory.length > 1 ? `Backstory (Part ${i + 1}/${splitStory.length})` : 'Backstory')
          .setDescription(part);
        
        await interaction.followUp({
          embeds: [backstoryEmbed],
          flags: [64],
        });
      }
    }

    // Send image at the end with delete button
    if (imageEmbed) {
      await interaction.followUp({
        embeds: [imageEmbed],
        flags: [64],
        components,
      });
    } else if (userHasKickPermission) {
      await interaction.followUp({
        content: '\u200b',
        flags: [64],
        components,
      });
    }
  } catch (error) {
    try {
      await interaction.editReply({
        content: 'An error occurred while fetching character details.',
      });
    } catch (e) {
      // Silent fail
    }
  }
};

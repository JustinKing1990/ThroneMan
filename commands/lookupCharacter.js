const {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require('discord.js');
const { getDb } = require('../mongoClient');

const MAX_EMBED_CHAR_LIMIT = 6000;

const splitTextIntoFields = (text, maxLength = 1024) => {
  if (!text || text.length === 0) return [''];
  let parts = [];
  let remaining = String(text);
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      parts.push(remaining);
      break;
    }
    let splitPoint = maxLength;
    const doubleNewlineIndex = remaining.lastIndexOf('\n\n', maxLength);
    if (doubleNewlineIndex > maxLength * 0.3) {
      splitPoint = doubleNewlineIndex;
    } else {
      const newlineIndex = remaining.lastIndexOf('\n', maxLength);
      if (newlineIndex > maxLength * 0.3) {
        splitPoint = newlineIndex;
      } else {
        const sentenceEndIndex = remaining.lastIndexOf('. ', maxLength);
        if (sentenceEndIndex > maxLength * 0.3) {
          splitPoint = sentenceEndIndex + 1;
        } else {
          const lastSpace = remaining.lastIndexOf(' ', maxLength);
          if (lastSpace > maxLength * 0.3) {
            splitPoint = lastSpace;
          }
        }
      }
    }
    let part = remaining.substring(0, splitPoint).trim();
    remaining = remaining.substring(splitPoint).trim();
    if (part.length === 0 && remaining.length > 0) {
      part = remaining.substring(0, maxLength);
      remaining = remaining.substring(maxLength);
    }
    if (part.length > 0) {
      parts.push(part);
    }
  }
  return parts.length > 0 ? parts : [''];
};

const createEmbeds = async (character, interaction, isImportant = false) => {
  let userName = 'Unknown';
  try {
    const guildMember = await Promise.race([
      interaction.guild.members.fetch(character.userId),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
    ]);
    userName = guildMember.displayName;
  } catch (e) {}

  const embeds = [];
  let currentEmbed = new EmbedBuilder().setColor(isImportant ? 0xffd700 : 0x0099ff);
  let currentEmbedSize = 0;

  const addEmbed = () => {
    embeds.push(currentEmbed);
    currentEmbed = new EmbedBuilder().setColor(isImportant ? 0xffd700 : 0x0099ff);
    currentEmbedSize = 0;
  };

  const addFieldToEmbed = (name, values) => {
    values.forEach((value, index) => {
      if (!value || value.length === 0) return;
      const fieldName = index === 0 ? name : `${name} (cont.)`;
      const fieldSize = fieldName.length + value.length;
      if (
        currentEmbedSize + fieldSize > MAX_EMBED_CHAR_LIMIT ||
        (currentEmbed.data.fields || []).length >= 25
      ) {
        addEmbed();
      }
      currentEmbed.addFields({ name: fieldName, value: value, inline: false });
      currentEmbedSize += fieldSize;
    });
  };

  const characterDetails = {
    Player: [userName || 'Unknown'],
    Name: [character.name || 'Unknown'],
    Age: [String(character.age || 'Unknown')],
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

  if ((currentEmbed.data.fields || []).length > 0) {
    addEmbed();
  }

  return embeds;
};

const getUserNameFromDisplayName = (displayName) => {
  if (!displayName) return null;
  const match = displayName.match(/\(([^)]+)\)$/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return displayName.trim();
};

const splitLongText = (text, maxLength = 4000) => {
  if (!text || text.length === 0) return [''];
  const chunks = [];
  let current = text;

  while (current.length > 0) {
    if (current.length <= maxLength) {
      chunks.push(current);
      break;
    }

    let splitIndex = current.lastIndexOf('\n\n', maxLength);
    if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
      splitIndex = current.lastIndexOf('\n', maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
      splitIndex = current.lastIndexOf('. ', maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
      splitIndex = current.lastIndexOf(' ', maxLength);
    }

    if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
      splitIndex = maxLength;
    }

    chunks.push(current.slice(0, splitIndex).trim());
    current = current.slice(splitIndex).trim();
  }

  return chunks;
};

async function fetchRandomImage(characterName, userId, interaction, characterDoc = null, isImportant = false) {
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
  // Discord epoch is 1420070400000 (2015-01-01)
  const dateToSnowflake = (date) => {
    const discordEpoch = 1420070400000n;
    const timestamp = BigInt(date.getTime());
    return String((timestamp - discordEpoch) << 22n);
  };
  
  // First, check if the character document already has imageUrls stored
  if (characterDoc && characterDoc.imageUrls && characterDoc.imageUrls.length > 0) {
    // Filter out expired URLs
    const validUrls = characterDoc.imageUrls.filter(url => !isUrlExpired(url));
    if (validUrls.length > 0) {
      return validUrls[Math.floor(Math.random() * validUrls.length)];
    }
    // All URLs expired, fall through to channel search
  }
  
  // Fallback: search the image channel (for older characters or expired URLs)
  const targetChannelId = '1206381988559323166';
  try {
    const targetChannel = await interaction.client.channels.fetch(targetChannelId).catch(() => null);
    if (!targetChannel) {
      return null;
    }
    
    // Try to get character creation date for smarter searching
    let creationDate = null;
    if (characterDoc) {
      if (characterDoc.createdAt) {
        creationDate = new Date(characterDoc.createdAt);
      } else if (characterDoc._id && characterDoc._id.getTimestamp) {
        // MongoDB ObjectId contains creation timestamp
        creationDate = characterDoc._id.getTimestamp();
      }
    }
    
    let messages = null;
    
    // If we have a creation date, search around that time
    if (creationDate) {
      // Add a small buffer (1 day after) to account for timing differences
      const searchDate = new Date(creationDate.getTime() + 24 * 60 * 60 * 1000);
      const snowflakeId = dateToSnowflake(searchDate);
      
      // Fetch messages before that snowflake (messages older than or around creation time)
      messages = await targetChannel.messages.fetch({ limit: 100, before: snowflakeId }).catch(() => null);
    }
    
    // Fallback to recent messages if date-based search fails
    if (!messages || messages.size === 0) {
      messages = await targetChannel.messages.fetch({ limit: 100 }).catch(() => null);
    }
    
    if (!messages) {
      return null;
    }

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
        const collectionName = isImportant ? 'importantCharacters' : 'characters';
        await db.collection(collectionName).updateOne(
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

const findMatchingCharacterInMessage = async (db, channelId, serverId, userId, messageContent) => {
  const charactersCollection = db.collection('characters');
  const importantCharactersCollection = db.collection('importantCharacters');

  // Query by userId only - serverId and channelId may not exist in older documents
  const characters = await charactersCollection
    .find({ userId })
    .toArray();

  const importantCharacters = await importantCharactersCollection
    .find({ userId })
    .toArray();

  const allCharacters = [
    ...importantCharacters.map((c) => ({ ...c, isImportant: true })),
    ...characters.map((c) => ({ ...c, isImportant: false })),
  ];

  if (allCharacters.length === 0) return null;

  const firstBoldMatch = messageContent.match(/\*\*(.+?)\*\*/);
  if (firstBoldMatch && firstBoldMatch[1]) {
    const boldName = firstBoldMatch[1].trim().toLowerCase();
    const boldMatch = allCharacters.find((character) => {
      const normalizedName = (character.name || '').toLowerCase();
      return normalizedName === boldName;
    });
    if (boldMatch) {
      return { character: boldMatch, isImportant: boldMatch.isImportant || false };
    }
  }

  for (const character of allCharacters) {
    const name = character.name || '';
    const charNameWords = name.toLowerCase().split(/\s+/);
    const charNamePattern = charNameWords.map((w) => `\\b${w}\\b`).join('\\s+');
    if (!charNamePattern) continue;
    const regex = new RegExp(charNamePattern, 'i');
    if (regex.test(messageContent)) {
      return { character, isImportant: character.isImportant || false };
    }
  }

  for (const character of allCharacters) {
    const name = character.name || '';
    const charNameWords = name.toLowerCase().split(/\s+/);
    const firstName = charNameWords[0];
    if (!firstName || firstName.length < 3) continue;
    const regex = new RegExp(`\\b${firstName}\\b`, 'i');
    if (regex.test(messageContent)) {
      return { character, isImportant: character.isImportant || false };
    }
  }

  return null;
};

const showCharacterSelectMenu = async (interaction, targetUserId, db) => {
  const charactersCollection = db.collection('characters');
  const importantCharactersCollection = db.collection('importantCharacters');

  // Query by userId only
  const characters = await charactersCollection
    .find({ userId: targetUserId })
    .toArray();

  const importantCharacters = await importantCharactersCollection
    .find({ userId: targetUserId })
    .toArray();

  const allCharacters = [
    ...characters.map((c) => ({ ...c, isImportant: false })),
    ...importantCharacters.map((c) => ({ ...c, isImportant: true })),
  ];

  if (allCharacters.length === 0) {
    await interaction.editReply({
      content: 'No characters found for this user in this channel.',
    });
    return;
  }

  allCharacters.sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  const options = allCharacters.slice(0, 25).map((character) => {
    // Add icon to indicate important vs regular
    const icon = character.isImportant ? '⭐' : '👤';
    let label = `${icon} ${character.name || 'Unknown'}`;
    // Discord limits label to 100 chars
    if (label.length > 100) {
      label = label.substring(0, 97) + '...';
    }
    
    return {
      label,
      value: `${character.isImportant ? 'important' : 'regular'}::${character.name}::${character.userId}`,
    };
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('lookupCharacterSelect')
    .setPlaceholder('Select a character...')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.editReply({
    content: 'Multiple characters found for this user. Please select one:',
    components: [row],
  });
};

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName('Lookup Character')
    .setType(ApplicationCommandType.Message),

  async execute(interaction, client) {
    if (!interaction.deferred && !interaction.replied) {
      try {
        await interaction.deferReply({ flags: [64] });
      } catch (deferError) {
        return;
      }
    }

    const db = getDb();
    if (!db) {
      await interaction.editReply({ content: 'Database connection error. Please try again.' });
      return;
    }

    const targetMessage = interaction.targetMessage;
    if (!targetMessage) {
      await interaction.editReply({ content: 'Could not find the target message.' });
      return;
    }

    if (targetMessage.author.bot) {
      await interaction.editReply({
        content: 'Cannot lookup characters for bot messages.',
      });
      return;
    }

    const targetUserId = targetMessage.author.id;
    const channelId = interaction.channel.id;
    const serverId = interaction.guild.id;

    try {
      let matchingResult = await findMatchingCharacterInMessage(
        db,
        channelId,
        serverId,
        targetUserId,
        (targetMessage.content || '').toLowerCase(),
      );

      // If no match in target message, search previous messages
      if (!matchingResult) {
        const messages = await interaction.channel.messages.fetch({ 
          limit: 50, 
          before: targetMessage.id 
        });
        
        // Filter to only this user's messages, sorted newest first
        const userMessages = messages
          .filter(m => m.author.id === targetUserId && !m.author.bot)
          .sort((a, b) => b.createdTimestamp - a.createdTimestamp);
        
        for (const [, msg] of userMessages) {
          const historyResult = await findMatchingCharacterInMessage(
            db,
            channelId,
            serverId,
            targetUserId,
            (msg.content || '').toLowerCase(),
          );
          if (historyResult) {
            matchingResult = historyResult;
            break;
          }
        }
      }

      if (matchingResult) {
        const { character, isImportant } = matchingResult;
        const embeds = await createEmbeds(character, interaction, isImportant);
        const randomImageUrl = await fetchRandomImage(character.name, character.userId, interaction, character, isImportant);

        const userHasKickPermission = interaction.member.permissions.has(
          PermissionsBitField.Flags.KickMembers,
        );

        // Check if the user is the character owner
        const isOwner = interaction.user.id === character.userId;

        let components = [];
        const actionButtons = [];

        // Edit button - only for the character owner (and only for regular characters)
        if (isOwner && !isImportant) {
          const editButton = new ButtonBuilder()
            .setCustomId(`editCharacter_${character.name}_${character.userId}`)
            .setLabel('Edit Character')
            .setStyle(ButtonStyle.Primary);
          actionButtons.push(editButton);
        }

        // Delete button - only for admins with kick permission
        if (userHasKickPermission) {
          const deleteButtonId = isImportant
            ? `deleteImportantCharacter_${character.name}_${character.userId}`
            : `deleteCharacter_${character.name}_${character.userId}`;
          const deleteButton = new ButtonBuilder()
            .setCustomId(deleteButtonId)
            .setLabel('Delete Character')
            .setStyle(ButtonStyle.Danger);
          actionButtons.push(deleteButton);
        }

        if (actionButtons.length > 0) {
          components.push(new ActionRowBuilder().addComponents(...actionButtons));
        }

        const typeLabel = isImportant ? '⭐ Important Character' : '👤 Character';
        const embedColor = isImportant ? '#FFD700' : '#0099ff';

        // Send first embed
        await interaction.editReply({ content: typeLabel, embeds: [embeds.shift()], components: [] });

        // Send remaining field embeds
        for (let embed of embeds) {
          await interaction.followUp({
            embeds: [embed],
            flags: [64],
          });
        }

        // Send backstory as separate embeds
        if (character.backstory && character.backstory.length) {
          const backstoryArray = Array.isArray(character.backstory) 
            ? character.backstory 
            : [character.backstory];
          
          const fullBackstory = backstoryArray.map(s => String(s)).join('\n\n');
          const splitStory = splitTextIntoFields(fullBackstory, 4000);
          
          for (let i = 0; i < splitStory.length; i++) {
            const part = splitStory[i];
            
            const backstoryEmbed = new EmbedBuilder()
              .setColor(embedColor)
              .setTitle(splitStory.length > 1 ? `Backstory (Part ${i + 1}/${splitStory.length})` : 'Backstory')
              .setDescription(part);
            
            await interaction.followUp({
              embeds: [backstoryEmbed],
              flags: [64],
            });
          }
        }

        // Send image at the end with delete button
        if (randomImageUrl) {
          const imageEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setImage(randomImageUrl);
          
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

        return;
      }

      const charactersCollection = db.collection('characters');
      const importantCharactersCollection = db.collection('importantCharacters');

      // Query by userId only
      const characters = await charactersCollection
        .find({ userId: targetUserId })
        .toArray();

      const importantCharacters = await importantCharactersCollection
        .find({ userId: targetUserId })
        .toArray();

      if (characters.length === 1 && importantCharacters.length === 0) {
        const character = characters[0];
        const embeds = await createEmbeds(character, interaction, false);
        const randomImageUrl = await fetchRandomImage(character.name, character.userId, interaction, character, false);
        const typeLabel = '👤 Character';
        const embedColor = '#0099ff';

        const userHasKickPermission = interaction.member.permissions.has(
          PermissionsBitField.Flags.KickMembers,
        );

        // Check if the user is the character owner
        const isOwner = interaction.user.id === character.userId;

        let components = [];
        const actionButtons = [];

        // Edit button - only for the character owner
        if (isOwner) {
          const editButton = new ButtonBuilder()
            .setCustomId(`editCharacter_${character.name}_${character.userId}`)
            .setLabel('Edit Character')
            .setStyle(ButtonStyle.Primary);
          actionButtons.push(editButton);
        }

        if (userHasKickPermission) {
          const deleteButton = new ButtonBuilder()
            .setCustomId(`deleteCharacter_${character.name}_${character.userId}`)
            .setLabel('Delete Character')
            .setStyle(ButtonStyle.Danger);
          actionButtons.push(deleteButton);
        }

        if (actionButtons.length > 0) {
          components.push(new ActionRowBuilder().addComponents(...actionButtons));
        }

        await interaction.editReply({ content: typeLabel, embeds: [embeds.shift()], components: [] });

        for (let embed of embeds) {
          await interaction.followUp({ embeds: [embed], flags: [64] });
        }

        if (character.backstory && character.backstory.length) {
          const backstoryArray = Array.isArray(character.backstory) ? character.backstory : [character.backstory];
          const fullBackstory = backstoryArray.map(s => String(s)).join('\n\n');
          const splitStory = splitTextIntoFields(fullBackstory, 4000);
          
          for (let i = 0; i < splitStory.length; i++) {
            const backstoryEmbed = new EmbedBuilder()
              .setColor(embedColor)
              .setTitle(splitStory.length > 1 ? `Backstory (Part ${i + 1}/${splitStory.length})` : 'Backstory')
              .setDescription(splitStory[i]);
            await interaction.followUp({ embeds: [backstoryEmbed], flags: [64] });
          }
        }

        if (randomImageUrl) {
          const imageEmbed = new EmbedBuilder().setColor(embedColor).setImage(randomImageUrl);
          await interaction.followUp({ embeds: [imageEmbed], flags: [64], components });
        } else if (userHasKickPermission) {
          await interaction.followUp({ content: '\u200b', flags: [64], components });
        }

        return;
      }

      if (importantCharacters.length === 1 && characters.length === 0) {
        const character = importantCharacters[0];
        const embeds = await createEmbeds(character, interaction, true);
        const randomImageUrl = await fetchRandomImage(character.name, character.userId, interaction, character, true);
        const typeLabel = '⭐ Important Character';
        const embedColor = '#FFD700';

        const userHasKickPermission = interaction.member.permissions.has(
          PermissionsBitField.Flags.KickMembers,
        );

        let components = [];
        if (userHasKickPermission) {
          const deleteButton = new ButtonBuilder()
            .setCustomId(`deleteImportantCharacter_${character.name}_${character.userId}`)
            .setLabel('Delete Character')
            .setStyle(ButtonStyle.Danger);
          components.push(new ActionRowBuilder().addComponents(deleteButton));
        }

        await interaction.editReply({ content: typeLabel, embeds: [embeds.shift()], components: [] });

        for (let embed of embeds) {
          await interaction.followUp({ embeds: [embed], flags: [64] });
        }

        if (character.backstory && character.backstory.length) {
          const backstoryArray = Array.isArray(character.backstory) ? character.backstory : [character.backstory];
          const fullBackstory = backstoryArray.map(s => String(s)).join('\n\n');
          const splitStory = splitTextIntoFields(fullBackstory, 4000);
          
          for (let i = 0; i < splitStory.length; i++) {
            const backstoryEmbed = new EmbedBuilder()
              .setColor(embedColor)
              .setTitle(splitStory.length > 1 ? `Backstory (Part ${i + 1}/${splitStory.length})` : 'Backstory')
              .setDescription(splitStory[i]);
            await interaction.followUp({ embeds: [backstoryEmbed], flags: [64] });
          }
        }

        if (randomImageUrl) {
          const imageEmbed = new EmbedBuilder().setColor(embedColor).setImage(randomImageUrl);
          await interaction.followUp({ embeds: [imageEmbed], flags: [64], components });
        } else if (userHasKickPermission) {
          await interaction.followUp({ content: '\u200b', flags: [64], components });
        }

        return;
      }

      if (characters.length === 0 && importantCharacters.length === 0) {
        await interaction.editReply({
          content: 'No characters found for this user in this channel.',
        });
        return;
      }

      await showCharacterSelectMenu(interaction, targetUserId, db);
    } catch (error) {
      try {
        await interaction.editReply({
          content: 'An error occurred while looking up the character.',
        });
      } catch (editError) {
        // Silent fail
      }
    }
  },
};

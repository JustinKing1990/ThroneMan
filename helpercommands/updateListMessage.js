const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const { getDb } = require('../mongoClient');
const ensureMessagePosted = require('../helpercommands/postTrackedMessage');
const mongoClient = require('../mongoClient');
const { appConfigPath } = require('../config');

async function generateOptions(discordObject, actionType, data, collection) {
  let options = [];
  const characterNameConversion = {
    characters: 'character',
    importantCharacters: 'importantCharacter',
    lore: 'lore',
    bestiary: 'bestiary',
    locations: 'location',
  };
  const collectionKey = characterNameConversion[collection.collectionName];
  const archiveCollectionName = `${collectionKey}Archive`;
  const collectionName = `${collection.collectionName}`;
  const db = getDb();
  const archiveCollection = db.collection(archiveCollectionName);
  const sourceCollection = db.collection(collectionName);

  // Strip markdown formatting for display labels
  function stripMarkdown(text) {
    if (!text) return text;
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold**
      .replace(/\*([^*]+)\*/g, '$1')       // *italic*
      .replace(/__([^_]+)__/g, '$1')       // __underline__
      .replace(/_([^_]+)_/g, '$1')         // _italic_
      .replace(/~~([^~]+)~~/g, '$1')       // ~~strikethrough~~
      .replace(/`([^`]+)`/g, '$1')         // `code`
      .replace(/\|\|([^|]+)\|\|/g, '$1')   // ||spoiler||
      .replace(/^[_*~`|]+|[_*~`|]+$/g, '') // Strip leading/trailing markdown chars
      .trim();
  }

  async function fetchGuildMember(guildId, userId) {
    let guild;
    if (discordObject.client) {
      guild = discordObject.client.guilds.cache.get(guildId);
    } else {
      guild = discordObject.guilds.cache.get(guildId);
    }
    if (!guild) throw new Error('Guild not found');
    try {
      return await guild.members.fetch(userId);
    } catch (err) {
      return null;
    }
  }

  async function moveToArchive(character) {
    try {
      await archiveCollection.insertOne(character);
      await sourceCollection.deleteOne({ userId: character.userId });
    } catch (err) {
      console.error(`Failed to move ${character.name} to archive:`, err);
    }
  }

  if (actionType === 'Character' || actionType === 'ImportantCharacter') {
    // Try to fetch member display names, but do not filter or archive if fetch fails.
    async function safeFetchMember(userId) {
      try {
        const guild = discordObject.client
          ? discordObject.client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
          : discordObject.guilds.cache.get(process.env.DISCORD_GUILD_ID);
        if (!guild) return null;
        return await guild.members.fetch(userId);
      } catch {
        return null;
      }
    }

    const members = await Promise.all(data.map((character) => safeFetchMember(character.userId)));

    for (let index = 0; index < data.length; index++) {
      const character = data[index];
      const member = members[index];
      // Strip markdown and truncate name to 25 chars max for Discord label limit
      const cleanName = stripMarkdown(character.name);
      const truncatedName =
        cleanName.length > 25 ? cleanName.substring(0, 22) + '...' : cleanName;
      // Include player display name when available, else show userId
      const description = member ? `Player: ${member.displayName}` : `User ID: ${character.userId}`;
      const truncatedDesc =
        description.length > 50 ? description.substring(0, 47) + '...' : description;

      options.push({
        label: truncatedName,
        value: `${character.name}::${character.userId}`,
        description: truncatedDesc,
      });
    }
  } else if (actionType === 'Lore' || actionType === 'Beast' || actionType === 'Location') {
    options = data.map((item) => {
      // Strip markdown and truncate name to 25 chars max for Discord label limit
      const cleanName = stripMarkdown(item.name);
      const truncatedName = cleanName.length > 25 ? cleanName.substring(0, 22) + '...' : cleanName;
      // Truncate value to 100 chars max for Discord value limit (keep original for lookup)
      const truncatedValue = item.name.length > 100 ? item.name.substring(0, 97) + '...' : item.name;
      // Add population as description for locations (strip markdown too)
      let description = '';
      if (actionType === 'Location' && item.population) {
        const cleanPop = stripMarkdown(item.population);
        description = cleanPop.length > 50 ? cleanPop.substring(0, 47) + '...' : cleanPop;
      }
      return {
        label: truncatedName,
        value: truncatedValue,
        ...(description && { description }),
      };
    });
  }

  return options;
}

async function updateListMessage(
  client = null,
  interaction = null,
  collection,
  settingsCollection,
  channelId,
  messageId,
  actionType,
) {
  const discordObject = interaction ? interaction.client : client;
  let customIdParts;
  let [action, userId, characterId] = [null, null, null];
  try {
    customIdParts = interaction.customId.split('_')[(action, userId, characterId)] = customIdParts;
  } catch {}
  const pageSettingMap = {
    Character: 'currentPage',
    ImportantCharacter: 'importantCurrentPage',
    Lore: 'loreCurrentPage',
    Beast: 'beastCurrentPage',
    Location: 'locationCurrentPage',
  };

  const settingKey = pageSettingMap[actionType];
  const settings = await settingsCollection.findOne({
    name: 'paginationSettings',
  });
  // Initialize settings if they don't exist for this type
  if (!settings || !(settingKey in settings)) {
    await settingsCollection.updateOne(
      { name: 'paginationSettings' },
      { $set: { [settingKey]: 0 } },
      { upsert: true }
    );
  }
  const currentPage = settings?.[settingKey] || 0;

  const totalEntries = await collection.countDocuments();
  const totalPages = Math.ceil(totalEntries / 25);
  const collectionData = await collection
    .find({})
    .sort({ name: 1 })
    .skip(currentPage * 25)
    .limit(25)
    .toArray();

  const options = await generateOptions(discordObject, actionType, collectionData, collection);

  const Description = {
    Character: 'character',
    ImportantCharacter: 'important character',
    Lore: 'lore',
    Beast: 'beast',
    Location: 'location',
  };

  const descriptionKey = Description[actionType];

  // If no options, just show navigation buttons
  let messageComponents = [];
  if (options.length === 0) {
    console.log(`No ${actionType} entries to display`);
    const paginationType = {
      Character: '',
      ImportantCharacter: 'Important',
      Lore: 'Lore',
      Beast: 'Beast',
      Location: 'Location',
    };
    const buttonType = paginationType[actionType] || '';

    messageComponents = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`prev${buttonType}Page`)
          .setLabel('Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`next${buttonType}Page`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      ),
    ];
  } else {
    // Validate options before creating menu
    const validatedOptions = options.filter((opt) => {
      if (!opt.label || opt.label.length < 1 || opt.label.length > 25) {
        return false;
      }
      if (opt.description && (opt.description.length < 1 || opt.description.length > 50)) {
        return false;
      }
      return true;
    });

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`select${actionType}`)
        .setPlaceholder(`Select the ${descriptionKey}`)
        .addOptions(validatedOptions),
    );

    const paginationType = {
      Character: '',
      ImportantCharacter: 'Important',
      Lore: 'Lore',
      Beast: 'Beast',
      Location: 'Location',
    };

    const buttonType = paginationType[actionType] || '';

    const rowButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`prev${buttonType}Page`)
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId(`next${buttonType}Page`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages - 1),
    );

    messageComponents = [selectMenu, rowButtons];
  }

  await ensureMessagePosted(client, channelId, appConfigPath, messageId, {
    components: messageComponents,
  });
}
module.exports = updateListMessage;

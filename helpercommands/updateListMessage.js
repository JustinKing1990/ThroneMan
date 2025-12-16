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
  };
  const collectionKey = characterNameConversion[collection.collectionName];
  const archiveCollectionName = `${collectionKey}Archive`;
  const collectionName = `${collection.collectionName}`;
  const db = getDb();
  const archiveCollection = db.collection(archiveCollectionName);
  const sourceCollection = db.collection(collectionName);

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
      // Truncate name to 25 chars max for Discord label limit
      const truncatedName =
        character.name.length > 25 ? character.name.substring(0, 22) + '...' : character.name;
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
  } else if (actionType === 'Lore' || actionType === 'Beast') {
    options = data.map((item) => {
      // Truncate name to 25 chars max for Discord label limit
      const truncatedName = item.name.length > 25 ? item.name.substring(0, 22) + '...' : item.name;
      return {
        label: truncatedName,
        value: `${item.name}`,
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
  };

  const settingKey = pageSettingMap[actionType];
  const settings = await settingsCollection.findOne({
    name: 'paginationSettings',
  });
  if (!settings || !(settingKey in settings)) {
    throw new Error(`Settings for ${settingKey} not found`);
  }
  const currentPage = settings[settingKey] || 0;

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

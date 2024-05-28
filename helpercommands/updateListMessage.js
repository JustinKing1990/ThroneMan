const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const { getDb } = require("../mongoClient");
const ensureMessagePosted = require("../helpercommands/postTrackedMessage");
const mongoClient = require("../mongoClient");
const config = require("../env/config.json");

async function generateOptions(discordObject, actionType, data, collection) {
  let options = [];
  const characterNameConversion = {
    characters: "character",
    importantCharacters: "importantCharacter",
    lore: "lore",
    bestiary: "bestiary",
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
    if (!guild) throw new Error("Guild not found");
    try {
      return await guild.members.fetch(userId);
    } catch (err) {
      console.log(`Failed to fetch member for userId: ${userId}`);
      return null;
    }
  }

  async function moveToArchive(character) {
    try {
      await archiveCollection.insertOne(character);
      await sourceCollection.deleteOne({ userId: character.userId });
    } catch (err) {
      console.log(`Failed to move ${character.name} to archive`, err);
    }
  }

  if (actionType === "Character" || actionType === "ImportantCharacter") {
    const memberFetchPromises = data.map((character) =>
      fetchGuildMember("903864074134249483", character.userId)
    );
    const members = await Promise.all(memberFetchPromises);

    for (let index = 0; index < data.length; index++) {
      const character = data[index];
      const member = members[index];
      if (member) {
        options.push({
          label: character.name,
          value: `${character.name}::${character.userId}`,
          description: `Player: ${member.displayName}`,
        });
      } else {
        await moveToArchive(character);
      }
    }
  } else if (actionType === "Lore" || actionType === "Beast") {
    options = data.map((item) => ({
      label: item.name,
      value: `${item.name}`,
    }));
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
  actionType
) {
  const discordObject = interaction ? interaction.client : client;
  let customIdParts;
  let [action, userId, characterId] = [null, null, null];
  try {
    customIdParts = interaction.customId.split("_")[
      (action, userId, characterId)
    ] = customIdParts;
  } catch {}
  let configPath;

  try {
    configPath = path.join(__dirname, "../env/config.json");
  } catch {
    configPath = path.join(__dirname, "../../env/config.json");
  }
  const pageSettingMap = {
    Character: "currentPage",
    ImportantCharacter: "importantCurrentPage",
    Lore: "loreCurrentPage",
    Beast: "beastCurrentPage",
  };

  const settingKey = pageSettingMap[actionType];
  const settings = await settingsCollection.findOne({
    name: "paginationSettings",
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

  const options = await generateOptions(
    discordObject,
    actionType,
    collectionData,
    collection
  );

  const Description = {
    Character: "character",
    ImportantCharacter: "important character",
    Lore: "lore",
    Beast: "beast",
  };

  const descriptionKey = Description[actionType];

  const selectMenu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`select${actionType}`)
      .setPlaceholder(`Select the ${descriptionKey}`)
      .addOptions(options)
  );

  const paginationType = {
    Character: "",
    ImportantCharacter: "Important",
    Lore: "Lore",
    Beast: "Beast",
  };

  const buttonType = paginationType[actionType] || "";

  const rowButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prev${buttonType}Page`)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId(`next${buttonType}Page`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages - 1)
  );
  
  await ensureMessagePosted(client, channelId, configPath, messageId, {
    components: [selectMenu, rowButtons],
  });
}
module.exports = updateListMessage;

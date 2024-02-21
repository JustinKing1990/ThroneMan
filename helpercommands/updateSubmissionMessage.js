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

async function updateSubmissionMessage(
  client = null,
  interaction = null,
  channelId,
  messageId,
  actionType
) {
    const discordObject = interaction ? interaction.client : client;
    let customIdParts 
    let [action, userId, characterId] = [null, null, null]
    try{
      customIdParts = interaction.customId.split("_")
      [action, userId, characterId] = customIdParts
    } catch{}
    let configPath;
  
    try {
      configPath = path.join(__dirname, "../env/config.json");
    } catch {
      configPath = path.join(__dirname, "../../env/config.json");
    }

    const Description = {
        Character: "character",
        ImportantCharacter: "important character",
        Lore: "lore",
        Beast: "beast",
      };
    
      const descriptionKey = Description[actionType];

  const embed = new EmbedBuilder().setDescription(
    `Click the button below to submit your ${descriptionKey}!`
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`submit${actionType}`)
      .setLabel(`Submit ${descriptionKey}`)
      .setStyle(ButtonStyle.Primary)
  );
  await ensureMessagePosted(client, channelId, configPath, messageId, {
    embeds: [embed],
    components: [row],
  });
}

module.exports = updateSubmissionMessage

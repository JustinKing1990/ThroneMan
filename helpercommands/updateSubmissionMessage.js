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

async function updateSubmissionMessage(
  client = null,
  interaction = null,
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
  const Description = {
    Character: 'character',
    ImportantCharacter: 'important character',
    Lore: 'lore',
    Beast: 'beast',
  };

  const descriptionKey = Description[actionType];

  const embed = new EmbedBuilder().setDescription(
    `Click the button below to submit your ${descriptionKey}!`,
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`submit${actionType}`)
      .setLabel(`Submit ${descriptionKey}`)
      .setStyle(ButtonStyle.Primary),
  );
  await ensureMessagePosted(client, channelId, appConfigPath, messageId, {
    embeds: [embed],
    components: [row],
  });
}

module.exports = updateSubmissionMessage;

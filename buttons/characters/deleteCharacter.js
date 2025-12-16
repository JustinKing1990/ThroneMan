const { getDb } = require('../../mongoClient');
const updateListMessage = require('../../helpercommands/updateListMessage');
const config = require('../../env/config.json');
const fs = require('fs');
const path = require('path');
const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField,
} = require('discord.js');

async function handleDeleteCharacterInteraction(interaction) {
  const db = getDb();
  const settingsCollection = db.collection('settings');
  const charactersCollection = db.collection('characters');
  const characterArchiveCollection = db.collection('characterArchive');
  const targetChannelId = '1206381988559323166';
  const targetChannel = await interaction.client.channels
    .fetch(targetChannelId)
    .catch(console.error);

  const [_action, characterId, userId] = interaction.customId.split('_');

  if (interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
    try {
      const characterToArchive = await charactersCollection.findOne({
        name: characterId,
        userId: userId,
      });
      if (characterToArchive) {
        await characterArchiveCollection.insertOne(characterToArchive);
        const deletionResult = await charactersCollection.deleteOne({
          name: characterId,
          userId: userId,
        });

        if (deletionResult.deletedCount === 0) {
          await interaction.reply({
            content: 'No character found or you do not have permission to delete this character.',
            flags: [64],
          });
          return;
        } else {
          // After archiving and deleting character, delete associated image post(s)
          const messages = await targetChannel.messages.fetch({ limit: 100 });
          messages.forEach(async (message) => {
            if (message.author.bot && message.embeds.length > 0) {
              const embed = message.embeds[0];
              const hasCharacterName =
                embed.fields && embed.fields.some((field) => field.value.includes(characterId));
              const hasUserId =
                embed.fields && embed.fields.some((field) => field.value.includes(userId));
              if (hasCharacterName && hasUserId) {
                await message.delete().catch(console.error);
              }
            }
          });
          await interaction.reply({
            content: 'Character successfully deleted and archived.',
            flags: [64],
          });
        }
      } else {
        await interaction.reply({
          content: 'Character not found for archiving and deletion.',
          flags: [64],
        });
        return;
      }
    } catch (error) {
      console.error('Error archiving and deleting character:', error);
      await interaction.reply({
        content: 'An error occurred while trying to archive and delete the character.',
        flags: [64],
      });
      return;
    }
  } else {
    await interaction.reply({
      content: 'You do not have permission to delete this character.',
      flags: [64],
    });
    return;
  }

  try {
    let newCharacterCollection = db.collection('characters');
    await updateListMessage(
      interaction.client,
      interaction,
      newCharacterCollection,
      settingsCollection,
      config.allCharacterChannelId,
      config.allCharactersMessageId,
      'Character',
    );
  } catch (error) {
    console.error('Error updating character list message:', error);
  }
}

module.exports = handleDeleteCharacterInteraction;

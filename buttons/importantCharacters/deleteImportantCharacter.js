const { getDb } = require('../../mongoClient');
const ensureMessagePosted = require('../../helpercommands/postTrackedMessage');
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

async function handleDeleteImportantCharacterInteraction(interaction) {
  const [_action, characterId, userId] = interaction.customId.split('_');

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
    await interaction.reply({
      content: 'You do not have permission to delete this character.',
      flags: [64],
    });
    return;
  }

  // Show confirmation prompt
  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirmDeleteImportantCharacter_${characterId}_${userId}`)
    .setLabel('Yes, Delete')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cancelDelete`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  await interaction.reply({
    content: `⚠️ **Are you sure you want to delete the important character "${characterId}"?**\n\nThis will archive the character and remove it from the list. This action cannot be easily undone.`,
    components: [row],
    flags: [64],
  });
}

async function handleConfirmDeleteImportantCharacter(interaction) {
  const db = getDb();
  const settingsCollection = db.collection('settings');
  const charactersCollection = db.collection('importantCharacters');
  const characterArchiveCollection = db.collection('importantCharacterArchive');
  const targetChannelId = '1206381988559323166';
  const targetChannel = await interaction.client.channels
    .fetch(targetChannelId)
    .catch(console.error);

  const [_action, characterId, userId] = interaction.customId.split('_');

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
    await interaction.reply({
      content: 'You do not have permission to delete this character.',
      flags: [64],
    });
    return;
  }

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
        await interaction.update({
          content: 'No character found or you do not have permission to delete this character.',
          components: [],
        });
        return;
      } else {
        // After archiving and deleting character, delete associated image post(s)
        const messages = await targetChannel.messages.fetch({ limit: 100 });
        for (const [, message] of messages) {
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
        }
        await interaction.update({
          content: '✅ Character successfully deleted and archived.',
          components: [],
        });
      }
    } else {
      await interaction.update({
        content: 'Character not found for archiving and deletion.',
        components: [],
      });
      return;
    }
  } catch (error) {
    console.error('Error archiving and deleting character:', error);
    await interaction.update({
      content: 'An error occurred while trying to archive and delete the character.',
      components: [],
    });
    return;
  }

  try {
    const settingsCollection = db.collection('settings');
    let newCharacterCollection = db.collection('importantCharacters');
    await updateListMessage(
      interaction.client,
      interaction,
      newCharacterCollection,
      settingsCollection,
      config.allImportantCharacterChannelId,
      config.allImportantCharacterMessage,
      'ImportantCharacter',
    );
  } catch (error) {
    console.error('Error updating character list message:', error);
  }
}

module.exports = { handleDeleteImportantCharacterInteraction, handleConfirmDeleteImportantCharacter };

const { getDb } = require('../../mongoClient');
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
const updateListMessage = require('../../helpercommands/updateListMessage');

async function handleDeleteLoreInteraction(interaction) {
  const db = getDb();
  const settingsCollection = db.collection('settings');
  const loreCollection = db.collection('lore');
  const loreArchiveCollection = db.collection('loreArchive');
  const targetChannel = await interaction.client.channels
    .fetch('1207398646035910726')
    .catch(console.error);

  const [_action, loreId] = interaction.customId.split('_');

  if (interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
    try {
      const loreToArchive = await loreCollection.findOne({ name: loreId });
      if (loreToArchive) {
        await loreArchiveCollection.insertOne(loreToArchive);
        const deletionResult = await loreCollection.deleteOne({ name: loreId });

        if (deletionResult.deletedCount === 0) {
          await interaction.reply({
            content: 'No lore found or you do not have permission to delete this lore.',
            flags: [64],
          });
          return;
        } else {
          const messages = await targetChannel.messages.fetch({ limit: 100 });
          messages.forEach(async (message) => {
            if (message.author.bot && message.embeds.length > 0) {
              const embed = message.embeds[0];
              const hasLoreName =
                embed.fields && embed.fields.some((field) => field.value.includes(loreId));
              if (hasLoreName) {
                await message.delete().catch(console.error);
              }
            }
          });
          await interaction.reply({
            content: 'Lore successfully deleted and archived.',
            flags: [64],
          });
        }
      } else {
        await interaction.reply({
          content: 'Lore not found for archiving and deletion.',
          flags: [64],
        });
        return;
      }
    } catch (error) {
      console.error('Error archiving and deleting lore:', error);
      await interaction.reply({
        content: 'An error occurred while trying to archive and delete the lore.',
        flags: [64],
      });
      return;
    }
  } else {
    await interaction.reply({
      content: 'You do not have permission to delete this lore.',
      flags: [64],
    });
    return;
  }

  try {
    let newLoreCollection = db.collection('lore');
    await updateListMessage(
      interaction.client,
      interaction,
      newLoreCollection,
      settingsCollection,
      config.loreChannelId,
      config.loreMessageId,
      'Lore',
    );
  } catch (error) {
    console.error('Error updating lore list message:', error);
  }
}

module.exports = handleDeleteLoreInteraction;

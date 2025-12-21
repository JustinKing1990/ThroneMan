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
  const [_action, loreId] = interaction.customId.split('_');

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
    await interaction.reply({
      content: 'You do not have permission to delete this lore.',
      flags: [64],
    });
    return;
  }

  // Show confirmation prompt
  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirmDeleteLore_${loreId}`)
    .setLabel('Yes, Delete')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cancelDelete`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  await interaction.reply({
    content: `⚠️ **Are you sure you want to delete the lore "${loreId}"?**\n\nThis will archive the lore and remove it from the list. This action cannot be easily undone.`,
    components: [row],
    flags: [64],
  });
}

async function handleConfirmDeleteLore(interaction) {
  const db = getDb();
  const settingsCollection = db.collection('settings');
  const loreCollection = db.collection('lore');
  const loreArchiveCollection = db.collection('loreArchive');
  const targetChannel = await interaction.client.channels
    .fetch('1207398646035910726')
    .catch(console.error);

  const [_action, loreId] = interaction.customId.split('_');

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
    await interaction.reply({
      content: 'You do not have permission to delete this lore.',
      flags: [64],
    });
    return;
  }

  try {
    const loreToArchive = await loreCollection.findOne({ name: loreId });
    if (loreToArchive) {
      await loreArchiveCollection.insertOne(loreToArchive);
      const deletionResult = await loreCollection.deleteOne({ name: loreId });

      if (deletionResult.deletedCount === 0) {
        await interaction.update({
          content: 'No lore found or you do not have permission to delete this lore.',
          components: [],
        });
        return;
      } else {
        const messages = await targetChannel.messages.fetch({ limit: 100 });
        for (const [, message] of messages) {
          if (message.author.bot && message.embeds.length > 0) {
            const embed = message.embeds[0];
            const hasLoreName =
              embed.fields && embed.fields.some((field) => field.value.includes(loreId));
            if (hasLoreName) {
              await message.delete().catch(console.error);
            }
          }
        }
        await interaction.update({
          content: '✅ Lore successfully deleted and archived.',
          components: [],
        });
      }
    } else {
      await interaction.update({
        content: 'Lore not found for archiving and deletion.',
        components: [],
      });
      return;
    }
  } catch (error) {
    console.error('Error archiving and deleting lore:', error);
    await interaction.update({
      content: 'An error occurred while trying to archive and delete the lore.',
      components: [],
    });
    return;
  }

  try {
    const settingsCollection = db.collection('settings');
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

module.exports = { handleDeleteLoreInteraction, handleConfirmDeleteLore };

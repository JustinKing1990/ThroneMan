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

async function handleDeleteBeastInteraction(interaction) {
  const [_action, beastId] = interaction.customId.split('_');

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
    await interaction.reply({
      content: 'You do not have permission to delete this beast.',
      flags: [64],
    });
    return;
  }

  // Show confirmation prompt
  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirmDeleteBeast_${beastId}`)
    .setLabel('Yes, Delete')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cancelDelete`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  await interaction.reply({
    content: `⚠️ **Are you sure you want to delete the beast "${beastId}"?**\n\nThis will archive the beast and remove it from the list. This action cannot be easily undone.`,
    components: [row],
    flags: [64],
  });
}

async function handleConfirmDeleteBeast(interaction) {
  const db = getDb();
  const settingsCollection = db.collection('settings');
  const beastCollection = db.collection('bestiary');
  const beastArchiveCollection = db.collection('bestiaryArchive');
  const targetChannel = await interaction.client.channels
    .fetch('1209676283794034728')
    .catch(console.error);

  const [_action, beastId] = interaction.customId.split('_');

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
    await interaction.reply({
      content: 'You do not have permission to delete this beast.',
      flags: [64],
    });
    return;
  }

  try {
    const beastToArchive = await beastCollection.findOne({ name: beastId });
    if (beastToArchive) {
      await beastArchiveCollection.insertOne(beastToArchive);
      const deletionResult = await beastCollection.deleteOne({
        name: beastId,
      });

      if (deletionResult.deletedCount === 0) {
        await interaction.update({
          content: 'No beast found or you do not have permission to delete this beast.',
          components: [],
        });
        return;
      } else {
        const messages = await targetChannel.messages.fetch({ limit: 100 });
        for (const [, message] of messages) {
          if (message.author.bot && message.embeds.length > 0) {
            const embed = message.embeds[0];
            const hasBeastName =
              embed.fields && embed.fields.some((field) => field.value.includes(beastId));
            if (hasBeastName) {
              await message.delete().catch(console.error);
            }
          }
        }
        await interaction.update({
          content: '✅ Beast successfully deleted and archived.',
          components: [],
        });
      }
    } else {
      await interaction.update({
        content: 'Beast not found for archiving and deletion.',
        components: [],
      });
      return;
    }
  } catch (error) {
    console.error('Error archiving and deleting beast:', error);
    await interaction.update({
      content: 'An error occurred while trying to archive and delete the beast.',
      components: [],
    });
    return;
  }

  try {
    const settingsCollection = db.collection('settings');
    let newBeastCollection = db.collection('bestiary');
    await updateListMessage(
      interaction.client,
      interaction,
      newBeastCollection,
      settingsCollection,
      config.bestiaryChannelId,
      config.bestiaryMessageId,
      'Beast',
    );
  } catch (error) {
    console.error('Error updating beast list message:', error);
  }
}

module.exports = { handleDeleteBeastInteraction, handleConfirmDeleteBeast };

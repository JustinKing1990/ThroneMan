const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../../mongoClient');
const updateListMessage = require('../../helpercommands/updateListMessage');
const config = require('../../env/config.json');

module.exports = async (interaction, _client) => {
  const db = getDb();
  const sourceCollection = db.collection('bestiary');
  const settingsCollection = db.collection('settings');

  // Get beast name - either from custom_id with underscore (new format: imageBeastAdditionNo_name)
  // or need to fetch from database (old format: imageBeastAdditionNo)
  const idParts = interaction.customId.split('_');
  let beastName = idParts.length > 1 ? idParts[1] : null;

  // If no beast name in the ID, fetch from the user's most recent beast
  if (!beastName) {
    const recentBeast = await sourceCollection
      .findOne({ userId: interaction.user.id }, { sort: { updatedAt: -1 } })
      .catch(() => null);
    beastName = recentBeast?.name;
  }

  if (!beastName) {
    await interaction.reply({
      content: 'Could not find beast information. Please try again.',
      flags: [64],
    });
    return;
  }

  try {
    const beastDocument = await sourceCollection.findOne({ name: beastName });
    if (beastDocument) {
      await updateListMessage(
        interaction.client,
        interaction,
        sourceCollection,
        settingsCollection,
        config.bestiaryChannelId,
        config.bestiaryMessageId,
        'Beast',
      );

      await interaction.update({
        content: 'Beast moved successfully.',
        components: [],
        flags: [64],
      });
    } else {
      await interaction.update({
        content: 'No pending beast found for this name.',
        components: [],
        flags: [64],
      });
    }
  } catch (error) {
    console.error('Error processing accept button interaction:', error);
    await interaction.update({
      content: 'There was an error processing the lore approval. Yell at your local dev',
      flags: [64],
    });
  }
};

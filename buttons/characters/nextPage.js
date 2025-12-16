const { getDb } = require('../../mongoClient');
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('../../env/config.json');
const updateListMessage = require('../../helpercommands/updateListMessage');

module.exports = async (interaction, _client) => {
  await interaction.deferReply({ flags: [64] });
  const db = getDb();
  const settingsCollection = db.collection('settings');
  const charactersCollection = db.collection('characters');

  try {
    let { currentPage } = (await settingsCollection.findOne({ name: 'paginationSettings' })) || {
      currentPage: 0,
    };

    let newPage = currentPage + 1;
    currentPage = newPage;

    await settingsCollection.updateOne(
      { name: 'paginationSettings' },
      { $set: { currentPage: newPage } },
      { upsert: true },
    );
    await updateListMessage(
      interaction.client,
      interaction,
      charactersCollection,
      settingsCollection,
      config.allCharacterChannelId,
      config.allCharactersMessageId,
      'Character',
    );
    await interaction.deleteReply();
  } catch (error) {
    console.error('Error processing accept button interaction:', error);
  }
};

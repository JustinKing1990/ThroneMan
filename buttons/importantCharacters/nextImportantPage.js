const { getDb } = require('../../mongoClient');
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('../../env/config.json');

module.exports = async (interaction, _client) => {
  await interaction.deferReply({ flags: [64] });
  const db = getDb();
  const settingsCollection = db.collection('settings');
  const charactersCollection = db.collection('importantCharacters');

  try {
    let { currentPage } = (await settingsCollection.findOne({ name: 'paginationSettings' })) || {
      importantCurrentPage: 0,
    };

    let newPage = currentPage + 1;
    currentPage = newPage;

    await settingsCollection.updateOne(
      { name: 'paginationSettings' },
      { $set: { currentPage: newPage } },
      { upsert: true },
    );

    const totalCharacters = await charactersCollection.countDocuments();
    const totalPages = Math.ceil(totalCharacters / 25);
    ``;
    const charactersData = await charactersCollection
      .find({})
      .sort({ name: 1 })
      .skip(newPage * 25)
      .limit(25)
      .toArray();

    const characterOptions = charactersData.map((character) => ({
      label: character.name,
      value: `${character.name}::${character.userId}`,
    }));

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('selectImportantCharacter')
        .setPlaceholder('Select a character')
        .addOptions(characterOptions),
    );

    const rowButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prevPage')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId('nextPage')
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages - 1),
    );

    const allCharactersChannel = await interaction.client.channels.fetch('903864075405127706');
    const allCharactersMessageId = config.allImportantCharacterMessage;
    let allCharacterMessageExists = false;

    try {
      const message = await allCharactersChannel.messages.fetch(allCharactersMessageId);
      allCharacterMessageExists = true;
      await message.edit({
        content: 'Select a character to view more information:',
        components: [selectMenu, rowButtons],
      });
      console.log('Message edited successfully.');
    } catch (error) {}

    await interaction.deleteReply();
  } catch (error) {
    console.error('Error processing accept button interaction:', error);
  }
};

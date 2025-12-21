const postCharacterInfo = require('../../helpercommands/postImportantCharacterInfo');

module.exports = async (interaction, _client) => {
  // Defer the reply first before any async operations
  await interaction.deferReply({ flags: [64] });

  // Get character name from custom_id
  const idParts = interaction.customId.split('_');
  let characterName = idParts.length > 1 ? idParts.slice(1).join('_') : null;

  // If no character name in the ID, fetch from the user's most recent important character
  if (!characterName) {
    const db = require('../../mongoClient').getDb();
    const importantCharacterCollection = db.collection('importantCharacterPending');
    const recentCharacter = await importantCharacterCollection
      .findOne({ userId: interaction.user.id }, { sort: { updatedAt: -1 } })
      .catch(() => null);
    characterName = recentCharacter?.name;
  }

  if (!characterName) {
    await interaction.editReply({
      content: 'Could not find character information. Please try again.',
      components: [],
    });
    return;
  }

  await postCharacterInfo(interaction, _client, characterName)
    .then(() => {
      interaction.editReply({
        content:
          'Character information will be posted to staff for approval. You will be updated with further information.',
        components: [],
      });
    })
    .catch((error) => {
      console.error('Failed to post character information:', error);
      interaction.editReply({
        content:
          'There was an error processing your request. Please let a staff member know you encountered this.',
        components: [],
      });
    });
};

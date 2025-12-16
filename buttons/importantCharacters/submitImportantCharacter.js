const importantCharacterCreationMethod = require('./importantCharacterCreationMethod');

module.exports = async (interaction, _client) => {
  // Show method selection (manual or file upload)
  await importantCharacterCreationMethod(interaction, _client);
};

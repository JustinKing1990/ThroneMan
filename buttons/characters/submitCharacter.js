const characterCreationMethod = require('./characterCreationMethod');

module.exports = async (interaction, _client) => {
  // Show method selection (manual or file upload)
  await characterCreationMethod(interaction, _client);
};

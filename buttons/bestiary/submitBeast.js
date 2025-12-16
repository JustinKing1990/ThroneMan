const beastCreationMethod = require('./beastCreationMethod');

module.exports = async (interaction, _client) => {
  // Show method selection (manual or file upload)
  await beastCreationMethod(interaction, _client);
};

const loreCreationMethod = require('./loreCreationMethod');

module.exports = async (interaction, _client) => {
  // Show method selection (manual or file upload)
  await loreCreationMethod(interaction, _client);
};

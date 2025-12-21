/**
 * Button to start creating a new location
 */
const locationCreationMethod = require('./locationCreationMethod');

module.exports = async (interaction, _client) => {
  await locationCreationMethod(interaction, _client);
};

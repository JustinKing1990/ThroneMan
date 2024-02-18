const postCharacterInfo = require('../../helpercommands/postImportantCharacterInfo');

module.exports = async (interaction, client) => {
    const [action, characterName] = interaction.customId.split('_')
    await postCharacterInfo(interaction, client, characterName)
        .then(() => {
            interaction.update({ content: "Character information will be posted to staff for approval. You will be updated with further information.", components: [], ephemeral: true });
        })
        .catch(error => {
            console.error('Failed to post character information:', error);
            interaction.update({ content: "There was an error processing your request. Please let a staff memeber know you encountered this.", components: [], ephemeral: true });
        });
};

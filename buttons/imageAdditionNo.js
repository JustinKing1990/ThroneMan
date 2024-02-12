const postCharacterInfo = require('../helpercommands/postCharacterInfo');

module.exports = async (interaction, client) => {
    await postCharacterInfo(interaction, client)
        .then(() => {
            interaction.update({ content: "Character information will be posted to staff for approval. You will be updated with further information.", components: [], ephemeral: true });
        })
        .catch(error => {
            console.error('Failed to post character information:', error);
            interaction.update({ content: "There was an error processing your request. Please let a staff memeber know you encountered this.", components: [], ephemeral: true });
        });
};

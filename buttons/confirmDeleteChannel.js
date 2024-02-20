const { getDb } = require('../mongoClient');
const postCharacterInfo = require('../helpercommands/postCharacterInfo')

module.exports = async (interaction, client) => {
    const [action, userId, characterName, repost] = interaction.customId.split('_')
    if (interaction.user.id !== userId) {
        await interaction.followUp({ content: "You cannot delete another's channel this way.", ephemeral: true });
        return;
    }
    const db = getDb();
    const characterCollection = db.collection('character')
    try {
        if (repost) {
            const characterData = await characterCollection.findOne({ userId: interaction.user.id, name: characterName })
            const imageUrl = characterData.imageUrls
            await postCharacterInfo(interaction, client, characterData.name, imageUrl)
            await interaction.channel.delete();
        }
        else {
            await characterCollection.deleteOne({ userId: userId, name: characterName });
            await interaction.channel.delete();
        }
    } catch (error) {
        console.error('Error deleting the channel:', error);
    }
};

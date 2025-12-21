const { getDb } = require('../mongoClient');
const postCharacterInfo = require('../helpercommands/postCharacterInfo');

module.exports = async (interaction, _client) => {
  const [_action, userId, characterName, repost] = interaction.customId.split('_');
  
  // Simple delete channel case (no userId in customId means it's just confirmDeleteChannel)
  if (!userId || userId === 'undefined') {
    await interaction.reply({ content: 'Deleting channel...', flags: [64] });
    try {
      await interaction.channel.delete();
    } catch (error) {
      console.error('Error deleting channel:', error);
    }
    return;
  }

  if (interaction.user.id !== userId) {
    await interaction.reply({
      content: "You cannot delete another's channel this way.",
      flags: [64],
    });
    return;
  }
  
  await interaction.deferReply({ flags: [64] });
  
  const db = getDb();
  const characterCollection = db.collection('character');
  try {
    if (repost) {
      const characterData = await characterCollection.findOne({
        userId: interaction.user.id,
        name: characterName,
      });
      const imageUrl = characterData.imageUrls;
      await postCharacterInfo(interaction, _client, characterData.name, imageUrl);
      await interaction.channel.delete();
    } else {
      await characterCollection.deleteOne({ userId: userId, name: characterName });
      await interaction.channel.delete();
    }
  } catch (error) {
    console.error('Error deleting the channel:', error);
    await interaction.editReply({ content: 'Error deleting channel.' });
  }
};

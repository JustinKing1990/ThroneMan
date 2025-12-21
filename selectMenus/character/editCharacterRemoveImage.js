const { getDb } = require('../../mongoClient');

module.exports = async (interaction, _client) => {
  const [_prefix, characterName, userId] = interaction.customId.split('_');
  const selectedIndices = interaction.values.map(v => parseInt(v, 10));

  // Verify ownership
  if (interaction.user.id !== userId) {
    await interaction.reply({
      content: 'You can only edit your own characters.',
      flags: [64],
    });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  try {
    const db = getDb();
    const character = await db.collection('characters').findOne({ name: characterName, userId });

    if (!character) {
      await interaction.editReply({ content: 'Character not found.' });
      return;
    }

    const currentImages = character.imageUrls || [];
    const currentMessageIds = character.imageMessageIds || [];
    
    if (currentImages.length === 0) {
      await interaction.editReply({ content: 'No images to remove.' });
      return;
    }

    // Filter out the selected images and their message IDs
    const remainingImages = currentImages.filter((_, index) => !selectedIndices.includes(index));
    const remainingMessageIds = currentMessageIds.filter((_, index) => !selectedIndices.includes(index));
    const removedMessageIds = currentMessageIds.filter((_, index) => selectedIndices.includes(index));
    const removedCount = currentImages.length - remainingImages.length;

    // Delete the image messages from the channel
    const targetChannelId = '1206381988559323166';
    try {
      const targetChannel = await interaction.client.channels.fetch(targetChannelId);
      if (targetChannel && removedMessageIds.length > 0) {
        for (const msgId of removedMessageIds) {
          try {
            const msg = await targetChannel.messages.fetch(msgId);
            if (msg) {
              await msg.delete();
            }
          } catch (e) {
            // Message may already be deleted or not found
          }
        }
      }
    } catch (e) {
      // Non-fatal
    }

    // Update the database
    await db.collection('characters').updateOne(
      { name: characterName, userId },
      { 
        $set: { 
          imageUrls: remainingImages,
          imageMessageIds: remainingMessageIds,
          updatedAt: new Date()
        } 
      }
    );

    await interaction.editReply({
      content: `✅ Removed **${removedCount}** image(s) from **${characterName}**.\n\nRemaining images: ${remainingImages.length}`,
    });

  } catch (error) {
    await interaction.editReply({
      content: 'An error occurred while removing images. Please try again.',
    });
  }
};

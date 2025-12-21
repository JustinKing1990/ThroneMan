const { getDb } = require('../../mongoClient');

module.exports = async (interaction, _client) => {
  const [_modalId, characterName] = interaction.customId.split('_');
  const imagesField = interaction.fields?.fields.get('important_character_images');
  const attachments = imagesField?.attachments;

  if (!attachments || attachments.size === 0) {
    await interaction.reply({
      content: 'No images were attached. Please try again.',
      flags: [64],
    });
    return;
  }

  const db = getDb();
  const pendingCollection = db.collection('importantCharacterPending');

  try {
    const imageData = [];

    for (const attachment of attachments.values()) {
      const response = await fetch(attachment.url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = attachment.contentType || 'image/png';
      const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
      imageData.push(dataUrl);
    }

    await pendingCollection.updateOne(
      { userId: interaction.user.id, name: characterName },
      {
        $addToSet: { imageUrls: { $each: imageData } },
        $set: { updatedAt: new Date() },
      },
      { upsert: true },
    );

    await interaction.reply({
      content: 'Images uploaded successfully and attached to your pending submission.',
      flags: [64],
    });
  } catch (error) {
    console.error('Failed to process image upload modal:', error);
    await interaction.reply({
      content: 'There was an error processing your image upload. Please try again.',
      flags: [64],
    });
  }
};

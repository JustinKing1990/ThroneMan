const { getDb } = require('../../mongoClient');
const postImportantCharacterInfo = require('../../helpercommands/postImportantCharacterInfo');

module.exports = async (interaction, _client) => {
  const [_action, characterName] = interaction.customId.split('_');

  // Tell the user to drop images in this channel; keep buttons intact.
  await interaction.deferReply({ flags: [64] });

  // Use a unique ID for this session's submit button so we can track it
  const sessionId = `${interaction.user.id}_${Date.now()}`;
  const submitButtonId = `imgSubmitNow_${sessionId}_${characterName}`;

  const submitRow = {
    type: 1,
    components: [
      {
        type: 2,
        style: 3, // Success
        label: 'Submit Now',
        custom_id: submitButtonId,
      },
    ],
  };

  const promptMsg = await interaction.followUp({
    content:
      'Please drag & drop your images in this channel now (up to 10). They will be attached to your pending submission. This prompt listens for 2 minutes. When ready, press **Submit Now** below to continue.',
    components: [submitRow],
    flags: [64],
  });

  const db = getDb();
  const pendingCollection = db.collection('importantCharacterPending');

  const collectedImages = [];
  let submitted = false;

  // Message collector for images
  const msgFilter = (m) => m.author.id === interaction.user.id && m.attachments.size > 0;
  const messageCollector = interaction.channel.createMessageCollector({ filter: msgFilter, time: 120000 });

  // Component collector for the Submit button
  const btnFilter = (i) => i.customId === submitButtonId && i.user.id === interaction.user.id;
  const buttonCollector = promptMsg.createMessageComponentCollector({ filter: btnFilter, time: 120000 });

  messageCollector.on('collect', async (m) => {
    if (submitted) return;

    // Limit total to 10 images
    const remainingSlots = Math.max(0, 10 - collectedImages.length);
    if (remainingSlots === 0) {
      await m.reply({ content: 'Image limit reached (10).', flags: [64] }).catch(() => {});
      return;
    }

    const toProcess = Array.from(m.attachments.values()).slice(0, remainingSlots);
    for (const attachment of toProcess) {
      try {
        const response = await fetch(attachment.url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = attachment.contentType || 'image/png';
        const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
        collectedImages.push(dataUrl);
      } catch (err) {
        console.error('Failed to download image:', err);
      }
    }

    // Delete the user message to reduce clutter
    await m.delete().catch(() => {});

    await interaction.followUp({
      content: `Got ${collectedImages.length} image(s). Add more or press the **Submit Now** button above when ready.`,
      flags: [64],
    });

    // If we hit the cap, end early
    if (collectedImages.length >= 10) {
      messageCollector.stop('limit');
    }
  });

  buttonCollector.on('collect', async (btnInteraction) => {
    if (submitted) {
      await btnInteraction.reply({ content: 'Already submitted!', flags: [64] }).catch(() => {});
      return;
    }
    submitted = true;

    // Stop the message collector immediately
    messageCollector.stop('submitted');
    buttonCollector.stop('submitted');

    await btnInteraction.deferReply({ flags: [64] });

    try {
      // Save any collected images to the pending document
      if (collectedImages.length > 0) {
        await pendingCollection.updateOne(
          { userId: interaction.user.id, name: characterName },
          {
            $addToSet: { imageUrls: { $each: collectedImages } },
            $set: { updatedAt: new Date() },
          },
          { upsert: true },
        );
      }

      // Call postImportantCharacterInfo with the button interaction
      await postImportantCharacterInfo(btnInteraction, _client, characterName);

      await btnInteraction.editReply({
        content: `Your important character **${characterName}** has been submitted for approval! A staff member will review it shortly.`,
      });
    } catch (error) {
      console.error('Error submitting important character:', error);
      await btnInteraction.editReply({
        content: 'There was an error submitting your character. Please try again.',
      }).catch(e => console.error('Failed to edit reply:', e));
    }
  });

  messageCollector.on('end', async (_collected, reason) => {
    // If already submitted via button, don't do anything
    if (submitted || reason === 'submitted') return;

    // Timeout case - user never pressed submit
    if (reason === 'time') {
      if (collectedImages.length > 0) {
        // Save the images they did upload
        try {
          await pendingCollection.updateOne(
            { userId: interaction.user.id, name: characterName },
            {
              $addToSet: { imageUrls: { $each: collectedImages } },
              $set: { updatedAt: new Date() },
            },
            { upsert: true },
          );
          await interaction.followUp({
            content: `Time's up! Your ${collectedImages.length} image(s) have been saved. Use the original Submit button to complete your submission.`,
            flags: [64],
          });
        } catch (error) {
          console.error('Failed to save images on timeout:', error);
        }
      } else {
        await interaction.followUp({
          content: 'Image collection timed out. You can start again by pressing "Yes" to add images, or "No" to submit without images.',
          flags: [64],
        });
      }
    }
  });
};

/**
 * Handles modal submission for important character file upload
 * Processes the uploaded file from Discord's native File Upload component (type 19)
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { parseFileUpload } = require('../../helpercommands/processFileUpload');
const { validateData, normalizeData } = require('../../helpercommands/validateSchema');
const {
  createMissingFieldsEmbed,
  createDataSummaryEmbeds,
  createImageAttachments,
} = require('../../helpercommands/processFileUpload');
const { getDb } = require('../../mongoClient');
const { generateImageDescription } = require('../../helpercommands/generateImageDescription');

module.exports = async (interaction, _client) => {
  await interaction.deferReply({ flags: [64] });

  // Get file upload data from modal submission via fields
  const fileField = interaction.fields.fields.get('important_character_file');

  if (!fileField) {
    await interaction.editReply({
      content: '❌ No file upload field found in modal.',
    });
    return;
  }

  const attachments = fileField.attachments;

  if (!attachments || attachments.size === 0) {
    await interaction.editReply({
      content: '❌ No file was uploaded.',
    });
    return;
  }

  // Get the first attachment
  const attachment = attachments.first();

  // Process the file
  const { data, error } = await parseFileUpload(attachment, 'importantCharacter');

  if (error) {
    await interaction.editReply({
      content: `❌ **File Processing Error**\n${error}`,
    });
    return;
  }

  // Auto-generate appearance from image if missing
  if (
    (!data.appearance || data.appearance.trim() === '') &&
    data.imageUrls &&
    data.imageUrls.length > 0
  ) {
    const description = await generateImageDescription(data.imageUrls[0], 'important');
    if (description) {
      data.appearance = description;
    }
  }

  // Validate required fields (same as regular character)
  const validation = validateData('character', data);

  if (!validation.isValid) {
    const embed = createMissingFieldsEmbed(validation.missingFields, 'Important Character');
    await interaction.editReply({
      embeds: [embed],
    });
    return;
  }

  // Normalize data
  const normalizedData = normalizeData('character', data);

  // Keep images as base64 for now - will upload to Discord after approval
  // This prevents orphaned images if submission is cancelled

  // Store in database (important character pending collection)
  const db = getDb();
  const importantCharacterCollection = db.collection('importantCharacterPending');

  try {
    await importantCharacterCollection.updateOne(
      {
        userId: interaction.user.id,
        name: normalizedData.name,
      },
      {
        $set: {
          ...normalizedData,
          userId: interaction.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    // Show success with data summary using multiple embeds
    const summaryEmbeds = createDataSummaryEmbeds(normalizedData, 'Important Character');

    // If images were provided, skip the "Add Images" button and go straight to submission
    let components = [];
    if (normalizedData.imageUrls && normalizedData.imageUrls.length > 0) {
      // Images already uploaded, show only "Submit" button
      const submitRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`imageImportantAdditionNo_${normalizedData.name}`)
          .setLabel('Submit for Approval')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
      );
      components = [submitRow];
    } else {
      // No images provided, show "Add Images" and "Submit Without Images" buttons
      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`imageImportantAdditionYes_${normalizedData.name}`)
          .setLabel('Add Images')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🖼️'),
        new ButtonBuilder()
          .setCustomId(`importantCharacterCreationFinal_${normalizedData.name}`)
          .setLabel('Submit Without Images')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
      );
      components = [actionRow];
    }

    // Discord allows up to 10 embeds per message BUT total size across all embeds must be under 6000
    // Send only 1 embed per message to be safe with long content
    const isOnlyEmbed = summaryEmbeds.length === 1;
    
    // Convert base64 images to attachments for preview display
    const { attachments: imageAttachments, filenames } = createImageAttachments(normalizedData.imageUrls);
    
    // Set the first image on the last embed if we have any
    if (filenames.length > 0) {
      summaryEmbeds[summaryEmbeds.length - 1].setImage(`attachment://${filenames[0]}`);
    }
    
    // Send first embed with editReply
    await interaction.editReply({
      embeds: [summaryEmbeds[0]],
      content:
        normalizedData.imageUrls && normalizedData.imageUrls.length > 0
          ? `✅ Important Character data and ${normalizedData.imageUrls.length} image(s) loaded successfully!`
          : '✅ Important Character data loaded successfully!',
      components: isOnlyEmbed ? components : [],
      files: isOnlyEmbed ? imageAttachments : [],
    });

    // Send remaining embeds as individual followUps
    for (let i = 1; i < summaryEmbeds.length; i++) {
      const isLastEmbed = i === summaryEmbeds.length - 1;
      await interaction.followUp({
        embeds: [summaryEmbeds[i]],
        components: isLastEmbed ? components : [],
        files: isLastEmbed ? imageAttachments : [],
        flags: [64],
      });
    }
  } catch (error) {
    console.error('Failed to save important character from file upload:', error);
    await interaction.editReply({
      content: '❌ There was an error saving your important character. Please try again later.',
    });
  }
};

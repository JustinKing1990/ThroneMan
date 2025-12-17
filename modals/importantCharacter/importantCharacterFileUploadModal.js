/**
 * Handles modal submission for important character file upload
 * Processes the uploaded file from Discord's native File Upload component (type 19)
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { parseFileUpload } = require('../../helpercommands/processFileUpload');
const { validateData, normalizeData } = require('../../helpercommands/validateSchema');
const {
  createMissingFieldsEmbed,
  createDataSummaryEmbed,
} = require('../../helpercommands/processFileUpload');
const { getDb } = require('../../mongoClient');
const { generateImageDescription } = require('../../helpercommands/generateImageDescription');
const { uploadImagesToDiscord } = require('../../helpercommands/uploadImagesToDiscord');

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
  const { data, error } = await parseFileUpload(attachment);

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
    console.log('Generating appearance description from image...');
    const description = await generateImageDescription(data.imageUrls[0], 'important');
    if (description) {
      data.appearance = description;
      console.log('Auto-generated appearance:', description);
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

  // Store in database (important character collection)
  const db = getDb();
  const importantCharacterCollection = db.collection('importantCharacter');

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
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    // Show success with data summary
    const summaryEmbed = createDataSummaryEmbed(normalizedData, 'Important Character');

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
          .setCustomId('imageImportantAdditionYes')
          .setLabel('Add Images')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🖼️'),
        new ButtonBuilder()
          .setCustomId('imageImportantAdditionNo')
          .setLabel('Submit Without Images')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
      );
      components = [actionRow];
    }

    await interaction.editReply({
      embeds: [summaryEmbed],
      content:
        normalizedData.imageUrls && normalizedData.imageUrls.length > 0
          ? '✅ Important Character data and images loaded successfully! Ready to submit?'
          : '✅ Important Character data loaded successfully! What would you like to do next?',
      components: components,
    });
  } catch (error) {
    console.error('Failed to save important character from file upload:', error);
    await interaction.editReply({
      content: '❌ There was an error saving your important character. Please try again later.',
    });
  }
};

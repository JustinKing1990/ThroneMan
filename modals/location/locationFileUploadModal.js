/**
 * Handles modal submission for location file upload
 * Processes the uploaded file from Discord's native File Upload component (type 19)
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { parseFileUpload } = require('../../helpercommands/processFileUpload');
const { validateData, normalizeData } = require('../../helpercommands/validateSchema');
const {
  createMissingFieldsEmbed,
  createDataSummaryEmbed,
  createImageAttachments,
} = require('../../helpercommands/processFileUpload');
const { getDb } = require('../../mongoClient');
const { generateImageDescription } = require('../../helpercommands/generateImageDescription');

module.exports = async (interaction, _client) => {
  await interaction.deferReply({ flags: [64] });

  // Get file upload data from modal submission via fields
  const fileField = interaction.fields.fields.get('location_file');

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
  const { data, error } = await parseFileUpload(attachment, 'location');

  if (error) {
    await interaction.editReply({
      content: `❌ **File Processing Error**\n${error}`,
    });
    return;
  }

  // Auto-generate description from image if missing
  if (
    (!data.description || data.description.trim() === '') &&
    data.imageUrls &&
    data.imageUrls.length > 0
  ) {
    console.log('Generating description from image...');
    const description = await generateImageDescription(data.imageUrls[0], 'location');
    if (description) {
      data.description = description;
      console.log('Auto-generated description:', description);
    }
  }

  // Validate required fields
  const validation = validateData('location', data);

  if (!validation.isValid) {
    const embed = createMissingFieldsEmbed(validation.missingFields, 'Location');
    await interaction.editReply({
      embeds: [embed],
    });
    return;
  }

  // Normalize data
  const normalizedData = normalizeData('location', data);

  // Store in database (locations collection)
  const db = getDb();
  const locationsCollection = db.collection('locations');

  try {
    await locationsCollection.updateOne(
      {
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
    const summaryEmbed = createDataSummaryEmbed(normalizedData, 'Location');

    // If images were provided, skip the "Add Images" button and go straight to submission
    let components = [];
    if (normalizedData.imageUrls && normalizedData.imageUrls.length > 0) {
      // Images already uploaded, show only "Submit" button
      const submitRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`imageLocationAdditionNo_${normalizedData.name}`)
          .setLabel('Submit Location')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
      );
      components = [submitRow];
    } else {
      // No images provided, show "Add Images" and "Submit Without Images" buttons
      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('imageLocationAdditionYes')
          .setLabel('Add Images')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🖼️'),
        new ButtonBuilder()
          .setCustomId('imageLocationAdditionNo')
          .setLabel('Submit Without Images')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
      );
      components = [actionRow];
    }

    // Convert base64 images to attachments for preview display
    const { attachments: imageAttachments, filenames } = createImageAttachments(normalizedData.imageUrls);
    
    // Set the first image on the embed if we have any
    if (filenames.length > 0) {
      summaryEmbed.setImage(`attachment://${filenames[0]}`);
    }

    await interaction.editReply({
      embeds: [summaryEmbed],
      content:
        normalizedData.imageUrls && normalizedData.imageUrls.length > 0
          ? `✅ Location data and ${normalizedData.imageUrls.length} image(s) loaded successfully! Ready to submit?`
          : '✅ Location data loaded successfully! What would you like to do next?',
      components: components,
      files: imageAttachments,
    });
  } catch (error) {
    console.error('Failed to save location from file upload:', error);
    await interaction.editReply({
      content: '❌ There was an error saving your location. Please try again later.',
    });
  }
};

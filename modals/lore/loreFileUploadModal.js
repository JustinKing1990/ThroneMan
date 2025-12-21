/**
 * Handles modal submission for lore file upload
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

module.exports = async (interaction, _client) => {
  await interaction.deferReply({ flags: [64] });

  // Get file upload data from modal submission via fields
  const fileField = interaction.fields.fields.get('lore_file');

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
  const { data, error } = await parseFileUpload(attachment, 'lore');

  if (error) {
    await interaction.editReply({
      content: `❌ **File Processing Error**\n${error}`,
    });
    return;
  }

  // Validate required fields
  const validation = validateData('lore', data);

  if (!validation.isValid) {
    const embed = createMissingFieldsEmbed(validation.missingFields, 'Lore');
    await interaction.editReply({
      embeds: [embed],
    });
    return;
  }

  // Normalize data
  const normalizedData = normalizeData('lore', data);

  // Store in database (lore collection)
  const db = getDb();
  const loreCollection = db.collection('lore');

  try {
    await loreCollection.updateOne(
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
    const summaryEmbed = createDataSummaryEmbed(normalizedData, 'Lore');

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`loreCreationButtonPart2_${normalizedData.name}`)
        .setLabel('Add More Lore')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`loreCreationFinal_${normalizedData.name}`)
        .setLabel('Submit Lore')
        .setStyle(ButtonStyle.Success),
    );

    await interaction.editReply({
      embeds: [summaryEmbed],
      content: '✅ Lore data loaded successfully! What would you like to do next?',
      components: [actionRow],
    });
  } catch (error) {
    console.error('Failed to save lore from file upload:', error);
    await interaction.editReply({
      content: '❌ There was an error saving your lore. Please try again later.',
    });
  }
};

/**
 * Handles beast data file uploads
 * Receives file attachment, parses it, validates required fields, and stores in database
 */

const { getDb } = require('../../mongoClient');
const { parseFileUpload } = require('../../helpercommands/processFileUpload');
const { validateData, normalizeData } = require('../../helpercommands/validateSchema');
const {
  createMissingFieldsEmbed,
  createDataSummaryEmbed,
} = require('../../helpercommands/processFileUpload');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = async (interaction, _client) => {
  // Check if there are attachments
  if (
    !interaction.message ||
    !interaction.message.attachments ||
    interaction.message.attachments.size === 0
  ) {
    await interaction.reply({
      content: 'No file attachment found. Please upload a JSON, DOCX, TXT, or PDF file.',
      flags: [64],
    });
    return;
  }

  const attachment = interaction.message.attachments.first();

  // Parse the file
  const { data, error } = await parseFileUpload(attachment, 'beast');

  if (error) {
    await interaction.reply({
      content: `❌ **File Processing Error**\n${error}`,
      flags: [64],
    });
    return;
  }

  // Validate required fields
  const validation = validateData('beast', data);

  if (!validation.isValid) {
    const embed = createMissingFieldsEmbed(validation.missingFields, 'Beast');

    await interaction.reply({
      embeds: [embed],
      flags: [64],
    });
    return;
  }

  // Normalize data
  const normalizedData = normalizeData('beast', data);

  // Store in database
  const db = getDb();
  const beastCollection = db.collection('bestiary');

  try {
    await beastCollection.updateOne(
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
    const summaryEmbed = createDataSummaryEmbed(normalizedData, 'Beast');

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`beastCreationAdditionAbilities_${normalizedData.name}`)
        .setLabel('Add More Abilities')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`beastCreationAdditionSignificance_${normalizedData.name}`)
        .setLabel('Next: Significance')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`beastCreationFinal_${normalizedData.name}`)
        .setLabel('Skip to Submit')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({
      embeds: [summaryEmbed],
      content: 'Beast data loaded successfully! What would you like to do next?',
      components: [actionRow],
      flags: [64],
    });
  } catch (error) {
    console.error('Failed to save beast from file upload:', error);
    await interaction.reply({
      content: '❌ There was an error saving your beast. Please try again later.',
      flags: [64],
    });
  }
};

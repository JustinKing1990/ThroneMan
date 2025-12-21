/**
 * Handles important character data file uploads
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
  const { data, error } = await parseFileUpload(attachment, 'importantCharacter');

  if (error) {
    await interaction.reply({
      content: `❌ **File Processing Error**\n${error}`,
      flags: [64],
    });
    return;
  }

  // Validate required fields
  const validation = validateData('importantCharacter', data);

  if (!validation.isValid) {
    const embed = createMissingFieldsEmbed(validation.missingFields, 'Important Character');

    await interaction.reply({
      embeds: [embed],
      flags: [64],
    });
    return;
  }

  // Normalize data
  const normalizedData = normalizeData('importantCharacter', data);

  // Store in database
  const db = getDb();
  const charactersCollection = db.collection('importantCharacter');

  try {
    await charactersCollection.updateOne(
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
    const { formatFullDataAsText } = require('../../helpercommands/processFileUpload');
    const fullText = formatFullDataAsText(normalizedData);

    console.log('Normalized data keys:', Object.keys(normalizedData));
    console.log('Full text length:', fullText.length);
    console.log('Full text preview:', fullText.substring(0, 200));

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`importantCharacterCreationButtonPart2_${normalizedData.name}`)
        .setLabel('Continue to Equipment')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`importantCharacterCreationFinal_${normalizedData.name}`)
        .setLabel('Skip to Submit')
        .setStyle(ButtonStyle.Secondary),
    );

    // Send embed first
    await interaction.reply({
      embeds: [summaryEmbed],
      flags: [64],
    });

    // Send full data in chunks (Discord 2000 char limit)
    const chunkSize = 1900;
    const chunks = [];
    
    for (let i = 0; i < fullText.length; i += chunkSize) {
      chunks.push(fullText.substring(i, Math.min(i + chunkSize, fullText.length)));
    }

    console.log('Number of chunks:', chunks.length);

    // Send each chunk as a followUp
    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      await interaction.followUp({
        content: chunks[i],
        components: isLast ? [actionRow] : [],
        flags: [64],
      });
    }

    // If no chunks (shouldn't happen but safety), send buttons
    if (chunks.length === 0) {
      await interaction.followUp({
        content: 'What would you like to do next?',
        components: [actionRow],
        flags: [64],
      });
    }
  } catch (error) {
    console.error('Failed to save important character from file upload:', error);
    await interaction.reply({
      content: '❌ There was an error saving your character. Please try again later.',
      flags: [64],
    });
  }
};

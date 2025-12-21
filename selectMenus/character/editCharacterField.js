const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const { getDb } = require('../../mongoClient');

module.exports = async (interaction, _client) => {
  const [_prefix, characterName, userId] = interaction.customId.split('_');
  const selectedField = interaction.values[0];

  // Verify ownership
  if (interaction.user.id !== userId) {
    await interaction.reply({
      content: 'You can only edit your own characters.',
      flags: [64],
    });
    return;
  }

  // Get current character data
  const db = getDb();
  const character = await db.collection('characters').findOne({ name: characterName, userId });

  if (!character) {
    await interaction.reply({
      content: 'Character not found.',
      flags: [64],
    });
    return;
  }

  // Handle image upload separately
  if (selectedField === 'addImages') {
    await interaction.reply({
      content: `**Add Images for ${characterName}**\n\nPlease upload your image(s) as attachments in your next message.\n\nSend your images now, then click the button below to process them.`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`editCharacterImageUpload_${characterName}_${userId}`)
            .setLabel('Process Uploaded Images')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('cancelDelete')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
      flags: [64],
    });
    return;
  }

  // Handle image removal
  if (selectedField === 'removeImages') {
    const imageUrls = character.imageUrls || [];
    
    if (imageUrls.length === 0) {
      await interaction.reply({
        content: `**${characterName}** has no images to remove.`,
        flags: [64],
      });
      return;
    }

    // Create a select menu with image options
    const options = imageUrls.slice(0, 25).map((url, index) => {
      // Extract filename from URL for display
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1].split('?')[0];
      const shortFilename = filename.length > 50 ? filename.substring(0, 47) + '...' : filename;
      
      return {
        label: `Image ${index + 1}`,
        value: String(index),
        description: shortFilename,
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`editCharacterRemoveImage_${characterName}_${userId}`)
      .setPlaceholder('Select image(s) to remove...')
      .setMinValues(1)
      .setMaxValues(options.length)
      .addOptions(options);

    // Show preview of first few images
    let previewText = `**Remove Images from ${characterName}**\n\nYou have **${imageUrls.length}** image(s). Select which ones to remove:\n`;
    
    await interaction.reply({
      content: previewText,
      components: [new ActionRowBuilder().addComponents(selectMenu)],
      flags: [64],
    });
    return;
  }

  // Field configurations
  const fieldConfigs = {
    name: { label: 'Character Name', style: TextInputStyle.Short, maxLength: 100 },
    title: { label: 'Title(s)', style: TextInputStyle.Short, maxLength: 200 },
    age: { label: 'Age', style: TextInputStyle.Short, maxLength: 50 },
    gender: { label: 'Gender', style: TextInputStyle.Short, maxLength: 50 },
    birthplace: { label: 'Birthplace', style: TextInputStyle.Short, maxLength: 200 },
    species: { label: 'Species', style: TextInputStyle.Short, maxLength: 100 },
    height: { label: 'Height', style: TextInputStyle.Short, maxLength: 50 },
    eyecolor: { label: 'Eye Color', style: TextInputStyle.Short, maxLength: 100 },
    haircolor: { label: 'Hair Color', style: TextInputStyle.Short, maxLength: 100 },
    appearance: { label: 'Appearance', style: TextInputStyle.Paragraph, maxLength: 4000 },
    armor: { label: 'Armor', style: TextInputStyle.Paragraph, maxLength: 2000 },
    weapons: { label: 'Weapons', style: TextInputStyle.Paragraph, maxLength: 2000 },
    powers: { label: 'Powers/Abilities', style: TextInputStyle.Paragraph, maxLength: 2000 },
    beliefs: { label: 'Beliefs', style: TextInputStyle.Paragraph, maxLength: 2000 },
    backstory: { label: 'Backstory', style: TextInputStyle.Paragraph, maxLength: 4000 },
  };

  const config = fieldConfigs[selectedField];
  if (!config) {
    await interaction.reply({
      content: 'Invalid field selected.',
      flags: [64],
    });
    return;
  }

  // Get current value for the field
  let currentValue = character[selectedField] || '';
  
  // Handle backstory array
  if (selectedField === 'backstory' && Array.isArray(currentValue)) {
    currentValue = currentValue.join('\n\n');
  }
  
  // Truncate if too long for modal default value (max 4000)
  if (currentValue.length > config.maxLength) {
    currentValue = currentValue.substring(0, config.maxLength);
  }

  // Create modal
  const modal = new ModalBuilder()
    .setCustomId(`characterEditModal_${selectedField}_${characterName}_${userId}`)
    .setTitle(`Edit ${config.label}`);

  const input = new TextInputBuilder()
    .setCustomId('edit_value')
    .setLabel(config.label)
    .setStyle(config.style)
    .setMaxLength(config.maxLength)
    .setRequired(false);

  // Set current value as default if it exists
  if (currentValue) {
    input.setValue(currentValue);
  }

  modal.addComponents(new ActionRowBuilder().addComponents(input));

  await interaction.showModal(modal);
};

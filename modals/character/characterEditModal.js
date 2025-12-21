const { getDb } = require('../../mongoClient');
const updateListMessage = require('../../helpercommands/updateListMessage');

module.exports = async (interaction, _client) => {
  const parts = interaction.customId.split('_');
  // Format: characterEditModal_fieldName_characterName_userId
  const fieldName = parts[1];
  const characterName = parts[2];
  const userId = parts[3];

  // Verify ownership
  if (interaction.user.id !== userId) {
    await interaction.reply({
      content: 'You can only edit your own characters.',
      flags: [64],
    });
    return;
  }

  const newValue = interaction.fields.getTextInputValue('edit_value');
  const db = getDb();
  const charactersCollection = db.collection('characters');

  try {
    // Check if character exists
    const character = await charactersCollection.findOne({ name: characterName, userId });
    if (!character) {
      await interaction.reply({
        content: 'Character not found.',
        flags: [64],
      });
      return;
    }

    // Special handling for name change - need to update the document identifier
    if (fieldName === 'name' && newValue && newValue !== characterName) {
      // Check if new name already exists
      const existingChar = await charactersCollection.findOne({ name: newValue, userId });
      if (existingChar) {
        await interaction.reply({
          content: `You already have a character named "${newValue}". Please choose a different name.`,
          flags: [64],
        });
        return;
      }

      // Update the name
      await charactersCollection.updateOne(
        { name: characterName, userId },
        { 
          $set: { 
            name: newValue,
            updatedAt: new Date()
          } 
        }
      );

      // Update the list message
      try {
        await updateListMessage(interaction.client, db, 'characters');
      } catch (e) {
        console.error('Failed to update list message:', e);
      }

      await interaction.reply({
        content: `✅ Character renamed from **${characterName}** to **${newValue}**!`,
        flags: [64],
      });
      return;
    }

    // Handle backstory - store as array if it's long
    let valueToStore = newValue;
    if (fieldName === 'backstory' && newValue && newValue.length > 2000) {
      // Split into chunks
      const chunks = [];
      let remaining = newValue;
      while (remaining.length > 0) {
        chunks.push(remaining.substring(0, 2000));
        remaining = remaining.substring(2000);
      }
      valueToStore = chunks;
    }

    // Update the field
    await charactersCollection.updateOne(
      { name: characterName, userId },
      { 
        $set: { 
          [fieldName]: valueToStore,
          updatedAt: new Date()
        } 
      }
    );

    // Field display names
    const fieldLabels = {
      name: 'Name',
      title: 'Title',
      age: 'Age',
      gender: 'Gender',
      birthplace: 'Birthplace',
      species: 'Species',
      height: 'Height',
      eyecolor: 'Eye Color',
      haircolor: 'Hair Color',
      appearance: 'Appearance',
      armor: 'Armor',
      weapons: 'Weapons',
      powers: 'Powers/Abilities',
      beliefs: 'Beliefs',
      backstory: 'Backstory',
    };

    const displayLabel = fieldLabels[fieldName] || fieldName;
    const truncatedValue = newValue && newValue.length > 100 
      ? newValue.substring(0, 100) + '...' 
      : (newValue || '(cleared)');

    await interaction.reply({
      content: `✅ **${characterName}**'s ${displayLabel} has been updated!\n\nNew value: ${truncatedValue}`,
      flags: [64],
    });

  } catch (error) {
    console.error('Error updating character:', error);
    await interaction.reply({
      content: 'An error occurred while updating the character. Please try again.',
      flags: [64],
    });
  }
};

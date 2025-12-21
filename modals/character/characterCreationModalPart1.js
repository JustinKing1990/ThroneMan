const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../mongoClient');

module.exports = async (interaction, _client) => {
  const characterName = interaction.fields.getTextInputValue('character_name');
  const characterTitle = interaction.fields.getTextInputValue('character_title');
  const characterGender = interaction.fields.getTextInputValue('character_gender');
  const characterAge = interaction.fields.getTextInputValue('character_age');
  const characterBirthplace = interaction.fields.getTextInputValue('character_birthplace');

  const db = getDb();
  const charactersCollection = db.collection('characterPending');

  try {
    await charactersCollection.updateOne(
      {
        userId: interaction.user.id,
        name: characterName,
      },
      {
        $set: {
          title: characterTitle,
          gender: characterGender,
          age: characterAge,
          birthplace: characterBirthplace,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    await interaction.reply({
      content:
        'Basic information saved! What would you like to do next?\n\n• **Continue** → Add physical details\n• **Skip** → Jump straight to submission\n• **Review** → See what you\'ve entered',
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`characterCreationButtonPart2_${characterName}`)
            .setLabel('Continue to Details')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`characterCreationFinal_${characterName}`)
            .setLabel('Skip to Submit')
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
      flags: [64],
    });
  } catch (error) {
    console.error('Failed to save character name to MongoDB:', error);
    await interaction.reply({
      content: 'There was an error saving your character name. Please try again later.',
      flags: [64],
    });
  }
};

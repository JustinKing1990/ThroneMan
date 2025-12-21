const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../mongoClient');
const wait = require('node:timers/promises').setTimeout;

module.exports = async (interaction, _client) => {
  const [_action, characterName] = interaction.customId.split('_');
  const characterHeight = interaction.fields.getTextInputValue('character_height');
  const characterSpecies = interaction.fields.getTextInputValue('character_species');
  const characterEyeColor = interaction.fields.getTextInputValue('character_eyecolor');
  const characterHairColor = interaction.fields.getTextInputValue('character_haircolor');
  const characterAppearance = interaction.fields.getTextInputValue('character_appearance');

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
          height: characterHeight,
          species: characterSpecies,
          eyecolor: characterEyeColor,
          haircolor: characterHairColor,
          appearance: characterAppearance,
        },
      },
      { upsert: true },
    );

    await interaction.update({
      content:
        'Physical details saved! What would you like to do next?\n\n• **Continue** → Add equipment & beliefs\n• **Skip** → Jump straight to submission',
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`characterCreationButtonPart3_${characterName}`)
            .setLabel('Continue to Equipment')
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

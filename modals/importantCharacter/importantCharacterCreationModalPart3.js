const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  IntegrationApplication,
} = require('discord.js');
const { getDb } = require('../../mongoClient');
const wait = require('node:timers/promises').setTimeout;

module.exports = async (interaction, _client) => {
  const [_action, characterName] = interaction.customId.split('_');
  const characterWeapons = interaction.fields.getTextInputValue('character_weapons');
  const characterArmor = interaction.fields.getTextInputValue('character_armor');
  const characterBeliefs = interaction.fields.getTextInputValue('character_beliefs');
  const characterPowers = interaction.fields.getTextInputValue('character_powers');
  const characterBackstory = [interaction.fields.getTextInputValue('character_backstory')];

  const db = getDb();
  const charactersCollection = db.collection('importantCharacterPending');

  try {
    await charactersCollection.updateOne(
      {
        userId: interaction.user.id,
        name: characterName,
      },
      {
        $set: {
          weapons: characterWeapons,
          armor: characterArmor,
          beliefs: characterBeliefs,
          powers: characterPowers,
          backstory: characterBackstory,
        },
      },
      { upsert: true },
    );

    await interaction.update({
      content:
        'Equipment & beliefs saved! What would you like to do next?\n\n• **Add More** → Include additional backstory\n• **Submit** → Send character for approval',
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`importantCharacterCreationAdditionBackstory_${characterName}`)
            .setLabel('Add More Backstory')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`importantCharacterCreationFinal_${characterName}`)
            .setLabel('Submit Character')
            .setStyle(ButtonStyle.Success),
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

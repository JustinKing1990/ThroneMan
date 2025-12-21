const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../mongoClient');
const wait = require('node:timers/promises').setTimeout;

module.exports = async (interaction, _client) => {
  const [_action, characterName] = interaction.customId.split('_');
  const characterAdditionalBackstory = interaction.fields.getTextInputValue(
    'character_additional_backstory',
  );

  const db = getDb();
  const charactersCollection = db.collection('characterPending');

  try {
    await charactersCollection.updateOne(
      {
        userId: interaction.user.id,
        name: characterName,
      },
      {
        $push: {
          backstory: characterAdditionalBackstory,
        },
      },
    );

    await interaction.update({
      content: 'Backstory entry added! Would you like to add more or submit?\n\n• **Add More** → Include additional backstory\n• **Submit** → Send character for approval',
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`characterCreationAdditionBackstory_${characterName}`)
            .setLabel('Add More Backstory')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`characterCreationFinal_${characterName}`)
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

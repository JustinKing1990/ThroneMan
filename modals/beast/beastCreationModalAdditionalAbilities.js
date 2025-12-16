const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../mongoClient');
const wait = require('node:timers/promises').setTimeout;

module.exports = async (interaction, _client) => {
  const [_action, beastName] = interaction.customId.split('_');
  const beastAbilities = interaction.fields.getTextInputValue('beast_additional_abilities');

  const db = getDb();
  const beastCollection = db.collection('bestiary');

  try {
    await beastCollection.updateOne(
      {
        name: beastName,
      },
      {
        $push: {
          abilities: beastAbilities,
        },
      },
    );

    await interaction.update({
      content:
        'Ability added! What would you like to do next?\n\n• **Add More** → Include more abilities\n• **Next** → Move to significance\n• **Skip** → Jump to submission',
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`beastCreationAdditionAbilities_${beastName}`)
            .setLabel('Add More Abilities')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`beastCreationAdditionSignificance_${beastName}`)
            .setLabel('Next: Significance')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`beastCreationFinal_${beastName}`)
            .setLabel('Skip to Submit')
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
      flags: [64],
    });
  } catch (error) {
    console.error('Failed to save beast to MongoDB:', error);
    await interaction.reply({
      content: 'There was an error saving your beast. Please try again later.',
      flags: [64],
    });
  }
};

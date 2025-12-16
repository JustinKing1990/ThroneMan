const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../mongoClient');
const wait = require('node:timers/promises').setTimeout;

module.exports = async (interaction, _client) => {
  const [_action, beastName] = interaction.customId.split('_');
  const beastSignificance = interaction.fields.getTextInputValue('beast_additional_significance');

  const db = getDb();
  const beastCollection = db.collection('bestiary');

  try {
    await beastCollection.updateOne(
      {
        name: beastName,
      },
      {
        $push: {
          significance: beastSignificance,
        },
      },
    );

    await interaction.update({
      content:
        'Significance added! What would you like to do next?\n\n• **Add More** → Include more significance\n• **Submit** → Send beast for approval',
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`beastCreationAdditionSignificance_${beastName}`)
            .setLabel('Add More Significance')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`beastCreationFinal_${beastName}`)
            .setLabel('Submit Beast')
            .setStyle(ButtonStyle.Success),
        ),
      ],
      flags: [64],
    });
  } catch (error) {
    console.error('Failed to save beast name to MongoDB:', error);
    await interaction.reply({
      content: 'There was an error saving your beast. Please try again later.',
      flags: [64],
    });
  }
};

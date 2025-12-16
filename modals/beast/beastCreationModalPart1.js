const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
('');
const { getDb } = require('../../mongoClient');

module.exports = async (interaction, _client) => {
  const beastName = interaction.fields.getTextInputValue('beast_name');
  const beastHabitat = interaction.fields.getTextInputValue('beast_habitat');
  const beastAppearance = interaction.fields.getTextInputValue('beast_appearance');
  const beastAbilities = [interaction.fields.getTextInputValue('beast_abilities')];
  const beastSignificance = [interaction.fields.getTextInputValue('beast_significance')];

  const db = getDb();
  const beastCollection = db.collection('bestiary');

  try {
    await beastCollection.updateOne(
      {
        name: beastName,
      },
      {
        $set: {
          habitat: beastHabitat,
          appearance: beastAppearance,
          abilities: beastAbilities,
          significance: beastSignificance,
        },
      },
      { upsert: true },
    );

    await interaction.reply({
      content: 'Beast created! What would you like to do next?\n\n• **Add Abilities** → Include more abilities\n• **Add Significance** → Add significance details\n• **Skip to Image** → Add image later\n• **Submit** → Send beast for approval',
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`beastCreationAdditionAbilities_${beastName}`)
            .setLabel('Add Abilities')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`beastCreationAdditionSignificance_${beastName}`)
            .setLabel('Add Significance')
            .setStyle(ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`beastCreationFinal_${beastName}`)
            .setLabel('Skip to Submit')
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

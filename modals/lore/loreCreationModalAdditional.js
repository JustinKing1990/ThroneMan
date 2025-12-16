const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../mongoClient');
const wait = require('node:timers/promises').setTimeout;

module.exports = async (interaction, _client) => {
  const [_action, loreName] = interaction.customId.split('_');
  const loreData = interaction.fields.getTextInputValue('lore_additional');

  const db = getDb();
  const loreCollection = db.collection('lore');

  try {
    await loreCollection.updateOne(
      {
        name: loreName,
      },
      {
        $push: {
          info: loreData,
        },
      },
    );

    await interaction.update({
      content:
        'Lore entry added! Would you like to add more or submit?\n\n• **Add More** → Include additional lore\n• **Submit** → Send lore for approval',
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`loreCreationAddition_${loreName}`)
            .setLabel('Add More Lore')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`loreCreationFinal_${loreName}`)
            .setLabel('Submit Lore')
            .setStyle(ButtonStyle.Success),
        ),
      ],
      flags: [64],
    });
  } catch (error) {
    console.error('Failed to save lore name to MongoDB:', error);
    await interaction.reply({
      content: 'There was an error saving your lore name. Please try again later.',
      flags: [64],
    });
  }
};

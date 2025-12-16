const {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
} = require('discord.js');

module.exports = async (interaction, _client) => {
  const modal = new ModalBuilder()
    .setCustomId('beastCreationModalPart1')
    .setTitle('Beast Creation');

  const beastNameInput = new TextInputBuilder()
    .setCustomId('beast_name')
    .setLabel("What's your beast's name?")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const beastHabitatInput = new TextInputBuilder()
    .setCustomId('beast_habitat')
    .setLabel("What's your beast's habitat")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const beastAppearanceInput = new TextInputBuilder()
    .setCustomId('beast_appearance')
    .setLabel('What does your beast look like?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const beastAbilitiesInput = new TextInputBuilder()
    .setCustomId('beast_abilities')
    .setLabel('What are your beasts abilities')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const beastSignificanceInput = new TextInputBuilder()
    .setCustomId('beast_significance')
    .setLabel("What's your beast's cultural significance")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const nameRow = new ActionRowBuilder().addComponents(beastNameInput);
  const habitatRow = new ActionRowBuilder().addComponents(beastHabitatInput);
  const appearanceRow = new ActionRowBuilder().addComponents(
    beastAppearanceInput,
  );
  const abilitiesRow = new ActionRowBuilder().addComponents(beastAbilitiesInput);
  const significanceRow = new ActionRowBuilder().addComponents(
    beastSignificanceInput,
  );

  modal.addComponents(
    nameRow,
    habitatRow,
    appearanceRow,
    abilitiesRow,
    significanceRow,
  );

  await interaction.showModal(modal);
};

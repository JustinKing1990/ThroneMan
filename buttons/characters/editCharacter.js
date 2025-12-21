const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

module.exports = async (interaction, _client) => {
  const [_action, characterName, userId] = interaction.customId.split('_');

  // Only the character owner can edit their character
  if (interaction.user.id !== userId) {
    await interaction.reply({
      content: 'You can only edit your own characters.',
      flags: [64],
    });
    return;
  }

  // Create select menu for choosing what to edit
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`editCharacterField_${characterName}_${userId}`)
    .setPlaceholder('Select a field to edit...')
    .addOptions([
      { label: 'Name', value: 'name', description: 'Change character name' },
      { label: 'Title', value: 'title', description: 'Change character title(s)' },
      { label: 'Age', value: 'age', description: 'Change character age' },
      { label: 'Gender', value: 'gender', description: 'Change character gender' },
      { label: 'Birthplace', value: 'birthplace', description: 'Change character birthplace' },
      { label: 'Species', value: 'species', description: 'Change character species' },
      { label: 'Height', value: 'height', description: 'Change character height' },
      { label: 'Eye Color', value: 'eyecolor', description: 'Change eye color' },
      { label: 'Hair Color', value: 'haircolor', description: 'Change hair color' },
      { label: 'Appearance', value: 'appearance', description: 'Change appearance description' },
      { label: 'Armor', value: 'armor', description: 'Change armor description' },
      { label: 'Weapons', value: 'weapons', description: 'Change weapons description' },
      { label: 'Powers', value: 'powers', description: 'Change powers/abilities' },
      { label: 'Beliefs', value: 'beliefs', description: 'Change beliefs/religion' },
      { label: 'Backstory', value: 'backstory', description: 'Change character backstory' },
      { label: '🖼️ Add Images', value: 'addImages', description: 'Upload new character images' },
      { label: '🗑️ Remove Images', value: 'removeImages', description: 'Remove existing images' },
    ]);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({
    content: `**Editing: ${characterName}**\nSelect which field you want to edit:`,
    components: [row],
    flags: [64],
  });
};

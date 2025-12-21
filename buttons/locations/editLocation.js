/**
 * Edit location - show field selection
 */
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getDb } = require('../../mongoClient');

module.exports = async (interaction, _client) => {
  const [_action, ...rest] = interaction.customId.split('_');
  const locationName = rest.slice(0, -1).join('_'); // Everything except last part (userId)
  const userId = rest[rest.length - 1];

  // Verify ownership or staff
  const isStaff = interaction.member.permissions.has('KickMembers');
  if (interaction.user.id !== userId && !isStaff) {
    await interaction.reply({
      content: '❌ You can only edit your own locations.',
      flags: [64],
    });
    return;
  }

  const db = getDb();
  const location = await db.collection('locations').findOne({ name: locationName });

  if (!location) {
    await interaction.reply({
      content: '❌ Location not found.',
      flags: [64],
    });
    return;
  }

  const fields = [
    { label: 'Name', value: 'name', emoji: '📍' },
    { label: 'Population', value: 'population', emoji: '👥' },
    { label: 'Government', value: 'government', emoji: '🏛️' },
    { label: 'Defense', value: 'defense', emoji: '🛡️' },
    { label: 'Commerce', value: 'commerce', emoji: '💰' },
    { label: 'Organizations', value: 'organizations', emoji: '🏢' },
    { label: 'Description', value: 'description', emoji: '📜' },
    { label: 'Crime', value: 'crime', emoji: '🗡️' },
    { label: 'Geography', value: 'geography', emoji: '🗺️' },
    { label: 'Laws', value: 'laws', emoji: '⚖️' },
    { label: 'Add Images', value: 'addImages', emoji: '📷' },
  ];

  const options = fields.map((f) => ({
    label: f.label,
    value: `${f.value}_${locationName}_${userId}`,
    emoji: f.emoji,
    description: location[f.value] ? 'Has content' : 'Empty',
  }));

  const selectMenu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('editLocationField')
      .setPlaceholder('Select a field to edit')
      .addOptions(options),
  );

  await interaction.reply({
    content: `**Editing: ${locationName}**\n\nSelect a field to edit:`,
    components: [selectMenu],
    flags: [64],
  });
};

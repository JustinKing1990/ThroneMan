/**
 * Handle field selection for location editing
 */
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getDb } = require('../../mongoClient');

module.exports = async (interaction, _client) => {
  const [fieldName, ...rest] = interaction.values[0].split('_');
  const userId = rest[rest.length - 1];
  const locationName = rest.slice(0, -1).join('_');

  // Verify ownership or staff
  const isStaff = interaction.member.permissions.has('KickMembers');
  if (interaction.user.id !== userId && !isStaff) {
    await interaction.reply({
      content: '❌ You can only edit your own locations.',
      flags: [64],
    });
    return;
  }

  if (fieldName === 'addImages') {
    // Handle image addition
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`locationImageUpload_${locationName}_${userId}`)
        .setLabel('Process Uploaded Images')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: '📷 Please upload your images in this channel, then click the button below.',
      components: [row],
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

  const fieldLabels = {
    name: 'Name',
    population: 'Population',
    government: 'Government',
    defense: 'Defense',
    commerce: 'Commerce',
    organizations: 'Organizations',
    description: 'Description',
    crime: 'Crime',
    geography: 'Geography',
    laws: 'Laws',
  };

  const modal = new ModalBuilder()
    .setCustomId(`editLocationFieldModal_${fieldName}_${locationName}_${userId}`)
    .setTitle(`Edit ${fieldLabels[fieldName] || fieldName}`);

  const isShortField = ['name', 'population'].includes(fieldName);
  const currentValue = location[fieldName] || '';

  const input = new TextInputBuilder()
    .setCustomId('fieldValue')
    .setLabel(fieldLabels[fieldName] || fieldName)
    .setStyle(isShortField ? TextInputStyle.Short : TextInputStyle.Paragraph)
    .setRequired(fieldName === 'name')
    .setMaxLength(isShortField ? 200 : 1000)
    .setValue(currentValue.substring(0, isShortField ? 200 : 1000));

  modal.addComponents(new ActionRowBuilder().addComponents(input));

  await interaction.showModal(modal);
};

/**
 * Final step - ask about images
 */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getDb } = require('../../mongoClient');

module.exports = async (interaction, _client) => {
  const [_action, ...nameParts] = interaction.customId.split('_');
  const locationName = nameParts.join('_');

  // Fetch the location data to show summary
  const db = getDb();
  const location = await db.collection('locations').findOne({
    userId: interaction.user.id,
    name: locationName,
  });

  if (!location) {
    await interaction.reply({
      content: '❌ Location data not found. Please start over.',
      flags: [64],
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#2ecc71')
    .setTitle(`📍 ${location.name}`)
    .setDescription('Your location is ready! Would you like to add images?');

  // Add a few fields as preview
  const previewFields = ['population', 'government', 'description'];
  for (const field of previewFields) {
    if (location[field]) {
      const value = location[field].length > 200 
        ? location[field].substring(0, 200) + '...' 
        : location[field];
      embed.addFields({ 
        name: field.charAt(0).toUpperCase() + field.slice(1), 
        value, 
        inline: false 
      });
    }
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`imageLocationAdditionYes_${locationName}`)
      .setLabel('Yes, Add Images')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`imageLocationAdditionNo_${locationName}`)
      .setLabel('No, Finish')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    flags: [64],
  });
};

const { EmbedBuilder } = require('discord.js');

async function handleCancelDelete(interaction, client) {
  await interaction.update({
    content: null,
    embeds: [
      new EmbedBuilder()
        .setDescription('Deletion cancelled.')
        .setColor(0x808080)
    ],
    components: []
  });
}

module.exports = handleCancelDelete;

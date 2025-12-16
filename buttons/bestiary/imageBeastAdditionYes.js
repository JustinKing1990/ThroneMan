const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../../mongoClient');
const updateListMessage = require('../../helpercommands/updateListMessage');
const config = require('../../env/config.json');

module.exports = async (interaction, _client) => {
  const db = getDb();
  const sourceCollection = db.collection('bestiary');
  const settingsCollection = db.collection('settings');
  const [_action, beastName] = interaction.customId.split('_');
  let targetChannel = await interaction.client.channels.fetch('1209676283794034728');

  try {
    const beastDocument = await sourceCollection.findOne({ name: beastName });
    if (beastDocument) {
      const reply = await interaction.update({
        content: 'Please upload your images now.',
        components: [],
        flags: [64],
      });

      const filter = (m) => m.author.id === interaction.user.id;
      const collector = interaction.channel.createMessageCollector({
        filter,
        time: 60000,
        max: 10,
      });

      collector.on('collect', async (m) => {
        const db = getDb();
        const beastCollection = db.collection('bestiary');
        const beastDocument = await beastCollection.findOne({ name: beastName });

        const imageEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('Beast Images')
          .setDescription(`Images for beast: ${beastDocument ? beastName : 'Unknown Beast'}`)
          .addFields({ name: 'Beast Name', value: beastName });

        const imageUrls = m.attachments.map((attachment) => attachment.url).join('\n');
        if (imageUrls) {
          imageEmbed.addFields({ name: 'Image URLs', value: imageUrls });
        }

        await targetChannel.send({
          embeds: [imageEmbed],
          files: m.attachments.map((attachment) => attachment.url),
        });

        await m.delete();
      });

      collector.on('end', async (collected) => {
        if (collected.size === 0) {
          const retryButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`beastCreationFinal_${beastName}`)
              .setLabel('Retry Upload')
              .setStyle(ButtonStyle.Primary),
          );

          await interaction.followUp({
            content: 'No images were uploaded in time. Click the button below to try again.',
            components: [retryButton],
            flags: [64],
          });
        }
      });
      await updateListMessage(
        interaction.client,
        interaction,
        sourceCollection,
        settingsCollection,
        config.bestiaryChannelId,
        config.bestiaryMessageId,
        'Beast',
      );
    } else {
      await interaction.update({
        content: 'No pending beast found for this name.',
        components: [],
        flags: [64],
      });
    }
  } catch (error) {
    console.error('Error processing accept button interaction:', error);
    await interaction.update({
      content: 'There was an error processing the beast approval. Yell at your local dev',
      flags: [64],
    });
  }
};

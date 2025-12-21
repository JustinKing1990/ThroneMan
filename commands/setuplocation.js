const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { getDb } = require('../mongoClient');
const { readAppConfig, appConfigPath } = require('../config');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setuplocation')
    .setDescription('Setup the location system messages')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),
  async execute(interaction) {
    await interaction.deferReply({ flags: [64] });

    const db = getDb();
    const locationsCollection = db.collection('locations');
    const settingsCollection = db.collection('settings');
    const config = readAppConfig();

    // Initialize pagination settings
    await settingsCollection.updateOne(
      { name: 'paginationSettings' },
      { $set: { locationCurrentPage: 0 } },
      { upsert: true }
    );

    // Channel IDs (use config or defaults)
    const addChannelId = config.createLocationChannelId || '1451795427853598823';
    const selectChannelId = config.locationChannelId || '1451796627999162511';

    try {
      let addMessageId = null;
      let selectMessageId = null;

      // Post "Add Location" button message (embed style like other systems)
      const addChannel = await interaction.client.channels.fetch(addChannelId);
      if (addChannel) {
        const embed = new EmbedBuilder().setDescription(
          'Click the button below to submit your location!'
        );

        const addRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('addLocation')
            .setLabel('Submit location')
            .setStyle(ButtonStyle.Primary),
        );

        const addMessage = await addChannel.send({
          embeds: [embed],
          components: [addRow],
        });
        addMessageId = addMessage.id;
      }

      // Post select menu message (just components, no embed - like other systems)
      const selectChannel = await interaction.client.channels.fetch(selectChannelId);
      if (selectChannel) {
        const locations = await locationsCollection.find({}).sort({ name: 1 }).limit(25).toArray();
        
        let components = [];
        
        if (locations.length > 0) {
          const options = locations.map((loc) => ({
            label: loc.name.length > 25 ? loc.name.substring(0, 22) + '...' : loc.name,
            value: loc.name.length > 100 ? loc.name.substring(0, 97) + '...' : loc.name,
            description: loc.population ? (loc.population.length > 50 ? loc.population.substring(0, 47) + '...' : loc.population) : undefined,
          }));

          const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('selectLocation')
              .setPlaceholder('Select the location')
              .addOptions(options),
          );
          components.push(selectMenu);
        }

        const navRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prevLocationPage')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('nextLocationPage')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(locations.length < 25),
        );
        components.push(navRow);

        const selectMessage = await selectChannel.send({
          components,
        });
        selectMessageId = selectMessage.id;
      }

      // Save message IDs to config
      config.createLocationMessageId = addMessageId || '';
      config.locationMessageId = selectMessageId || '';
      fs.writeFileSync(appConfigPath, JSON.stringify(config, null, 2));

      await interaction.editReply({
        content: '✅ Location system messages have been posted!\n\n' +
          `• Add button posted to <#${addChannelId}>\n` +
          `• Select menu posted to <#${selectChannelId}>\n\n` +
          `Message IDs saved to config.`,
      });
    } catch (error) {
      console.error('Error setting up location system:', error);
      await interaction.editReply({
        content: '❌ Failed to setup location system. Check console for errors.',
      });
    }
  },
};

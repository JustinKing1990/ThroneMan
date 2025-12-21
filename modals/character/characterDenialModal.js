const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../mongoClient');
const { createDataSummaryEmbeds } = require('../../helpercommands/processFileUpload');

module.exports = async (interaction, _client) => {
  await interaction.deferReply({ flags: [64] });
  const reason = interaction.fields.getTextInputValue('character_denial');
  const [_action, userId, characterName] = interaction.customId.split('_');
  const db = getDb();
  const pendingCollection = db.collection('characterPending');

  try {
    const characterData = await pendingCollection.findOne({
      userId: userId,
      name: characterName,
    });
    if (characterData) {
      const categoryID = '905888571079139440';
      const guild = interaction.guild;

      const privateChannel = await guild.channels.create({
        name: `${characterData.name}-denied`,
        type: 0,
        parent: categoryID,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: userId,
            allow: [PermissionsBitField.Flags.ViewChannel],
          },
        ],
      });

      // Post the character data first using embeds
      const summaryEmbeds = createDataSummaryEmbeds(characterData, 'Your Denied Submission');
      
      // Send embeds one at a time to avoid size limits
      for (const embed of summaryEmbeds) {
        await privateChannel.send({ embeds: [embed] });
      }

      // Then show the denial reason
      await privateChannel.send(
        `<@${userId}> Your character submission **${characterData.name}** was denied for the following reason:\n\n**${reason}**\n\nPlease adjust and resubmit.`,
      );

      // Finally the delete buttons
      const confirmButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`confirmDeleteChannel_${userId}_${characterName}`)
          .setLabel('Confirm and Delete Channel')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️'),
      );
      const confirmButton2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`confirmDeleteChannel_${userId}_${characterName}_repost`)
          .setLabel('Confirm, Resubmit, and Delete Channel')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️'),
      );

      await privateChannel.send({
        content:
          'Click the button below to confirm and delete this channel. This action cannot be undone.',
        components: [confirmButton, confirmButton2],
      });

      if (characterData.messageIds && characterData.messageIds.length > 0) {
        const messagesToDelete = characterData.messageIds;
        for (const messageId of messagesToDelete) {
          try {
            const messageChannel = await interaction.client.channels.fetch('1206393672271134770');
            if (messageChannel) {
              await messageChannel.messages.delete(messageId);
            }
          } catch (err) {
            console.error(`Failed to delete message ${messageId}:`, err);
          }
        }
      }

      // Delete from pending collection
      await pendingCollection.deleteOne({ userId: userId, name: characterName });

      await interaction.editReply({
        content: 'The denial process has been completed.',
        flags: [64],
      });
    } else {
      await interaction.editReply({ content: 'No character data found to deny.', flags: [64] });
    }
  } catch (error) {
    console.error('Error processing character denial:', error);
    await interaction.editReply({ content: 'There was an error processing the denial.', flags: [64] });
  }
};

const { getDb } = require('../../mongoClient');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = async (interaction, _client) => {
  // Defer immediately to prevent timeout
  await interaction.deferReply({ flags: [64] });

  // Extract userId and characterName from modal customId
  const [_modalName, userId, characterName] = interaction.customId.split('_');
  
  const reason = interaction.fields.getTextInputValue('character_denial');
  const db = getDb();
  const pendingCollection = db.collection('importantCharacterPending');

  try {
    const characterData = await pendingCollection.findOne({ userId: userId, name: characterName });
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
            id: characterData.userId,
            allow: [PermissionsBitField.Flags.ViewChannel],
          },
        ],
      });

      // Post the character data first so user can see what they submitted
      const { createDataSummaryEmbeds } = require('../../helpercommands/processFileUpload');
      const summaryEmbeds = createDataSummaryEmbeds(characterData, 'Your Denied Submission');
      
      // Send embeds one at a time to avoid size limits
      for (const embed of summaryEmbeds) {
        await privateChannel.send({ embeds: [embed] });
      }

      // Then show the denial reason
      await privateChannel.send(
        `<@${characterData.userId}> Your character submission **${characterData.name}** was denied for the following reason:\n\n**${reason}**\n\nPlease adjust and resubmit.`,
      );

      // Finally the delete button
      const confirmButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirmDeleteChannel')
          .setLabel('Confirm and Delete Channel')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️'),
      );

      await privateChannel.send({
        content:
          'Click the button below to confirm and delete this channel. This action cannot be undone.',
        components: [confirmButton],
      });

      // Delete from pending collection
      await pendingCollection.deleteOne({ userId: characterData.userId, name: characterData.name });

      // Delete review messages
      if (characterData.messageIds && characterData.messageIds.length > 0) {
        const messagesToDelete = characterData.messageIds;
        for (const messageId of messagesToDelete) {
          try {
            const messageChannel = await interaction.client.channels.fetch('1207157063357177947');
            if (messageChannel) {
              await messageChannel.messages.delete(messageId);
            }
          } catch (err) {
            console.error(`Failed to delete message ${messageId}:`, err);
          }
        }
      }

      await interaction.editReply({ content: 'The denial process has been completed.' });
    } else {
      await interaction.editReply({ content: 'No character data found to deny.' });
    }
  } catch (error) {
    console.error('Error processing character denial:', error);
    await interaction.editReply({ content: 'There was an error processing the denial.' });
  }
};

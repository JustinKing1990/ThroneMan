const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../mongoClient');

module.exports = async (interaction, _client) => {
  await interaction.deferReply({ flags: [64] });
  const reason = interaction.fields.getTextInputValue('character_denial');
  const [_action, userId, characterName] = interaction.customId.split('_');
  const db = getDb();
  const charactersCollection = db.collection('character');

  try {
    const characterData = await charactersCollection.findOne({
      userId: userId,
      name: characterName,
    });
    if (characterData) {
      let messageContent = `Character Information for ${interaction.user.username}:\n`;
      messageContent += `Name: ${characterData.name || 'N/A'}\n`;
      messageContent += `Title: ${characterData.title || 'N/A'}\n`;
      messageContent += `Gender: ${characterData.gender || 'N/A'}\n`;
      messageContent += `Age: ${characterData.age || 'N/A'}\n`;
      messageContent += `Birthplace: ${characterData.birthplace || 'N/A'}\n`;
      messageContent += `Height: ${characterData.height || 'N/A'}\n`;
      messageContent += `Species: ${characterData.species || 'N/A'}\n`;
      messageContent += `Eye Color: ${characterData.eyecolor || 'N/A'}\n`;
      messageContent += `Hair Color: ${characterData.haircolor || 'N/A'}\n`;
      messageContent += `Appearance: ${characterData.appearance || 'N/A'}\n`;
      messageContent += `Weapons: ${characterData.weapons || 'N/A'}\n`;
      messageContent += `Armor: ${characterData.armor || 'N/A'}\n`;
      messageContent += `Beliefs: ${characterData.beliefs || 'N/A'}\n`;
      messageContent += `Powers: ${characterData.powers || 'N/A'}\n`;
      messageContent += `Backstory:\n`;
      characterData.backstory.forEach((element, index) => {
        messageContent += `${element}\n`;
      });
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
            id: interaction.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel],
          },
        ],
      });

      let startIndex = 0;
      const chunkSize = 1900;

      while (startIndex < messageContent.length) {
        const endIndex = Math.min(startIndex + chunkSize, messageContent.length);
        const chunk = messageContent.substring(startIndex, endIndex);
        const isLastChunk = endIndex >= messageContent.length;

        const messageOptions = {
          content: chunk,
        };

        const sentMessage = await privateChannel.send(messageOptions);

        startIndex += chunkSize;
      }
      await privateChannel.send(
        `<@${interaction.user.id}> has denied your character submission **${characterData.name}** was denied for the following reason: ${reason}. Please adjust and resubmit.`,
      );

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

      await interaction.editReply({
        content: 'The denial process has been completed.',
        flags: [64],
      });
    } else {
      await interaction.editReply({ content: 'No character data found to deny.', flags: [64] });
    }
  } catch (error) {
    console.error('Error processing character denial:', error);
    await interaction.reply({ content: 'There was an error processing the denial.', flags: [64] });
  }
};

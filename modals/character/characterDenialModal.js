const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../mongoClient');

module.exports = async (interaction, client) => {
    const reason = interaction.fields.getTextInputValue('character_denial');
    const [action, userId, characterName] = interaction.customId.split("_")
    const db = getDb();
    const charactersCollection = db.collection('character');

    try {
        const characterData = await charactersCollection.findOne({ userId: userId, name: characterName });
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
                        id: interaction.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel],
                    },
                ],
            });

            await privateChannel.send(`<@${interaction.user.id}> Your character submission **${characterData.name}** was denied for the following reason: ${reason}. Please adjust and resubmit.`);

            const confirmButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirmDeleteChannel')
                        .setLabel('Confirm and Delete Channel')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️'),
                );

            await privateChannel.send({
                content: "Click the button below to confirm and delete this channel. This action cannot be undone.",
                components: [confirmButton],
            });

            await charactersCollection.deleteOne({ userId: interaction.user.id });

            if (characterData.messageIds && characterData.messageIds.length > 0) {
                const messagesToDelete = characterData.messageIds;
                for (const messageId of messagesToDelete) {
                    try {
                        const messageChannel = await interaction.client.channels.fetch("1206393672271134770");
                        if (messageChannel) {
                            await messageChannel.messages.delete(messageId);
                        }
                    } catch (err) {
                        console.error(`Failed to delete message ${messageId}:`, err);
                    }
                }
            }

            await interaction.reply({ content: "The denial process has been completed.", ephemeral: true });
        } else {
            await interaction.reply({ content: "No character data found to deny.", ephemeral: true });
        }
    } catch (error) {
        console.error('Error processing character denial:', error);
        await interaction.reply({ content: "There was an error processing the denial.", ephemeral: true });
    }

};

const { getDb } = require('../../mongoClient');
const config = require('../../env/config.json');
const fs = require('fs');
const path = require('path');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const updateListMessage = require('../../helpercommands/updateListMessage');


async function handleDeleteLoreInteraction(interaction) {
    const db = getDb();
    const settingsCollection = db.collection('settings');
    const loreCollection = db.collection('lore');
    const loreArchiveCollection = db.collection('loreArchive'); 

    const [action, loreId, userId] = interaction.customId.split('_');

    if (interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        try {
            
            const loreToArchive = await loreCollection.findOne({ name:loreId });
            if (loreToArchive) {
                await loreArchiveCollection.insertOne(loreToArchive);
                const deletionResult = await loreCollection.deleteOne({ name: loreId, userId: userId });

                if (deletionResult.deletedCount === 0) {
                    await interaction.reply({ content: 'No lore found or you do not have permission to delete this lore.', ephemeral: true });
                    return;
                } else {
                    await interaction.reply({ content: 'Lore successfully deleted and archived.', ephemeral: true });
                    
                }
            } else {
                await interaction.reply({ content: 'Lore not found for archiving and deletion.', ephemeral: true });
                return; 
            }
        } catch (error) {
            console.error('Error archiving and deleting lore:', error);
            await interaction.reply({ content: 'An error occurred while trying to archive and delete the lore.', ephemeral: true });
            return; 
        }
    } else {
        await interaction.reply({ content: 'You do not have permission to delete this lore.', ephemeral: true });
        return; 
    }

    
    try {
        let newLoreCollection = db.collection('lore');
        await updateListMessage(null, interaction, newLoreCollection, settingsCollection, config.loreChannelId, config.loreMessageId, "Lore");
    } catch (error) {
        console.error('Error updating lore list message:', error);
    }
}

module.exports = handleDeleteLoreInteraction;

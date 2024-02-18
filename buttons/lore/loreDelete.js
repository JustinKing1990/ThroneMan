const { getDb } = require('../../mongoClient');
const ensureMessagePosted = require('../../helpercommands/postTrackedMessage');
const config = require('../../env/config.json');
const fs = require('fs');
const path = require('path');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');

async function updateAllLoreMessage(client, loreCollection, settingsCollection) {
    const channelId = "1207322800424091668"; 
    const configPath = path.join(__dirname, '../../env/config.json');
    const messageConfigKey = 'loreMessageId'; 
    const { currentPage } = await settingsCollection.findOne({ name: 'paginationSettings' }) || { loreCurrentPage: 0 };
    const totalLore = await loreCollection.countDocuments();
    const totalPages = Math.ceil(totalLore / 25);
    const loreData = await loreCollection.find({})
        .sort({ name: 1 })
        .skip(currentPage * 25)
        .limit(25)
        .toArray();

        const loreOptions = loreData.map((lore, index) => {
            return {
                label: lore.name,
                value: `${lore.name}`
            };
        });


    const selectMenu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`selectLore`)
                .setPlaceholder('Select a lore')
                .addOptions(loreData.map(lore => ({
                    label: lore.name,
                    value: lore.name,
                }))),
        );

    
    const rowButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('prevLorePage')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('nextLorePage')
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage >= totalPages - 1),
        );

    await ensureMessagePosted(client, channelId, configPath, messageConfigKey, { components: [selectMenu, rowButtons]});
}

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
        await updateAllLoreMessage(interaction.client, newLoreCollection, settingsCollection);
    } catch (error) {
        console.error('Error updating lore list message:', error);
    }
}

module.exports = handleDeleteLoreInteraction;

const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../../mongoClient');
const updateListMessage = require('../../helpercommands/updateListMessage')
const config = require('../../env/config.json');

module.exports = async (interaction, client) => {
    await interaction.deferReply({ ephemeral: true })
    const db = getDb();
    const settingsCollection = db.collection('settings');
    const beastCollection = db.collection('bestiary');

    try {
        let { currentPage } = await settingsCollection.findOne({ name: 'paginationSettings' }) || { beastCurrentPage: 0 };

        let newPage = currentPage + 1;
        currentPage = newPage

        
        await settingsCollection.updateOne({ name: 'paginationSettings' }, { $set: { beastCurrentPage: newPage } }, { upsert: true });

        await updateListMessage(interaction.client, interaction, beastCollection, settingsCollection, config.bestiaryChannelId, config.bestiaryMessageId, "Beast");
        await interaction.deleteReply({ ephemeral: true })

    } catch (error) {
        console.error('Error processing accept button interaction:', error);
        
    }
}
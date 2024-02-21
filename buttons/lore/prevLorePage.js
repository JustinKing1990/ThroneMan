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
    const charactersCollection = db.collection('lore');

    try {
        let { currentPage } = await settingsCollection.findOne({ name: 'paginationSettings' }) || { currentPage: 0 };

        let newPage = Math.max(0, currentPage - 1);
        currentPage = newPage

        
        await settingsCollection.updateOne({ name: 'paginationSettings' }, { $set: { currentPage: newPage } }, { upsert: true });
        await updateListMessage(interaction.client, interaction, charactersCollection, settingsCollection, config.loreChannelId, config.loreMessageId, "Lore")

        await interaction.deleteReply({ ephemeral: true })

    } catch (error) {
        console.error('Error processing accept button interaction:', error);
        await interaction.update({ content: "There was an error processing the character approval. Yell at your local dev", ephemeral: true });
    }
}
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../../mongoClient');
const updateListMessage = require('../../helpercommands/updateListMessage')
const config = require('../../env/config.json');

module.exports = async (interaction, client) => {
    
    const db = getDb();
    const sourceCollection = db.collection('lore');
    const settingsCollection = db.collection('settings');
    const [action, loreName] = interaction.customId.split('_')

    try {
        const loreDocument = await sourceCollection.findOne({name: loreName });
        if (loreDocument) {

            await updateListMessage(null, interaction, sourceCollection , settingsCollection, config.loreChannelId, config.loreMessageId, "Lore");

            await interaction.update({ content: "lore approved and moved successfully.", components: [], ephemeral: true });
        } else {
            await interaction.update({ content: "No pending lore found for this name.", components: [], ephemeral: true });
        }
    } catch (error) {
        console.error('Error processing accept button interaction:', error);
        await interaction.update({ content: "There was an error processing the lore approval. Yell at your local dev", ephemeral: true });
    }
};

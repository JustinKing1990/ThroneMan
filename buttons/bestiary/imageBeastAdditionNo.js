const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../../mongoClient');
const updateListMessage = require('../../helpercommands/updateListMessage')
const config = require('../../env/config.json');

module.exports = async (interaction, client) => {
    
    const db = getDb();
    const sourceCollection = db.collection('bestiary');
    const settingsCollection = db.collection('settings');
    const [action, beastName] = interaction.customId.split('_')

    try {
        const beastDocument = await sourceCollection.findOne({name: beastName });
        if (beastDocument) {

            await updateListMessage(interaction.client, interaction, sourceCollection , settingsCollection, config.bestiaryChannelId, config.bestiaryMessageId, "Beast");

            await interaction.update({ content: "Beast moved successfully.", components: [], ephemeral: true });
        } else {
            await interaction.update({ content: "No pending beast found for this name.", components: [], ephemeral: true });
        }
    } catch (error) {
        console.error('Error processing accept button interaction:', error);
        await interaction.update({ content: "There was an error processing the lore approval. Yell at your local dev", ephemeral: true });
    }
};

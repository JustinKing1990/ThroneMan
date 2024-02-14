const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../mongoClient');
const ensureMessagePosted = require('../helpercommands/postTrackedMessage')
const config = require('../env/config.json');

async function updateAllLoreMessage(client, loreCollection, settingsCollection) {
    const channelId = "1207322800424091668"; 
    const configPath = path.join(__dirname, '../env/config.json');
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
                .setCustomId('selectLore')
                .setPlaceholder('Select a lore')
                .addOptions(loreData.map(lore => ({
                    label: lore.name,
                    value: lore.name,
                }))),
        );

    // Generate rowButtons for pagination
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
module.exports = async (interaction, client) => {
    await interaction.deferReply({ ephemeral: true })
    const db = getDb();
    const settingsCollection = db.collection('settings');
    const charactersCollection = db.collection('characters');

    try {
        let { currentPage } = await settingsCollection.findOne({ name: 'paginationSettings' }) || { loreCurrentPage: 0 };
        
        let newPage = currentPage + 1;
        currentPage = newPage

        // Update the currentPage in the database
        await settingsCollection.updateOne({ name: 'paginationSettings' }, { $set: { loreCurrentPage: newPage } }, { upsert: true });

        await updateAllLoreMessage(interaction.client, charactersCollection, settingsCollection);
        await interaction.deleteReply({ephemeral: true})

    } catch (error) {
        console.error('Error processing accept button interaction:', error);
        // await interaction.update({ content: "There was an error processing the character approval. Yell at your local dev", ephemeral: true });
    }
}
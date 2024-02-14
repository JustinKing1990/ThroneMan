const postTrackedMessage = require('../helpercommands/postTrackedMessage');
const config = require('../env/config.json');
const {getDb} = require('../mongoClient');


async function updateAllLoresMessage(client, loresCollection, settingsCollection) {
    const channelId = "1207322800424091668"; 
    const configPath = path.join(__dirname, '../env/config.json');
    const messageConfigKey = 'loreMessageId'; 
    const { currentPage } = await settingsCollection.findOne({ name: 'paginationSettings' }) || { loreCurrentPage: 0 };
    const totallores = await loresCollection.countDocuments();
    const totalPages = Math.ceil(totallores / 25);
    const loresData = await loresCollection.find({})
        .sort({ name: 1 })
        .skip(currentPage * 25)
        .limit(25)
        .toArray();

    // Generate selectMenu for lores
    const selectMenu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('selectLore')
                .setPlaceholder('Select a lore')
                .addOptions(loresData.map(lore => ({
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

    await ensureMessagePosted(client, channelId, configPath, messageConfigKey, { components: [selectMenu, rowButtons] });
}

module.exports = async (interaction, client) => {
    
    await interaction.deferUpdate({ ephemeral: true })
    const db = getDb();
    const sourceCollection = db.collection('lore');
    const settingsCollection = db.collection('settings');
    const [action, userId, loreName] = interaction.customId.split('_')

    try {
        const loreDocument = await sourceCollection.findOne({name: loreName });

        if (loreDocument) {


            const announcementChannel = await interaction.client.channels.fetch("905150985712861274"); 
            await announcementChannel.send(`<@${userId}>, your lore: ${loreDocument.name} has been accepted! 🎉 Please check <#${"905554690966704159"}> for your lore.`);


            await updateAllloresMessage(client, targetCollection, settingsCollection);

            await interaction.followUp({ content: "lore approved and moved successfully.", ephemeral: true });
        } else {
            await interaction.followUp({ content: "No pending lore found for this user.", ephemeral: true });
        }
    } catch (error) {
        console.error('Error processing accept button interaction:', error);
        await interaction.update({ content: "There was an error processing the lore approval. Yell at your local dev", ephemeral: true });
    }
};

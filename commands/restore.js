const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField, SlashCommandBuilder } = require('discord.js');
const { getDb } = require('../mongoClient');

async function generateSelectMenu(interaction, collectionName, page = 0) {
    const db = getDb();
    const collection = db.collection(collectionName);

    // Constants for pagination
    const itemsPerPage = 25;
    const totalItems = await collection.countDocuments();
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Fetching items for the current page
    const items = await collection.find().skip(page * itemsPerPage).limit(itemsPerPage).toArray();

    // Generate options for the select menu
    let options = await Promise.all(items.map(async (item) => {
        let description = 'N/A';
        if (['characterArchive', 'importantCharacterArchive'].includes(collectionName)) {
            try {
                const user = await interaction.client.users.fetch(item.userId);
                description = user ? `Owner: ${user.displayName}` : 'Owner not found';
            } catch {
                description = 'Failed to fetch owner';
            }
        }
        
        return {
            label: item.name.substring(0, 100), // Ensure label is within length limits
            value: item.name, // Ensure value is within length limits, assuming _id can be converted to string
            description: description.substring(0, 100) // Ensure description is within length limits
        };
    }));

    // Previous and Next buttons
    const rowButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`prev_${collectionName}_${page - 1}`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page <= 0),
            new ButtonBuilder()
                .setCustomId(`next_${collectionName}_${page + 1}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages - 1),
        );

    // Select menu with items
    const selectMenu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`select_${collectionName}_${page}`)
                .setPlaceholder('Select an item')
                .addOptions(options),
        );

    // Respond to the interaction with the select menu and buttons
    await interaction.update({ components: [selectMenu, rowButtons], ephemeral: true });
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('restore')
        .setDescription('Allows the restoration from the various archives.')
        .addStringOption(option =>
            option.setName('archive')
                .setDescription('The archive to restore from.')
                .setRequired(true)
                .addChoices(
                    { name: 'Characters', value: 'characterArchive' },
                    { name: 'Important Characters', value: 'importantCharacterArchive' },
                    { name: 'Lore', value: 'loreArchive' }
                ))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const archiveOption = interaction.options.getString('archive');
        await generateSelectMenu(interaction, archiveOption);
    }
};

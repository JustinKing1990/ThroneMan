const { getDb } = require('../../mongoClient');
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, InteractionWebhook } = require('discord.js');
const config = require('../../env/config.json')

module.exports = async (interaction, client) => {
    await interaction.deferReply({ ephemeral: true })
    const db = getDb();
    const settingsCollection = db.collection('settings');
    const charactersCollection = db.collection('characters');

    try {
        let { currentPage } = await settingsCollection.findOne({ name: 'paginationSettings' }) || { currentPage: 0 };

        let newPage = Math.max(0, currentPage - 1);
        currentPage = newPage

        
        await settingsCollection.updateOne({ name: 'paginationSettings' }, { $set: { currentPage: newPage } }, { upsert: true });

        
        const totalCharacters = await charactersCollection.countDocuments();
        const totalPages = Math.ceil(totalCharacters / 25);
        const charactersData = await charactersCollection.find({})
            .sort({ name: 1 })
            .skip(newPage * 25)
            .limit(25)
            .toArray();


        const characterOptions = charactersData.map(character => ({
            label: character.name,
            value: `${character.name}::${character.userId}`
        }));

        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('selectCharacter')
                    .setPlaceholder('Select a character')
                    .addOptions(characterOptions),
            );

        const rowButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('prevPage')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('nextPage')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= totalPages - 1),
            );

        const allCharactersChannel = await interaction.client.channels.fetch("905554690966704159"); 
        const allCharactersMessageId = config.allCharacterMessage
        let allCharacterMessageExists = false;

        try {
            const message = await allCharactersChannel.messages.fetch(allCharactersMessageId);
            allCharacterMessageExists = true;
            await message.edit({ content: "Select a character to view more information:", components: [selectMenu, rowButtons] });
        } catch (error) {
        }

        if (allCharacterMessageExists) {
            allCharactersMessage = await allCharactersChannel.messages.fetch(allCharactersMessageId);
            await allCharactersMessage.edit({ content: "Select a character to view more information:", components: [selectMenu, rowButtons] });
        } else {
            allCharactersMessage = await allCharactersChannel.send({ content: "Select a character to view more information:", components: [selectMenu, rowButtons] });
            config.allCharacterMessage = allCharactersMessage.id;
            fs.writeFileSync(path.join(__dirname, '../env/config.json'), JSON.stringify(config, null, 2));
        }

        await interaction.deleteReply({ ephemeral: true })

    } catch (error) {
        console.error('Error processing accept button interaction:', error);
        await interaction.update({ content: "There was an error processing the character approval. Yell at your local dev", ephemeral: true });
    }
}
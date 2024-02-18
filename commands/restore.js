const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getDb } = require('../mongoClient'); 

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

        const db = getDb();
        const collectionToUse = interaction.options.getString('archive');
        const collection = db.collection(collectionToUse);

        
        
    },
};

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField, SlashCommandBuilder } = require('discord.js');
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
        
    }
};

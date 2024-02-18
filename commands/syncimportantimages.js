const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getDb } = require('../mongoClient'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('syncimportantimages')
        .setDescription('Updates embeds with the correct user ID based on character names.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const channelId = '1206381988559323166'; 
        const channel = await interaction.client.channels.fetch(channelId);
        const db = getDb();
        const charactersCollection = db.collection('importantCharacters');

        if (!channel.isTextBased()) {
            await interaction.editReply('The specified channel is not text-based.');
            return;
        }

        let messages;
        let lastId;

        while (true) {
            messages = await channel.messages.fetch({ limit: 100, ...(lastId && { before: lastId }) });
            if (messages.size === 0) break;

            for (const message of messages.values()) {
                for (const embed of message.embeds) {
                    const characterNameField = embed.fields.find(field => field.name === 'Character Name');
                    if (characterNameField) {
                        const characterName = characterNameField.value;
                        const characterDocument = await charactersCollection.findOne({ name: characterName });
                        if (characterDocument) {
                            const userIdFieldIndex = embed.fields.findIndex(field => field.name === 'User ID');
                            if (userIdFieldIndex !== -1) {
                                embed.fields[userIdFieldIndex].value = characterDocument.userId.toString();
                                const updatedEmbed = new EmbedBuilder(embed.toJSON());
                                await message.edit({ embeds: [updatedEmbed] }).catch(console.error);
                            }
                        }
                    }
                }
            }

            lastId = messages.lastKey();
        }

        await interaction.editReply('Embeds have been updated with the correct user IDs.');
    },
};

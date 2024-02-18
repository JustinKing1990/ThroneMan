const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getDb } = require('../../mongoClient');
const postCharacterInfo = require('../../helpercommands/postCharacterInfo');

module.exports = async (interaction, client) => {
    const [action, characterName] = interaction.customId.split('_');
    let targetChannel = await interaction.client.channels.fetch('1206381988559323166');

    const role = interaction.guild.roles.cache.find(role => role.name === 'Character Image Upload');
    if (!role) {
        await interaction.editReply({ content: 'Role not found. Please ensure the role exists and the bot has the appropriate permissions.', ephemeral: true });
        return;
    }

    try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        await member.roles.add(role);

        
        const reply = await interaction.update({
            content: "You've been assigned the 'Character Image Upload' role. Please upload your images now.",
            components: [],
            ephemeral: true
        });

        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async m => {
            const db = getDb();
            const charactersCollection = db.collection('characters');
            const characterDocument = await charactersCollection.findOne({ userId: interaction.user.id, name: characterName });

            const imageEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Character Images')
                .setDescription(`Images for character: ${characterName ? characterName : "Unknown Character"}`)
                .addFields(
                    { name: 'User ID', value: interaction.user.id.toString() },
                    { name: 'Character Name', value: characterName }
                );

            const imageUrls = m.attachments.map(attachment => attachment.url).join('\n');
            if (imageUrls) {
                imageEmbed.addFields({ name: 'Image URLs', value: imageUrls });
            }

            await targetChannel.send({
                embeds: [imageEmbed],
                files: m.attachments.map(attachment => attachment.url)
            });

            await m.delete();
            await member.roles.remove(role);
        });
 
        collector.on('end', async collected => {
            if (collected.size === 0) {
                const retryButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`characterCreationFinal_${characterName}`) 
                            .setLabel('Retry Upload')
                            .setStyle(ButtonStyle.Primary), 
                    );
        
                await interaction.followUp({
                    content: "No images were uploaded in time. Click the button below to try again.",
                    components: [retryButton],
                    ephemeral: true
                });
            } else {
                try {
                    await postCharacterInfo(interaction, client, characterName);
                    await interaction.deleteReply(); 
                    await interaction.followUp({ content: "Character information has been processed and will be posted for staff approval.", ephemeral: true });
                } catch (error) {
                    console.error('Failed to post character information:', error);
                    await interaction.followUp({ content: "There was an error processing your character information request.", ephemeral: true });
                }
            }
            await member.roles.remove(role).catch(console.error);
        });
    } catch (error) {
        console.error('Error during the process:', error);
        await interaction.followUp({ content: 'There was an error processing your request. Please try again or contact an administrator.', ephemeral: true });
    }
};

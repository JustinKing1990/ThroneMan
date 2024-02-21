const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
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
    let targetChannel = await interaction.client.channels.fetch('1207398646035910726');

    try {
        const loreDocument = await sourceCollection.findOne({name: loreName });
        if (loreDocument) {

            
            

            const reply = await interaction.update({
                content: "Please upload your images now.",
                components: [],
                ephemeral: true
            });

            const filter = m => m.author.id === interaction.user.id;
            const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 10 });
    
            collector.on('collect', async m => {
                const db = getDb();
                const loreCollection = db.collection('lore');
                const loreDocument = await loreCollection.findOne({ name: loreName });
    
                const imageEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('Lore Images')
                    .setDescription(`Images for lore: ${loreDocument ? loreName : "Unknown Lore"}`)
                    .addFields(
                        { name: 'Lore Name', value: loreName}
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
            });
     
            collector.on('end', async collected => {
                if (collected.size === 0) {
                    const retryButton = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`loreCreationFinal_${loreName}`) 
                                .setLabel('Retry Upload')
                                .setStyle(ButtonStyle.Primary), 
                        );
            
                    await interaction.followUp({
                        content: "No images were uploaded in time. Click the button below to try again.",
                        components: [retryButton],
                        ephemeral: true
                    });
                } 
            });
            await updateListMessage(interaction.client, interaction, sourceCollection , settingsCollection, config.loreChannelId, config.loreMessageId, "Lore");
 
            
        } else {
            await interaction.update({ content: "No pending lore found for this name.", components: [], ephemeral: true });
        }
    } catch (error) {
        console.error('Error processing accept button interaction:', error);
        await interaction.update({ content: "There was an error processing the lore approval. Yell at your local dev", ephemeral: true });
    }
};

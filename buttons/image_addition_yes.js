const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getDb } = require('../mongoClient');
const postCharacterInfo = require('../helpercommands/postCharacterInfo');
const { post } = require('request');

module.exports = async (interaction, client) => {
    // Assuming 'targetChannel' is the channel where images should be posted
    let targetChannel = await interaction.client.channels.fetch('1206381988559323166');

    // Assign "Character Image Upload" role to the user
    const role = interaction.guild.roles.cache.find(role => role.name === 'Character Image Upload');
    if (role) {
        const member = interaction.guild.members.cache.get(interaction.user.id);
        await member.roles.add(role).then(async () => {
            // Inform the user they can now upload images
            await interaction.reply({
                content: "You've been assigned the 'Character Image Upload' role. Please upload your images now.",
                components: [],
                ephemeral: true
            });

            // Set up a message collector to listen for the next message from this user
            const filter = m => m.author.id === interaction.user.id;
            const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

            collector.on('collect', async m => {
                // Fetch character name for the post content
                const db = getDb();
                const charactersCollection = db.collection('character');
                const characterDocument = await charactersCollection.findOne({ userId: interaction.user.id });
                let characterName = characterDocument ? characterDocument.name : "Unknown Character";

                let contentToPost = `Image from: ${characterName} (${interaction.user.id})\n`;

                // Check for image attachments
                if (m.attachments.size > 0) {
                    m.attachments.forEach(attachment => {
                        if (/\.(jpeg|jpg|gif|png)$/i.test(attachment.name)) {
                            contentToPost += attachment.url + '\n';
                        }
                    });
                }

                // Check for links in the message content
                const urlMatches = m.content.match(/\bhttps?:\/\/\S+/gi);
                if (urlMatches) {
                    contentToPost += urlMatches.join('\n');
                }

                // Send the collected images or links to the target channel
                if (contentToPost.length > `Image for: ${characterName} by: (${interaction.user.id})\n`.length) {
                    targetChannel.send(contentToPost).then(async () => {
                        if (m.deletable) {
                            await m.delete();
                            await member.roles.remove(role)
                        }
                    });
                    await interaction.deleteReply();
                    await postCharacterInfo(interaction, client)
                        .then(() => {
                            interaction.followUp({ content: "Character information will be posted.", ephemeral: true });
                        })
                        .catch(error => {
                            console.error('Failed to post character information:', error);
                            interaction.followUp({ content: "There was an error processing your request.", ephemeral: true });
                        });
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.followUp({ content: "No images were uploaded in time.", ephemeral: true });
                }
            });



        }).catch(error => {
            console.error('Error assigning role:', error);
            interaction.update({ content: 'There was an error assigning the role. Please try again or contact an administrator.', ephemeral: true });
        });
    } else {
        interaction.reply({ content: 'Role not found. Please ensure the role exists and the bot has the appropriate permissions.', ephemeral: true });
    }
};

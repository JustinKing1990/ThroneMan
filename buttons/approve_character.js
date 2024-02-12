const { getDb } = require('../mongoClient');

module.exports = async (interaction, client) => {
    const db = getDb();
    const sourceCollection = db.collection('character');
    const targetCollection = db.collection('characters');

    try {
        const characterDocument = await sourceCollection.findOne({ userId: interaction.user.id });

        if (characterDocument) {
            // Insert into the target collection
            await targetCollection.insertOne(characterDocument);
            // Delete from the source collection
            await sourceCollection.deleteOne({ userId: interaction.user.id });

            // Delete associated messages if there are any messageIds
            if (characterDocument.messageIds && characterDocument.messageIds.length > 0) {
                const targetChannel = await interaction.client.channels.fetch("1206393672271134770"); // Channel ID where messages were posted
                for (const messageId of characterDocument.messageIds) {
                    try {
                        await targetChannel.messages.delete(messageId);
                    } catch (msgError) {
                        console.error(`Failed to delete message ${messageId}:`, msgError);
                    }
                }
            }

            // Notify the user in the specified channel about their character's acceptance
            const announcementChannel = await interaction.client.channels.fetch("904144926135164959"); // Update with your channel ID
            await announcementChannel.send(`<@${interaction.user.id}>, your character: ${characterDocument.name} has been accepted! 🎉`);

            // await interaction.update({ content: "Character approved and moved successfully.", ephemeral: true });
        } else {
            await interaction.update({ content: "No pending character found for this user.", ephemeral: true });
        }
    } catch (error) {
        console.error('Error processing accept button interaction:', error);
        await interaction.update({ content: "There was an error processing the character approval. Yell at your local dev", ephemeral: true });
    }
};


module.exports = async (interaction, client) => {
    try {
        await interaction.channel.delete();
        console.log("Channel deleted successfully.");
    } catch (error) {
        console.error('Error deleting the channel:', error);
    }
};

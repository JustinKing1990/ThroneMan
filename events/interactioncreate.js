const fs = require('fs');
const path = require('path');

module.exports = {
    name: "interactionCreate",
    async execute(interaction, client) {
        // Handle command interactions
        if (interaction.isCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (command) {
                await command.execute(interaction, client);
            }
        }
        // Handle button interactions
        else if (interaction.isButton()) {

            const parts = interaction.customId.split('_');
            const action = parts[0]; 
            const params = parts.slice(1);

            const buttonHandlerPath = path.join(__dirname, '..', 'buttons', `${action}.js`);
            if (fs.existsSync(buttonHandlerPath)) {
                const buttonHandler = require(buttonHandlerPath);
                await buttonHandler(interaction, client);
            }
        }
        // Handle modal submit interactions
        else if (interaction.isModalSubmit()) {

            const parts = interaction.customId.split('_');
            const action = parts[0]; 
            const params = parts.slice(1);


            const modalHandlerPath = path.join(__dirname, '..', 'modals', `${action}.js`);
            if (fs.existsSync(modalHandlerPath)) {
                const modalHandler = require(modalHandlerPath);
                await modalHandler(interaction, client);
            }
        }

        // Handle select menu interations
        if (interaction.isStringSelectMenu()) {

            const parts = interaction.customId.split('_');
            const action = parts[0]; 
            const params = parts.slice(1);

            const selectMenuHandlerPath = path.join(__dirname, '..', 'selectMenus', `${interaction.customId}.js`);
            if (fs.existsSync(selectMenuHandlerPath)) {
                const selectMenuHandler = require(selectMenuHandlerPath);
                await selectMenuHandler(interaction, client);
            }
        }
    }
};

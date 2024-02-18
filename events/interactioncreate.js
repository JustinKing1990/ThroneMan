const fs = require('fs');
const path = require('path');

function loadHandlers(dirPath) {
    let handlers = new Map();

    const traverseDirectories = (dir) => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) {
                traverseDirectories(fullPath);
            } else if (file.name.endsWith('.js')) {
                const handler = require(fullPath);
                let handlerName = path.relative(dirPath, fullPath).replace(/\\/g, '/').replace('.js', '');
                handlerName = handlerName.split('/');
                handlers.set(handlerName[1], handler);
            }
        }
    };

    traverseDirectories(dirPath);
    return handlers;
}


const commandHandlers = loadHandlers(path.join(__dirname, '..', 'commands'));
const buttonHandlers = loadHandlers(path.join(__dirname, '..', 'buttons'));
const modalHandlers = loadHandlers(path.join(__dirname, '..', 'modals'));
const selectMenuHandlers = loadHandlers(path.join(__dirname, '..', 'selectMenus'));

module.exports = {
    name: "interactionCreate",
    async execute(interaction, client) {
        
        if (interaction.isCommand()) {
            const command = commandHandlers.get(interaction.commandName);
            if (command) {
                await command.execute(interaction, client);
            }
        }
        
        else if (interaction.isButton()) {
            const parts = interaction.customId.split('_');
            const action = parts[0]; 
            const buttonHandler = buttonHandlers.get(action);
            if (buttonHandler) {
                await buttonHandler(interaction, client);
            }
        }
        
        else if (interaction.isModalSubmit()) {
            const parts = interaction.customId.split('_');
            const action = parts[0]; 
            const modalHandler = modalHandlers.get(action);
            if (modalHandler) {
                await modalHandler(interaction, client);
            }
        }
        
        if (interaction.isStringSelectMenu()) {
            const selectMenuHandler = selectMenuHandlers.get(interaction.customId);
            if (selectMenuHandler) {
                await selectMenuHandler(interaction, client);
            }
        }
    }
};

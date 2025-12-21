const fs = require('fs');
const path = require('path');

function loadHandlers(dirPath) {
  let handlers = new Map();

  const traverseDirectories = (dir, base = '') => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        traverseDirectories(fullPath, `${base}${file.name}/`);
      } else if (file.name.endsWith('.js')) {
        const handler = require(fullPath);
        let handlerName = file.name.replace('.js', '');
        handlers.set(handlerName, handler);
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
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isCommand() || interaction.isContextMenuCommand()) {
      // Try exact match first, then try converting spaces to camelCase for context menus
      let command = commandHandlers.get(interaction.commandName);
      
      if (!command) {
        // Convert "Lookup Character" to "lookupCharacter"
        const camelCaseName = interaction.commandName
          .split(' ')
          .map((word, index) => index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join('');
        command = commandHandlers.get(camelCaseName);
      }
      
      if (command) {
        try {
          await command.execute(interaction, client);
        } catch (error) {
          console.error(`[Error] Command ${interaction.commandName} failed:`, error);
          try {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: 'An error occurred while executing this command.', flags: [64] });
            } else {
              await interaction.editReply({ content: 'An error occurred while executing this command.' });
            }
          } catch (replyError) {
            console.error(`[Error] Failed to send error response:`, replyError);
          }
        }
      }
    } else if (interaction.isButton()) {
      const parts = interaction.customId.split('_');
      const action = parts[0];
      const buttonHandler = buttonHandlers.get(action);
      if (buttonHandler) {
        // Handle both direct function exports and object exports
        if (typeof buttonHandler === 'function') {
          await buttonHandler(interaction, client);
        } else if (typeof buttonHandler === 'object') {
          // Look for a handler function in the object - prioritize the prompt handler
          const capitalizedAction = action.charAt(0).toUpperCase() + action.slice(1);
          const handlerFn = buttonHandler.execute || 
                           buttonHandler[`handle${capitalizedAction}Interaction`] ||
                           buttonHandler[`handle${capitalizedAction}`];
          if (handlerFn) {
            await handlerFn(interaction, client);
          } else {
            console.error(`No handler function found for button action: ${action}`);
          }
        }
      }
    } else if (interaction.isModalSubmit()) {
      const parts = interaction.customId.split('_');
      const action = parts[0];
      const modalHandler = modalHandlers.get(action);
      if (modalHandler) {
        await modalHandler(interaction, client);
      }
    }

    if (interaction.isStringSelectMenu()) {
      // Try exact match first
      let selectMenuHandler = selectMenuHandlers.get(interaction.customId);

      // If no exact match, try prefix match for dynamic IDs
      if (!selectMenuHandler) {
        const prefix = interaction.customId.split('_')[0];
        // Try prefix + Selection pattern (e.g., restoreSelection)
        selectMenuHandler = selectMenuHandlers.get(`${prefix}Selection`);
        
        // If still no match, try just the prefix (e.g., editCharacterField)
        if (!selectMenuHandler) {
          selectMenuHandler = selectMenuHandlers.get(prefix);
        }
      }

      if (selectMenuHandler) {
        try {
          if (selectMenuHandler.execute) {
            await selectMenuHandler.execute(interaction, client);
          } else {
            await selectMenuHandler(interaction, client);
          }
        } catch (error) {
          console.error(`[SelectMenu] Handler error:`, error);
          try {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: 'An error occurred.', flags: [64] });
            } else {
              await interaction.editReply({ content: 'An error occurred while processing your selection.' });
            }
          } catch (replyError) {
            // Silent fail
          }
        }
      }
    }
  },
};

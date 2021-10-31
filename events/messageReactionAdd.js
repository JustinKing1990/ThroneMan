module.exports = {
    name: "messageReactionAdd",
    once: false,
    execute(reaction, user) {
        const config = require('../env/config.json');
        let roleToAdd = "";
        let roleToRemove = "";
        let message = reaction.message, emoji = reaction.emoji, member = reaction.message.guild.members.cache.get(user.id)
        if (message.id === config.genderMessage) {

        }
        switch (message.id) {
            case config.genderMessage:
                switch (emoji.name) {
                    case '🔵':
                        roleToAdd = message.guild.roles.cache.get('904213405240528968');
                        member.roles.add(role);
                        break;
                    case '🟣':
                        roleToAdd = message.guild.roles.cache.get('904213449813426186');
                        member.roles.add(role);
                        break;
                    case '🟡':
                        roleToAdd = message.guild.roles.cache.get('904213530255958027');
                        member.roles.add(role);
                        break;
                    default:
                        message.reactions.cache.get(emoji.id).remove();
                }
                break;
            case config.rulesMessage:
                if(emoji.name === "✅"){
                    roleToAdd = message.guild.roles.cache.get('904410613655146518');
                    roleToRemove = message.guild.roles.cache.get('904410457304092722');
                    member.roles.add(roleToAdd);
                    member.roles.remove(roleToRemove);
                } else {
                    message.reactions.cache.get(emoji.id).remove();
                }
                break;
            case config.introMessage:
                if(emoji.name === "✅"){
                    roleToRemove = message.guild.roles.cache.get('904410613655146518');
                    roleToAdd = message.guild.roles.cache.get('904410659922526258');
                    member.roles.add(roleToAdd);
                    member.roles.remove(roleToRemove);
                } else {
                    message.reactions.cache.get(emoji.id).remove();
                }
                break;
            case config.characterMakingMessage: 
                if(emoji.name === "✅"){
                    roleToRemove = message.guild.roles.cache.get('904410659922526258');
                    roleToAdd = message.guild.roles.cache.get('904410746736214146');
                    member.roles.add(roleToAdd);
                    member.roles.remove(roleToRemove);
                } else {
                    message.reactions.cache.get(emoji.id).remove();
                }
                break;
            case config.adventurerMessage:
                if(emoji.name === "✅"){
                    roleToRemove = message.guild.roles.cache.get('904410746736214146');
                    roleToAdd = message.guild.roles.cache.get('904414276817670265');
                    member.roles.add(roleToAdd);
                    member.roles.remove(roleToRemove);
                } else {
                    message.reactions.cache.get(emoji.id).remove();
                }
                break;
            case config.worldEventMessage:
                if(emoji.name === "✅"){
                    roleToRemove = message.guild.roles.cache.get('904410746736214146');
                    roleToAdd = message.guild.roles.cache.get('904218067339468800');
                    member.roles.add(roleToAdd);
                    member.roles.remove(roleToRemove);
                } else {
                    message.reactions.cache.get(emoji.id).remove();
                }
                    
        }
    },
};
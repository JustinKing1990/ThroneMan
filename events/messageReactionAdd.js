const { Permissions } = require('discord.js');
module.exports = {
    name: "messageReactionAdd",
    once: false,
    async execute(reaction, user) {
        const config = require('../env/config.json');
        let roleToAdd = "";
        let roleToRemove = "";
        let message = reaction.message, emoji = reaction.emoji, member = reaction.message.guild.members.cache.get(user.id)
        const approve = require('../helpercommands/approve')
        const update = require('../helpercommands/update')
        const review = require('../helpercommands/inreview')
        if (reaction.partial) {
            await reaction.fetch();
        }

        switch (message.id) {
            case config.genderMessage:
                switch (emoji.name) {
                    case '🔵':
                        roleToAdd = message.guild.roles.cache.get('904213405240528968');
                        member.roles.add(roleToAdd);
                        break;
                    case '🟣':
                        roleToAdd = message.guild.roles.cache.get('904213449813426186');
                        member.roles.add(roleToAdd);
                        break;
                    case '🟡':
                        roleToAdd = message.guild.roles.cache.get('904213530255958027');
                        member.roles.add(roleToAdd);
                        break;
                    default:
                        message.reactions.cache.get(emoji.id).remove();
                }
                break;
            case config.rulesMessage:
                if (emoji.name === "✅") {
                    roleToAdd = message.guild.roles.cache.get('904410613655146518');
                    roleToRemove = message.guild.roles.cache.get('904410457304092722');
                    member.roles.add(roleToAdd);
                    member.roles.remove(roleToRemove);
                } else {
                    message.reactions.cache.get(emoji.id).remove();
                }
                break;
            case config.introMessage:
                if (emoji.name === "✅") {
                    roleToRemove = message.guild.roles.cache.get('904410613655146518');
                    roleToAdd = message.guild.roles.cache.get('904410659922526258');
                    member.roles.add(roleToAdd);
                    member.roles.remove(roleToRemove);
                } else {
                    message.reactions.cache.get(emoji.id).remove();
                }
                break;
            case config.characterMakingMessage:
                if (emoji.name === "✅") {
                    roleToRemove = message.guild.roles.cache.get('904410659922526258');
                    roleToAdd = message.guild.roles.cache.get('904410746736214146');
                    member.roles.add(roleToAdd);
                    member.roles.remove(roleToRemove);
                } else {
                    message.reactions.cache.get(emoji.id).remove();
                }
                break;
            case config.adventurerMessage:
                if (emoji.name === "✅") {
                    roleToRemove = message.guild.roles.cache.get('904410746736214146');
                    roleToAdd = message.guild.roles.cache.get('904414276817670265');
                    member.roles.add(roleToAdd);
                    member.roles.remove(roleToRemove);
                } else {
                    message.reactions.cache.get(emoji.id).remove();
                }
                break;
            case config.worldEventMessage:
                if (emoji.name === "✅") {
                    roleToRemove = message.guild.roles.cache.get('904410746736214146');
                    roleToAdd = message.guild.roles.cache.get('904218067339468800');
                    member.roles.add(roleToAdd);
                    member.roles.remove(roleToRemove);
                    roleToRemove = message.guild.roles.cache.get('904414276817670265');
                    member.roles.remove(roleToRemove)
                } else {
                    message.reactions.cache.get(emoji.id).remove();
                }
            default:
                if (emoji.name === "greencheck" && (message.channel === message.guild.channels.cache.get('904144801388175470') || message.channel === message.guild.channels.cache.get('904208920141242439')) && message.guild.members.cache.get(user.id).permissions.has([Permissions.FLAGS.MANAGE_CHANNELS])) {
                    try {

                        if (!message.author.bot) {
                            approve.execute(message, reaction, user);
                        }

                    } catch (error) {
                        console.log(error)
                    }
                } else if (emoji.name === "update" && message.channel === message.guild.channels.cache.get('904566520846352474') && message.guild.members.cache.get(user.id).permissions.has([Permissions.FLAGS.MANAGE_CHANNELS])) {
                    try {
                        if (!message.author.bot) {
                            update.execute(message, reaction, user);
                        }
                    } catch (error) {
                        console.log(error)
                    }
                } else if (emoji.name === "inreview" && message.channel === message.guild.channels.cache.get('904144801388175470') && message.guild.members.cache.get(user.id).permissions.has([Permissions.FLAGS.MANAGE_CHANNELS])) {
                    try {
                        if (!message.author.bot) {
                            console.log('here')
                            review.execute(message, reaction, user);
                        }
                    } catch (err) {
                        console.error(err)
                    }
                }
                break;
        }
    },
};
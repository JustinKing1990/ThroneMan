const { Permissions } = require('discord.js');
module.exports = {
    name: "messageReactionRemove",
    once: false,
    async execute(reaction, user) {
        const config = require('../env/config.json');
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
                        roleToRemove = message.guild.roles.cache.get('904213405240528968');
                        member.roles.remove(roleToRemove);
                        break;
                    case '🟣':
                        roleToRemove = message.guild.roles.cache.get('904213449813426186');
                        member.roles.remove(roleToRemove);
                        break;
                    case '🟡':
                        roleToRemove = message.guild.roles.cache.get('904213530255958027');
                        member.roles.remove(roleToRemove);
                        break;
                    default:
                        message.reactions.cache.get(emoji.id).remove();
                }
                break;
            case config.lookingForGroupMessage:
                if (emoji.name === "🇱") {
                    roleToRemove = message.guild.roles.cache.get('1031312481362137169')
                    member.roles.remove(roleToRemove);
                } else {
                    message.reaction.cache.get(emoji.id).remove();
                }
                break;
            default:
                break;
        }
    },
};
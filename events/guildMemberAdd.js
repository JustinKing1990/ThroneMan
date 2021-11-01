module.exports = {
    name: "guildMemberAdd",
    once: false,
    execute(member) {
        const config = require('../env/config.json');
        let role = member.guild.roles.cache.get('904410457304092722')
        member.roles.add(role);
    },
};
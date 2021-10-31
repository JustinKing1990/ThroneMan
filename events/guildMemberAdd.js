module.exports = {
    name: "guildMemberAdd",
    once: false,
    execute(member) {
        const config = require('../env/config.json');
        let role = member.guild.roles.cache.get('904410457304092722')
        member.roles.add(role);
        member.send("Welcome to Alawal!\nFirst I would like to thank you for visiting our server. So thank you.\nTo begin enjoying this world, there are a series of things you must do. Don't worry, they're simple.\nSimply read the things that you can see, and react to that message at the bottom.\nIf you have any questions, please don't hesitate to reach out to a member of the staff. (they should be the only people you can see in the members list)")
    },
};
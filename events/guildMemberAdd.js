module.exports = {
    name: "guildMemberAdd",
    once: false,
    execute(member) {
        const config = require('../env/config.json');
        let role = member.guild.roles.cache.get('904410457304092722')
        member.roles.add(role);
        const welcomeChannelID = "904855083915825242"
        const ruleChannelID= "903864075065380954"
        const welcomeChannel = member.guild.channels.cache.get(welcomeChannelID)
        welcomeChannel.send(`<@${member.user.id}> Hey welcome to Alawal we are all glad to see you here. To start your adventures in our world go to <#${ruleChannelID}>.\nCheck all the green check marks to continue on to the next channels till you make fully into our server.`);
    },
};
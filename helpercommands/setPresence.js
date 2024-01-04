const { ActivityType } = require('discord.js')
module.exports = (client) => {
    client.setPresence = async () => {
        const options = [
            {
                type: ActivityType.Watching,
                text: "all of you :b:erverts",
                status: "online"
            },
            {
                type: ActivityType.Listening,
                text: "for $<command>",
                status: "idle"
            },
            {
                type: ActivityType.Playing,
                text: "$help for list of commands",
                status: "online"
            }
        ];
        const option = Math.floor(Math.random() * options.length)
        client.user.setPresence({
            activities: [
                {
                    name: option[option].text,
                    type: option[option].type
                }
            ],
            status: options[option].status
        });
    }
}
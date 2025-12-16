# ThroneMan Bot

Modernized Discord bot for the Alwal server. Built on discord.js v14 with MongoDB persistence.

## Prerequisites

- Node.js 20.11+ (matches `engines`)
- npm 9+
- Discord application with a bot token and a dev guild for command deployment
- MongoDB connection string

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env template and fill values:
   ```bash
   cp .env.example .env
   ```
   Required keys:
   - `BOT_TOKEN`
   - `MONGO_URI`
   - `DISCORD_CLIENT_ID`
   - `DISCORD_GUILD_ID`
3. Ensure `env/config.json` contains the message/channel IDs used by the bot (non-secret IDs are kept in version control).

## Scripts

- `npm start` — run the bot
- `npm run dev` — run with nodemon for reloads
- `npm run lint` — lint with ESLint
- `npm run format` — check formatting with Prettier
- `npm run format:write` — apply Prettier formatting

## Command deployment

On startup, commands are (re)deployed to the guild specified by `DISCORD_GUILD_ID`. Make sure `DISCORD_CLIENT_ID` and the guild ID are correct before running.

## Notes

- Secrets live only in `.env`; it is gitignored. Avoid storing tokens/URIs in `env/config.json`.
- The bot uses MongoDB database `Throneman` by default (set in `mongoClient.js`).

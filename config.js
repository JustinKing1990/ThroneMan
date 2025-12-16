const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const appConfigPath = path.join(__dirname, 'env', 'config.json');

function readAppConfig() {
  if (!fs.existsSync(appConfigPath)) {
    return {};
  }
  const raw = fs.readFileSync(appConfigPath, 'utf8');
  return raw ? JSON.parse(raw) : {};
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  token: requireEnv('BOT_TOKEN'),
  mongoUri: requireEnv('MONGO_URI'),
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  openaiApiKey: process.env.OPENAI_API_KEY, // Optional: for auto-generating appearance from images
};

module.exports = { env, appConfigPath, readAppConfig };

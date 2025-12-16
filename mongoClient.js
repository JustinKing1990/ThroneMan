const { MongoClient } = require('mongodb');
const { env } = require('./config');
const { SlashCommandRoleOption } = require('discord.js');

let db;

async function connectToServer() {
  const client = new MongoClient(env.mongoUri);
  try {
    await client.connect();
    db = client.db('Throneman');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

function getDb() {
  return db;
}

module.exports = { connectToServer, getDb };

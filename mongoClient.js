
const { MongoClient } = require('mongodb');
const config = require('./env/config.json');
const { SlashCommandRoleOption } = require('discord.js');

let db;

async function connectToServer() {
  const client = new MongoClient(config.mongoURI);
  try{
  await client.connect();
  db = client.db('Throneman');
  } catch(err){
    console.error(err)
    process.exit(1)
  }
}

function getDb() {
  return db;
}


module.exports = { connectToServer, getDb };

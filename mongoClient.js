
const { MongoClient } = require('mongodb');
const config = require('./env/config.json');

let db;

async function connectToServer() {
  const client = new MongoClient(config.mongoURI);
  await client.connect();
  db = client.db('Throneman');
}

function getDb() {
  return db;
}

module.exports = { connectToServer, getDb };

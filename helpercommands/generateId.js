const { ObjectId } = require('mongodb');

function generateMongoId() {
    return new ObjectId().toString(); // Convert ObjectId to string if needed
}

module.exports = { generateMongoId };

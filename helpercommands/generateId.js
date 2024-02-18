const { ObjectId } = require('mongodb');

function generateMongoId() {
    return new ObjectId().toString(); 
}

module.exports = { generateMongoId };

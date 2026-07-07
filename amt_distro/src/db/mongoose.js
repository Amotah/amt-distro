const mongoose = require('mongoose');
const env = require('../config/env');

let connectionPromise;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.mongoUri, {
      dbName: env.dbName,
    });
  }

  await connectionPromise;

  if (mongoose.connection.readyState !== 1) {
    connectionPromise = undefined;
    throw new Error('MongoDB connection did not become ready');
  }

  if (!global.__amtMongoConnectedLogPrinted) {
    global.__amtMongoConnectedLogPrinted = true;
    console.log(`Connected to MongoDB database: ${env.dbName}`);
  }

  if (env.nodeEnv !== 'production' && !global.__amtMongoIndexesSynced) {
    global.__amtMongoIndexesSynced = true;

    const User = require('../models/user');
    const Artist = require('../models/artist');
    const Release = require('../models/release');

    await Promise.all([
      User.syncIndexes(),
      Artist.syncIndexes(),
      Release.syncIndexes(),
    ]);

    console.log('MongoDB indexes synced for development');
  }

  return mongoose.connection;
}

function resetDatabaseConnection() {
  connectionPromise = undefined;
}

module.exports = {
  connectDatabase,
  resetDatabaseConnection,
};

const mongoose = require('mongoose');
require('dotenv').config({ path: '../../.env' });

const connectDB = async () => {
  if (process.env.NODE_ENV === 'test') {
    // eslint-disable-next-line no-console
    console.log('Skipping DB connection in test environment');
    return;
  }
  try {
    // Dynamically construct MongoDB URI from environment variables
    const mongoHost = process.env.MONGO_HOST;
    const mongoPort = process.env.MONGO_PORT;
    const mongoUsername = process.env.MONGO_USERNAME;
    const mongoPassword = process.env.MONGO_PASSWORD;
    const mongoDatabase = process.env.MONGO_DATABASE;
    
    const mongoURI = `mongodb://${mongoUsername}:${mongoPassword}@${mongoHost}:${mongoPort}/${mongoDatabase}?authSource=admin`;
    
    const conn = await mongoose.connect(mongoURI, {});

    // eslint-disable-next-line no-console
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

const mongoose = require('mongoose');

async function connectDB(mongoUri) {
    const MONGO_URL = mongoUri || process.env.MONGO_URL || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/blogify";

    mongoose.connection.on('connected', () => {
        console.log('MongoDB connection established successfully.');
    });

    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Reconnecting...');
    });

    mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected successfully.');
    });

    return mongoose.connect(MONGO_URL, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 2,
        heartbeatFrequencyMS: 10000,
    });
}

module.exports = connectDB;

const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/apex_store';
  try {
    console.log(`🔌 Connecting to MongoDB at ${uri}...`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    console.log('✅ MongoDB connected successfully.');
    return true;
  } catch (err) {
    isConnected = false;
    console.warn(`⚠️  MongoDB connection warning: ${err.message}`);
    console.warn('⚡ Operating with In-Memory fallback mode for local development.');
    return false;
  }
}

function getIsConnected() {
  return isConnected;
}

module.exports = { connectDB, getIsConnected };

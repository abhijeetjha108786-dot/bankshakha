const mongoose = require("mongoose");

async function connectDB(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    // Fail fast in serverless to avoid Vercel timeout while selecting server.
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 20000,
    maxPoolSize: 5,
  });
}

module.exports = connectDB;

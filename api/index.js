const env = require("../src/config/env");
const connectDB = require("../src/config/db");
const app = require("../src/app");
const { seedInitialData } = require("../src/services/seed.service");

let bootstrapPromise;

async function bootstrapOnce() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await connectDB(env.MONGODB_URI);

      if (env.AUTO_SEED) {
        await seedInitialData();
      }
    })().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }

  return bootstrapPromise;
}

module.exports = async function handler(req, res) {
  try {
    await bootstrapOnce();
    return app(req, res);
  } catch (error) {
    console.error("Vercel bootstrap failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server bootstrap failed",
    });
  }
};

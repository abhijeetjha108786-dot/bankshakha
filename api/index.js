let bootstrapPromise;
let app;

async function bootstrapOnce() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      // Load runtime dependencies lazily so configuration errors are catchable
      // and returned as JSON instead of crashing the serverless function.
      const env = require("../src/config/env");
      const connectDB = require("../src/config/db");
      const { seedInitialData } = require("../src/services/seed.service");
      app = require("../src/app");

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
      error: error.message,
    });
  }
};

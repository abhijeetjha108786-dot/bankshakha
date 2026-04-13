let bootstrapPromise;
let app;

async function bootstrapOnce() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const env = require("../src/config/env");
      const connectDB = require("../src/config/db");
      const { seedInitialData, ensureAdminUser } = require("../src/services/seed.service");
      app = require("../src/app");

      await connectDB(env.MONGODB_URI);
      await ensureAdminUser();

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

    const parsed = new URL(req.url, "http://localhost");
    const path = (parsed.searchParams.get("path") || "").replace(/^\/+/, "");
    parsed.searchParams.delete("path");

    const query = parsed.searchParams.toString();
    req.url = `/api/${path}${query ? `?${query}` : ""}`;

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

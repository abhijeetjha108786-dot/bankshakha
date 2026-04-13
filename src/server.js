const env = require("./config/env");
const connectDB = require("./config/db");
const app = require("./app");
const { seedInitialData } = require("./services/seed.service");

async function bootstrap() {
  try {
    await connectDB(env.MONGODB_URI);

    if (env.AUTO_SEED) {
      await seedInitialData();
    }

    app.listen(env.PORT, () => {
      const baseUrl = env.PUBLIC_BASE_URL || `http://localhost:${env.PORT}`;
      console.log(`Backend running on ${baseUrl}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

bootstrap();

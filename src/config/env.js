const dotenv = require("dotenv");
dotenv.config();

function parseOrigins() {
  const raw =
    process.env.ALLOWED_ORIGINS ||
    process.env.ALLOWED_ORIGIN ||
    "*";

  const values = String(raw)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!values.length) return ["*"];
  return values;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 5000),
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  AUTO_SEED: (process.env.AUTO_SEED || "true").toLowerCase() === "true",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@bankshakha.com",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "Admin@123",
  ALLOWED_ORIGINS: parseOrigins(),
  TRUST_PROXY: (process.env.TRUST_PROXY || "true").toLowerCase() === "true",
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || "",
};

if (!env.MONGODB_URI) {
  throw new Error("MONGODB_URI is required in environment variables");
}

if (!env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in environment variables");
}

module.exports = env;

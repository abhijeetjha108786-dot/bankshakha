const express = require("express");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const env = require("./config/env");
const { notFound, errorHandler } = require("./middlewares/error.middleware");

const authRoutes = require("./routes/auth.routes");
const appRoutes = require("./routes/app.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();

if (env.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

const allowAllOrigins = env.ALLOWED_ORIGINS.includes("*");
const allowedOriginsSet = new Set(env.ALLOWED_ORIGINS);

function corsOriginValidator(origin, callback) {
  if (allowAllOrigins || !origin) {
    return callback(null, true);
  }

  if (allowedOriginsSet.has(origin)) {
    return callback(null, true);
  }

  return callback(new Error(`CORS blocked for origin: ${origin}`));
}

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://*"],
        connectSrc: ["'self'", "http://localhost:*", "https://*"],
      },
    },
  })
);
app.use(
  cors({
    origin: corsOriginValidator,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "BankShakha backend is healthy",
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/app", appRoutes);
app.use("/api/admin", adminRoutes);

app.use("/admin", express.static(path.join(__dirname, "../public/admin")));
app.get("/", (req, res) => {
  res.redirect("/admin");
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;

import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import routes from "./routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------
// Middlewares
// --------------------
app.use(cors());
app.use(express.json()); // 🔴 MUST be before routes
app.use(express.urlencoded({ extended: true }));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// --------------------
// Health check
// --------------------
app.get("/healthz", (_, res) => res.send("OK"));

// --------------------
// API Routes
// --------------------
// 🔴 IMPORTANT: do NOT prefix with /api here
// because routes.ts already has /api/auth/verify-phone
app.use(routes);

// --------------------
// Serve frontend
// --------------------
const publicPath = path.join(__dirname, "..", "public");
app.use(express.static(publicPath));

app.get("*", (_, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// --------------------
// Start server
// --------------------
app.listen(PORT, () => {
  console.log("========================================");
  console.log(`🚀 TrendPilot API running on port: ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log("========================================");
});

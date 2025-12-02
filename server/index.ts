/**
 * TrendPilot API Server (Main Entry)
 * ----------------------------------
 * Loads environment variables, sets up Express,
 * attaches API routes, and starts the server.
 */

import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import appRoutes from "./routes.js";

// ---------------------------------------------
// 🔧 Environment Setup
// ---------------------------------------------
dotenv.config();

const PORT = process.env.PORT || 10000;
const NODE_ENV = process.env.NODE_ENV || "development";
const __dirname = path.resolve();

const app = express();

// ---------------------------------------------
// 🧩 Middlewares
// ---------------------------------------------
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// ---------------------------------------------
// 🧭 API Routes
// ---------------------------------------------
app.use("/", appRoutes);

// ---------------------------------------------
// 🗂️ Static Files (Frontend Build)
// ---------------------------------------------
const publicPath = path.join(__dirname, "dist", "public");
app.use(express.static(publicPath));

// Fallback for SPA routing (React/Vite frontend)
app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// ---------------------------------------------
// 🚀 Start Server
// ---------------------------------------------
app.listen(PORT, () => {
  console.log("========================================");
  console.log(`🚀 TrendPilot API running on port: ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📂 Serving static frontend from: ${publicPath}`);
  console.log("========================================");
});

// ---------------------------------------------
// 🧠 Graceful Shutdown (optional for Render)
// ---------------------------------------------
process.on("SIGINT", () => {
  console.log("🛑 Server shutting down...");
  process.exit(0);
});

process.on("unhandledRejection", (err: any) => {
  console.error("❌ Unhandled Promise Rejection:", err);
});

export default app;

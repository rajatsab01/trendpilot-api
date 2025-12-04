/**
 * TrendPilot API Server
 * ---------------------
 * Serves both API routes and the built React frontend from dist/public.
 */

import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url"; // ✅ Add this
import appRoutes from "./routes.js";

// ✅ ESM-safe __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ---------------------------------------------
// 🧩 Middlewares
// ---------------------------------------------
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// ---------------------------------------------
// 🧭 API Routes (mounted under /api)
// ---------------------------------------------
app.use("/api", appRoutes);

// ---------------------------------------------
// 🗂️ Serve Frontend (React build)
// ---------------------------------------------
const publicPath = path.join(__dirname, "..", "dist", "public"); // ✅ corrected path
app.use(express.static(publicPath));

// ✅ Fallback for React Router (SPA)
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
// 🧠 Error Handling / Shutdown
// ---------------------------------------------
process.on("SIGINT", () => {
  console.log("🛑 Server shutting down...");
  process.exit(0);
});

process.on("unhandledRejection", (err: any) => {
  console.error("❌ Unhandled Promise Rejection:", err);
});

export default app;

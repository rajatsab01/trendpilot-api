/**
 * TrendPilot API Server
 * ---------------------
 * - Serves API routes
 * - Serves built React frontend from dist/public in production
 * - CJS-safe build (no import.meta, no top-level await)
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

import registerRoutes from "./routes";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 10000);
const NODE_ENV = process.env.NODE_ENV || "development";

// -------------------------------
// Middlewares
// -------------------------------
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// -------------------------------
// Health
// -------------------------------
app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, env: NODE_ENV });
});

// -------------------------------
// Start server (NO top-level await)
// -------------------------------
async function start() {
  // Register API routes (your routes.ts returns an http Server)
  const httpServer = await registerRoutes(app);

  // Serve frontend in production
  if (NODE_ENV === "production") {
    const publicDir = path.resolve(process.cwd(), "dist", "public");
    console.log("ENV:", NODE_ENV);
    console.log("Serving frontend from:", publicDir);

    if (fs.existsSync(publicDir)) {
      // Static assets
      app.use(express.static(publicDir));

      // SPA fallback (React Router)
      app.get("*", (_req: Request, res: Response, next: NextFunction) => {
        const indexHtml = path.join(publicDir, "index.html");
        if (fs.existsSync(indexHtml)) return res.sendFile(indexHtml);
        return next();
      });
    } else {
      console.warn("⚠️ dist/public not found. Frontend will not be served.");
    }
  }

  // Listen
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

// Hard fail if start crashes
start().catch((err) => {
  console.error("❌ Fatal startup error:", err);
  process.exit(1);
});

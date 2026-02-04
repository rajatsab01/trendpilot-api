/**
 * TrendPilot API Server
 * ---------------------
 * Serves API routes + built React frontend from dist/public
 */

import express, { type Request, type Response } from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import routes from "./routes.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 10000);
const NODE_ENV = process.env.NODE_ENV || "development";

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// Health
app.get("/healthz", (_req: Request, res: Response) => res.status(200).send("OK"));

// Register API routes (also returns httpServer in case you use ws later)
const httpServer = await routes(app);

// Static Frontend (PRODUCTION)
if (NODE_ENV === "production") {
  // dist/index.cjs lives in /dist, so public is /dist/public
  const publicDir = path.join(__dirname, "public");
  const indexHtml = path.join(publicDir, "index.html");

  console.log(`📂 Serving static frontend from: ${publicDir}`);

  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));

    // SPA fallback: send index.html for non-API routes
    app.get("*", (req: Request, res: Response) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/healthz")) {
        return res.status(404).json({ error: "Not found" });
      }
      if (fs.existsSync(indexHtml)) return res.sendFile(indexHtml);
      return res.status(404).send("Not Found");
    });
  } else {
    console.log("⚠️ publicDir does not exist. Did you run `vite build`?");
  }
}

// Start server
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log("========================================");
  console.log(`🚀 TrendPilot running on port: ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log("========================================");
});

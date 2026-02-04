// server/index.ts
/**
 * TrendPilot API Server
 * ---------------------
 * - Registers API routes (server/routes.ts)
 * - Serves built React frontend from dist/public in production (SPA fallback)
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

import registerRoutes from "./routes";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 10000);
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

// Render/Proxies
app.set("trust proxy", 1);

// ---------------------------------------------
// Middlewares
// ---------------------------------------------
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan(IS_PROD ? "combined" : "dev"));

// Simple health check
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("ok");
});

// ---------------------------------------------
// Paths
// ---------------------------------------------
// Use process.cwd() to stay CJS-safe after esbuild bundling
const PUBLIC_DIR = path.resolve(process.cwd(), "dist", "public");
const INDEX_HTML = path.join(PUBLIC_DIR, "index.html");

// ---------------------------------------------
// Start
// ---------------------------------------------
async function start() {
  try {
    // ✅ 1) Register API routes FIRST (so SPA fallback never steals /api/*)
    const httpServer = await registerRoutes(app);

    // ✅ 2) Serve frontend only in production and only if build exists
    if (IS_PROD && fs.existsSync(INDEX_HTML)) {
      app.use(express.static(PUBLIC_DIR));

      // SPA fallback
      app.get("*", (req: Request, res: Response) => {
        // Let API 404s behave normally (safety guard)
        if (req.path.startsWith("/api/")) {
          return res.status(404).json({ error: "Not Found" });
        }
        return res.sendFile(INDEX_HTML);
      });
    }

    // Global error handler (last)
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("❌ Unhandled error:", err);
      res.status(500).json({ error: "Internal server error" });
    });

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`ENV: ${NODE_ENV}`);
      if (IS_PROD) console.log(`Serving frontend from: ${PUBLIC_DIR}`);
    });
  } catch (err) {
    console.error("❌ Server failed to start:", err);
    process.exit(1);
  }
}

start();

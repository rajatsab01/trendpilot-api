//------------------------------------------------------
// TrendPilot Server v2.8 (Dec-2025 build)
//------------------------------------------------------
// Unified Express bootstrap for Render/Replit
// Includes cache-busting fix for stuck update popup
//------------------------------------------------------

import path from "path";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import express, { type Request, Response, NextFunction } from "express";
import http from "http";

import { registerRoutes } from "./routes.js";
import { initializeSymbolRegistry } from "./symbolRegistry.js";

/* ---------------- ESM __dirname shim ---------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ------------- Load .env from project root ---------- */
config({ path: path.resolve(__dirname, "..", ".env") });

const app = express();
const server = http.createServer(app);

/* ---------------------- Health ---------------------- */
app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

/* -------------------- Body parsing ------------------ */
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

/* -------------------- API logging ------------------- */
function log(line: string) {
  console.log(`[api] ${line}`);
}
app.use((req, res, next) => {
  const start = Date.now();
  const p = req.path;
  let capturedJson: Record<string, any> | undefined;

  const originalJson: (...args: any[]) => any = (res.json as any).bind(res);
  (res as any).json = (body: any, ...rest: any[]) => {
    capturedJson = body;
    return originalJson(body, ...rest);
  };

  res.on("finish", () => {
    if (p.startsWith("/api")) {
      const ms = Date.now() - start;
      let line = `${req.method} ${p} ${res.statusCode} in ${ms}ms`;
      if (capturedJson) line += ` :: ${JSON.stringify(capturedJson)}`;
      if (line.length > 150) line = line.slice(0, 149) + "…";
      log(line);
    }
  });

  next();
});

/* ------------- Cache-busting for version check ------- */
app.use(["/version", "/api/version"], (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

/* -------------------- Bootstrap --------------------- */
(async () => {
  try {
    const isProduction =
      process.env.NODE_ENV === "production" ||
      process.env.REPLIT_DEPLOYMENT === "1" ||
      process.env.RENDER === "true";

    console.log(
      isProduction
        ? "🚀 Starting TrendPilot in production mode..."
        : "🔧 Starting TrendPilot in development mode..."
    );

    /* ----------------- Symbol Registry ---------------- */
    console.log("🔧 Initializing symbol registry...");
    initializeSymbolRegistry();

    /* ----------------- Register Routes ---------------- */
    console.log("📦 Registering API routes...");
    registerRoutes(app);
    console.log("✅ Routes registered successfully");

    /* ----------------- Global Error Handler ----------- */
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", err);
      res.status(status).json({ message });
    });

    /* ----------------- Frontend Integration ----------- */
    if (isProduction) {
      const distPath = path.join(__dirname, "../dist/public");
      console.log("📁 Serving static frontend from:", distPath);
      app.use(express.static(distPath));

      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      try {
        const { setupVite } = await import("./vite.js").catch(async () => {
          return await import("./vite.ts");
        });
        console.log("🎨 Setting up Vite development server...");
        await setupVite(app, server);
        console.log("✅ Vite dev server ready");
      } catch {
        console.warn("⚠️ Vite setup skipped (development mode only)");
      }
    }

    /* ----------------- Server Listen ------------------ */
    const port = Number(process.env.PORT) || 5000;
    const host = isProduction ? "0.0.0.0" : "127.0.0.1";

    server.listen(port, host, () => {
      console.log(`✅ TrendPilot running on http://${host}:${port}`);
      console.log(`🌐 Health check: http://${host}:${port}/healthz`);
    });
  } catch (err) {
    console.error("❌ Fatal error during startup:", err);
    process.exit(1);
  }
})();

import path from "path";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import express, { type Request, Response, NextFunction } from "express";

import { registerRoutes } from "./routes.js";
import { initializeSymbolRegistry } from "./symbolRegistry";

/* ---------------- ESM __dirname shim ---------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ------------- Load .env from project root ---------- */
config({ path: path.resolve(__dirname, "..", ".env") });

const app = express();

/* ---------------------- Health ---------------------- */
app.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});
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

  // keep the bound function but type it loosely so TS accepts spread args
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
      if (line.length > 120) line = line.slice(0, 119) + "…";
      log(line);
    }
  });

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
        ? "🚀 Starting server in production mode..."
        : "🔧 Starting server in development mode..."
    );

    if (isProduction) {
      const requiredSecrets = ["DATABASE_URL", "SESSION_SECRET"];
      const missing = requiredSecrets.filter((k) => !process.env[k]);
      if (missing.length) {
        console.warn(`⚠️ Missing production secrets: ${missing.join(", ")}`);
        console.warn("   Server will continue but may have limited features.");
      } else {
        console.log("✅ All required production secrets are configured");
      }
    }

    console.log("🔧 Initializing symbol registry...");
    initializeSymbolRegistry();

    console.log("📦 Registering routes...");
    const server = await registerRoutes(app);
    console.log("✅ Routes registered successfully");

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", err);
      res.status(status).json({ message });
    });

    /* --------- Dev uses Vite; Prod serves static files ---------- */
    if (!isProduction) {
      // DYNAMIC import to avoid bundling vite & heavy deps
      const { setupVite } = await import("./vite.js").catch(async () => {
        // when running from TS (tsx) fallback to .ts path
        return await import("./vite.ts");
      });
      console.log("🎨 Setting up Vite development server...");
      await setupVite(app, server);
      console.log("✅ Vite development server ready");

    } else {
  const { serveStatic } = await import("./vite.js").catch(async () => {
    return await import("./vite.ts");
  });
  console.log("📁 Serving static files...");

  // Serve the production client build (React/Vite output)
  app.use(express.static(path.join(__dirname, "../client/dist")));

  // Fallback for SPA routes like /dashboard or /analyzer
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });

  serveStatic(app);
  console.log("✅ Static file server ready");
}

    /* -------------------- LISTEN -------------------- */
    const port = Number(process.env.PORT) || 5000;
    // Force 127.0.0.1 on Windows dev to avoid ENOTSUP;
    // use 0.0.0.0 only in prod hosting (Render/Replit/etc.)
    const host = !isProduction ? "127.0.0.1" : "0.0.0.0";

    server.listen(port, host, () => {
      console.log(`✅ Server is running on http://${host}:${port}`);
      console.log(`🌐 Health check: http://${host}:${port}/healthz`);
      log(`serving on ${host}:${port}`);
    });
  } catch (err) {
    console.error("❌ Fatal error during server startup:");
    console.error(err);
    process.exit(1);
  }
})();

import path from "path";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import express, { type Request, Response, NextFunction } from "express";

import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeSymbolRegistry } from "./symbolRegistry";

/* ---------------- ESM __dirname shim ---------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ------------- Load .env from project root ---------- */
config({ path: path.resolve(__dirname, "..", ".env") });

const app = express();

/* ---------------------- Health ---------------------- */
// Render health check (keep this exact path)
app.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

// Optional human-readable health
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
app.use((req, res, next) => {
  const start = Date.now();
  const p = req.path;
  let capturedJson: Record<string, any> | undefined;

  const originalJson = res.json.bind(res);
  // @ts-ignore – preserve signature
  res.json = (body: any, ...rest: any[]) => {
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

    if (isProduction) {
      console.log("🚀 Starting server in production mode...");
      const requiredSecrets = ["DATABASE_URL", "SESSION_SECRET"];
      const missing = requiredSecrets.filter((k) => !process.env[k]);
      if (missing.length) {
        console.warn(`⚠️ Missing production secrets: ${missing.join(", ")}`);
        console.warn("   Server will continue but may have limited features.");
      } else {
        console.log("✅ All required production secrets are configured");
      }
    } else {
      console.log("🔧 Starting server in development mode...");
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

    // Dev uses Vite; Prod serves built static bundle
    if (app.get("env") === "development") {
      console.log("🎨 Setting up Vite development server...");
      await setupVite(app, server);
      console.log("✅ Vite development server ready");
    } else {
      console.log("📁 Serving static files...");
      serveStatic(app);
      console.log("✅ Static file server ready");
    }

    /* -------------------- LISTEN (Render!) --------------------
       Render must be able to reach your process from outside.
       => Bind to 0.0.0.0 in production, NOT 127.0.0.1.
    ----------------------------------------------------------- */
    const port = Number(process.env.PORT) || 5000;
    const host = isProduction ? "0.0.0.0" : "127.0.0.1";

    server.listen(port, host, () => {
      console.log(`✅ Server is running on http://${host}:${port}`);
      console.log(`🌐 Health check available at http://${host}:${port}/healthz`);
      log(`serving on ${host}:${port}`);
    });
  } catch (err) {
    console.error("❌ Fatal error during server startup:");
    console.error(err);
    process.exit(1);
  }
})();

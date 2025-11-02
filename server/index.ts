import path from "path";
import { config } from "dotenv";
import { fileURLToPath } from "url";

// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the .env that lives in the project root (one level up from /server)
config({ path: path.resolve(__dirname, "..", ".env") });
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeSymbolRegistry } from "./symbolRegistry";

const app = express();

// Health check endpoint for deployment verification
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

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

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    // @ts-ignore - preserve original signature
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Verify critical environment variables in production
    const isProduction =
      process.env.NODE_ENV === "production" ||
      process.env.REPLIT_DEPLOYMENT === "1";
    if (isProduction) {
      console.log("🚀 Starting server in production mode...");
      const requiredSecrets = ["DATABASE_URL", "SESSION_SECRET"];
      const missingSecrets = requiredSecrets.filter(
        (secret) => !process.env[secret]
      );
      if (missingSecrets.length > 0) {
        console.warn(
          `⚠️  Warning: Missing production secrets: ${missingSecrets.join(", ")}`
        );
        console.warn("   Server will continue but may have limited functionality");
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

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", err);
      res.status(status).json({ message });
    });

    // Only set up Vite in development and after other routes
    if (app.get("env") === "development") {
      console.log("🎨 Setting up Vite development server...");
      await setupVite(app, server);
      console.log("✅ Vite development server ready");
    } else {
      console.log("📁 Serving static files...");
      serveStatic(app);
      console.log("✅ Static file server ready");
    }

    // === LISTEN (Windows-safe) ===
    const port = Number(process.env.PORT) || 5000;
    const host = process.env.HOST || "127.0.0.1"; // bind to loopback to avoid ENOTSUP

    // Use the classic signature; avoid { reusePort } and 0.0.0.0 on Windows
    server.listen(port, host, () => {
      console.log(`✅ Server is running on http://${host}:${port}`);
      console.log(`🌐 Health check available at http://${host}:${port}/health`);
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error("❌ Fatal error during server startup:");
    console.error(error);
    console.error("\nServer initialization failed. Please check the error above.");
    process.exit(1);
  }
})();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Health check endpoint for deployment verification
app.get("/health", (_req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Verify critical environment variables in production
    const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1';
    if (isProduction) {
      console.log("🚀 Starting server in production mode...");
      
      // Check for required production secrets
      const requiredSecrets = ['DATABASE_URL', 'SESSION_SECRET'];
      const missingSecrets = requiredSecrets.filter(secret => !process.env[secret]);
      
      if (missingSecrets.length > 0) {
        console.warn(`⚠️  Warning: Missing production secrets: ${missingSecrets.join(', ')}`);
        console.warn("   Server will continue but may have limited functionality");
      } else {
        console.log("✅ All required production secrets are configured");
      }
    } else {
      console.log("🔧 Starting server in development mode...");
    }

    console.log("📦 Registering routes...");
    const server = await registerRoutes(app);
    console.log("✅ Routes registered successfully");

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log error but don't throw to prevent server crashes
      console.error("Server error:", err);
      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      console.log("🎨 Setting up Vite development server...");
      await setupVite(app, server);
      console.log("✅ Vite development server ready");
    } else {
      console.log("📁 Serving static files...");
      serveStatic(app);
      console.log("✅ Static file server ready");
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      console.log(`✅ Server is running on port ${port}`);
      console.log(`🌐 Health check available at http://0.0.0.0:${port}/health`);
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error("❌ Fatal error during server startup:");
    console.error(error);
    console.error("\nServer initialization failed. Please check the error above.");
    // Exit with error code to signal deployment failure
    process.exit(1);
  }
})();

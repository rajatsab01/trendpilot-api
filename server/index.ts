/**
 * TrendPilot API Server
 * ---------------------
 * Dev:   tsx server/index.ts
 * Prod:  node dist/index.cjs (built by esbuild)
 *
 * - Registers API routes from ./routes
 * - Serves built frontend from dist/public in production
 * - Prevents double-listen + handles EADDRINUSE nicely
 */

import dotenv from "dotenv";
dotenv.config();

import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { existsSync } from "fs";

import routes from "./routes"; // expects default export

const app = express();
const PORT = Number(process.env.PORT || 10000);
const NODE_ENV = process.env.NODE_ENV || "development";

// ----------------------------
// Middlewares
// ----------------------------
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// Render (and some dashboards) show deploy output first; runtime logs stream separately.
// Explicit /api lines make API traffic obvious even if morgan lines are easy to miss.
app.use((req, _res, next) => {
  const path = req.originalUrl.split("?")[0] || req.path;
  if (path.startsWith("/api")) {
    console.log(`[api] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// ----------------------------
// Health
// ----------------------------
app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, env: NODE_ENV });
});

// Render's default health checks are commonly configured to `/healthz`.
// Keep this as a JSON endpoint so probes reflect the real API availability.
app.get("/healthz", (_req: Request, res: Response) => {
  res.json({ ok: true, env: NODE_ENV });
});

// ----------------------------
// Start
// ----------------------------
function startExpress() {
  // Serve frontend only in production
  if (NODE_ENV === "production") {
    const publicDir = path.resolve(process.cwd(), "dist", "public");
    console.log("ENV:", NODE_ENV);
    console.log("Serving frontend from:", publicDir);

    if (existsSync(publicDir)) {
      app.use(express.static(publicDir));

      // SPA fallback
      app.get("*", (_req: Request, res: Response) => {
        res.sendFile(path.join(publicDir, "index.html"));
      });
    } else {
      console.warn("⚠️ dist/public not found. Run `npm run build` first.");
    }
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on port ${PORT}`);
  });

  server.on("error", (err: any) => {
    if (err?.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} already in use. Kill the PID and retry.`);
      process.exit(1);
    }
    console.error("Server error:", err);
    process.exit(1);
  });
}

(async () => {
  try {
    // routes(app) might just register routes OR might return an http server
    const maybeServer: any = await (routes as any)(app);

    if (NODE_ENV !== "production") {
      console.log("🛠️ Setting up Vite middleware for development frontend...");
      const { setupVite } = await import("./vite");
      await setupVite(app);
    }

    // If routes.ts returned a real server that is already listening, do nothing.
    // If it returned a server but not listening, listen here.
    if (maybeServer && typeof maybeServer.listen === "function") {
      const alreadyListening =
        typeof maybeServer.listening === "boolean" ? maybeServer.listening : false;

      if (!alreadyListening) {
        maybeServer.listen(PORT, "0.0.0.0", () => {
          console.log(`✅ Server running on port ${PORT}`);
        });
      } else {
        console.log("✅ Server already listening (from routes.ts)");
      }

      maybeServer.on?.("error", (err: any) => {
        if (err?.code === "EADDRINUSE") {
          console.error(`❌ Port ${PORT} already in use. Kill the PID and retry.`);
          process.exit(1);
        }
        console.error("Server error:", err);
        process.exit(1);
      });

      // Still serve frontend if production and routes.ts started server
      if (NODE_ENV === "production") {
        const publicDir = path.resolve(process.cwd(), "dist", "public");
        console.log("ENV:", NODE_ENV);
        console.log("Serving frontend from:", publicDir);

        if (existsSync(publicDir)) {
          app.use(express.static(publicDir));
          app.get("*", (_req: Request, res: Response) => {
            res.sendFile(path.join(publicDir, "index.html"));
          });
        }
      }
    } else {
      startExpress();
    }
  } catch (e) {
    console.error("❌ Failed to start server:", e);
    process.exit(1);
  }
})();

import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import * as vite from "vite";
const createViteServer = vite.createServer as any;
const createLogger = vite.createLogger as any;
import { type Server } from "http";
// @ts-ignore
import viteConfig from "../vite.config.js";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// ✅ Development mode (Vite middleware)
export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const viteServer = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg: string, options?: any) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(viteServer.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      const page = await viteServer.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      viteServer.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// ✅ Production mode (Render-ready)
export function serveStatic(app: Express) {
  // 🔥 Correct Render path: /dist/public
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `❌ Could not find the build directory: ${distPath}. Please build the client first.`
    );
  }

  app.use(express.static(distPath));

  // Always fall back to index.html for SPA routes
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

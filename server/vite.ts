import type { Express } from "express";
import express from "express";
import path from "path";

export function log(...args: any[]) {
  console.log(...args);
}

export function serveStatic(app: Express) {
  const root = process.cwd();
  const distPublic = path.join(root, "dist", "public");

  log("📂 Serving static frontend from:", distPublic);

  app.use(express.static(distPublic));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPublic, "index.html"));
  });
}

export async function setupVite(app: Express) {
  const { createServer } = await import("vite");

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });

  app.use(vite.middlewares);
}

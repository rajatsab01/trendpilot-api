import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 10000;
const NODE_ENV = process.env.NODE_ENV || "development";

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

app.get("/healthz", (_req, res) => res.status(200).send("OK"));

(async () => {
  const server = await registerRoutes(app);

  if (NODE_ENV === "production") {
    serveStatic(app);
  } else {
    await setupVite(app);
  }

  server.listen(PORT, () => {
    log("========================================");
    log(`🚀 TrendPilot running on port: ${PORT}`);
    log(`🌍 Environment: ${NODE_ENV}`);
    log("========================================");
  });
})();

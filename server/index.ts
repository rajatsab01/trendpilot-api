import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import routes from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 10000;
const NODE_ENV = process.env.NODE_ENV || "development";

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

app.get("/healthz", (_req, res) => res.status(200).send("OK"));

app.use("/api", routes);

(async () => {
  if (NODE_ENV === "production") {
    serveStatic(app);
  } else {
    await setupVite(app);
  }

  app.listen(PORT, () => {
    log("========================================");
    log(`🚀 TrendPilot API running on port: ${PORT}`);
    log(`🌍 Environment: ${NODE_ENV}`);
    log("========================================");
  });
})();

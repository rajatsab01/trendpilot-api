import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import routes from "./routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const NODE_ENV = process.env.NODE_ENV || "development";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/healthz", (_, res) => res.send("OK"));

app.use("/api", routes);

const publicPath = path.join(__dirname, "..", "public");
app.use(express.static(publicPath));

app.get("*", (_, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(PORT, () => {
  console.log("========================================");
  console.log(`🚀 TrendPilot API running on port: ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log("========================================");
});

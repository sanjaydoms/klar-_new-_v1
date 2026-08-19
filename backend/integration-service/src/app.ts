import cors from "cors";
import express from "express";
import helmet from "helmet";

import { envConfig } from "./config/env.config";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: envConfig.CORS.ORIGIN.length ? envConfig.CORS.ORIGIN : false,
    credentials: envConfig.CORS.CREDENTIALS,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ success: true, service: "integration-service", uptime: process.uptime() });
});

// Admin and internal routes are mounted here as each phase lands.

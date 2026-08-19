import cors from "cors";
import express from "express";
import helmet from "helmet";

import { envConfig } from "./config/env.config";
import { errorHandler, notFound } from "./middlewares/errors.middleware";
import { adminRateLimiter, internalRateLimiter } from "./middlewares/rateLimiter";
import adminRoutes from "./routes/admin.routes";
import internalRoutes from "./routes/internal.routes";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: envConfig.CORS.ORIGIN.length ? envConfig.CORS.ORIGIN : false,
    credentials: envConfig.CORS.CREDENTIALS,
  }),
);

/**
 * Trust one proxy hop for client IPs.
 *
 * The rate limiters and the audit trail both want the caller's address, and
 * behind a load balancer every request otherwise appears to come from the
 * proxy — which would make one limiter bucket for the entire fleet. One hop,
 * not `true`: trusting the whole chain lets a caller spoof its own address by
 * sending an X-Forwarded-For header.
 */
app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ success: true, service: "integration-service", uptime: process.uptime() });
});

app.use("/internal", internalRateLimiter, internalRoutes);
app.use("/admin/integrations", adminRateLimiter, adminRoutes);

app.use(notFound);
app.use(errorHandler);

import mongoose from "mongoose";

import { envConfig } from "./env.config";
// Side-effect import: registers every model, so the check below is complete
// rather than covering only whatever the caller imported first.
import "../models";

/**
 * Wait until every model's indexes exist.
 *
 * Mongoose builds indexes in the background AFTER connecting, so on a fresh
 * database there is a window where writes are accepted before the unique
 * indexes that make them safe are in place. Two service instances reporting
 * telemetry in that window both insert a bucket for the same minute, and the
 * counts are silently split across two documents from then on.
 *
 * It is a first-boot problem, which is exactly the kind that gets diagnosed
 * months later — the test suite caught it because every run starts on an empty
 * database, which is first boot every time.
 *
 * `Model.init()` resolves once a model's indexes are built. Awaiting all of
 * them costs milliseconds against an existing database and is the whole fix.
 *
 * The models are imported for their side effect above, because mongoose only
 * knows about a model once its module has been evaluated — without that this
 * check silently covers nothing in any path that imports models lazily, which
 * is exactly how it first appeared to work and did not.
 */
export const ensureIndexes = async (): Promise<void> => {
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
};

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(envConfig.MONGODB_URI, {
      dbName: envConfig.DB_NAME,
    });
    await ensureIndexes();
    console.log(`MongoDB connected: ${conn.connection.host}/${envConfig.DB_NAME}`);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

import { app } from "./app";
import { connectDB } from "./config/db.config";
import { envConfig } from "./config/env.config";
import { detect } from "./services/incident.service";

/**
 * How often the incident detector runs.
 *
 * Slower than the health window on purpose: the detector asks "has this been
 * bad for a while", and running it faster than the data changes just produces
 * the same answer more often.
 */
const DETECTOR_INTERVAL_MS = Number(process.env.INCIDENT_INTERVAL_MS || 60_000);

/**
 * Started here rather than in app.ts because app.ts is what the tests import.
 * A background timer firing during a test run would write incidents into
 * whichever database that test happened to be using.
 */
const startDetector = (): void => {
  if (process.env.INCIDENT_DETECTOR === "off") {
    console.log("Incident detector disabled by INCIDENT_DETECTOR=off");
    return;
  }

  const run = async () => {
    try {
      const { opened, resolved, updated } = await detect();
      if (opened.length) console.warn(`[incidents] opened ${opened.join(", ")}`);
      if (resolved.length) console.log(`[incidents] resolved ${resolved.join(", ")}`);
      if (updated.length) console.log(`[incidents] updated ${updated.join(", ")}`);
    } catch (err: any) {
      // A detector that throws must not take the service with it — the admin
      // API is what an operator needs most during the outage it failed to spot.
      console.error(`[incidents] detector failed: ${err?.message ?? err}`);
    }
  };

  void run();
  const timer = setInterval(run, DETECTOR_INTERVAL_MS);
  timer.unref();
};

const start = async (): Promise<void> => {
  await connectDB();
  startDetector();
  app.listen(envConfig.PORT, () => {
    console.log(`✅ integration-service on http://localhost:${envConfig.PORT}`);
  });
};

start().catch((err) => {
  console.error("Failed to start integration-service:", err);
  process.exit(1);
});

import { app } from "./app";
import { connectDB } from "./config/db.config";
import { envConfig } from "./config/env.config";

const start = async (): Promise<void> => {
  await connectDB();
  app.listen(envConfig.PORT, () => {
    console.log(`✅ integration-service on http://localhost:${envConfig.PORT}`);
  });
};

start().catch((err) => {
  console.error("Failed to start integration-service:", err);
  process.exit(1);
});

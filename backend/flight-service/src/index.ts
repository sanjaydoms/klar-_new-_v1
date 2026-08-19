import dns from "node:dns/promises";
dns.setServers(["1.1.1.1", "1.0.0.1", "0.0.0.0", "149.88.103.51"]);

import app, { setupApp } from "./app";
import dotenv from "dotenv";
import { envConfig, connectDB, RedisConfig } from "./config";
import { observeSupplierCalls } from "./utils/supplierObserver";

dotenv.config();

const startServer = async () => {

  try {

    // Installed before anything can call a supplier, so no call escapes
    // unmeasured. Idempotent, and reports nothing without INTERNAL_SERVICE_KEY.
    observeSupplierCalls();

    await connectDB();

    RedisConfig.getInstance();

    setupApp();

    app.listen(envConfig.PORT, () => {

    });

  } catch (error) {



    process.exit(1);
  }
};



startServer();
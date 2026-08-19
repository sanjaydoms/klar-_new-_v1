import dotenv from "dotenv";

dotenv.config();

const requiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const envConfig = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5022,

  MONGODB_URI: requiredEnv("MONGODB_URI"),
  DB_NAME: process.env.DB_NAME || "klar_integrations",

  /**
   * Verifies the same access tokens auth-service issues, so an admin signs in
   * once. This service never mints a token — it only reads them.
   */
  JWT: {
    SECRET: requiredEnv("JWT_SECRET"),
  },

  /**
   * §29 / requireMaster: role alone is not enough for the most destructive
   * writes in the platform. Empty locks everyone out rather than degrading to
   * a role-only check.
   */
  MASTER: {
    EMAILS: (process.env.MASTER_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  },

  /** Shared secret other KLAR services present to fetch decrypted credentials. */
  INTERNAL_SERVICE_KEY: process.env.INTERNAL_SERVICE_KEY || "",

  /**
   * 32-byte hex key for credential encryption at rest.
   *
   * Read lazily, not at import: the seed script and the test suite must be
   * able to load config without it, and a service that only routes never
   * touches a secret. utils/crypto refuses the operation when it is absent,
   * which is a clearer failure than the whole process refusing to boot.
   */
  MASTER_KEY: process.env.INTEGRATION_MASTER_KEY || "",

  CORS: {
    ORIGIN: (process.env.CORS_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean),
    CREDENTIALS: process.env.CORS_CREDENTIALS === "true",
  },
};

/**
 * Test environment defaults.
 *
 * Imported first by every test file. It has to be its own module because
 * `import` statements are hoisted above assignments in the same file — setting
 * these inline would run after config/env.config had already thrown.
 */
process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27017";
process.env.JWT_SECRET ||= "test-secret";
process.env.INTEGRATION_MASTER_KEY ||= "a".repeat(64);

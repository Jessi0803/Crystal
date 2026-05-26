import dotenv from "dotenv";
import mysql from "mysql2/promise";

const TEST_ENV_PATH = ".env.test.local";
const TEST_DATABASE_NAME_ENV = "E2E_TEST_DATABASE_NAME";
const TEST_TIDB_PROJECT_ID_ENV = "E2E_TIDB_PROJECT_ID";
const ALLOW_WRITES_ENV = "E2E_ALLOW_TEST_DB_WRITES";

export function loadTestEnv() {
  dotenv.config({ path: TEST_ENV_PATH, override: true, quiet: true });
  if (!process.env.DATABASE_URL) {
    throw new Error(`${TEST_ENV_PATH} must define DATABASE_URL`);
  }
  return parseDatabaseUrl(process.env.DATABASE_URL);
}

export function parseDatabaseUrl(connectionString) {
  const url = new URL(connectionString);
  const database = url.pathname.replace(/^\//, "");
  if (!database) {
    throw new Error("DATABASE_URL must include a database name");
  }
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  };
}

export function assertTestDatabaseTarget(config, { write = false } = {}) {
  const expectedDatabase = process.env[TEST_DATABASE_NAME_ENV];
  const expectedProjectId = process.env[TEST_TIDB_PROJECT_ID_ENV];

  if (process.env.NODE_ENV !== "test") {
    throw new Error(`Refusing test database access unless NODE_ENV=test`);
  }
  if (!expectedDatabase || !expectedProjectId) {
    throw new Error(
      `${TEST_ENV_PATH} must define ${TEST_DATABASE_NAME_ENV} and ${TEST_TIDB_PROJECT_ID_ENV}`
    );
  }
  if (config.database !== expectedDatabase) {
    throw new Error(
      `Refusing to use database "${config.database}". Expected test database "${expectedDatabase}"`
    );
  }
  if (!config.user.startsWith(`${expectedProjectId}.`)) {
    throw new Error("Refusing database access: DATABASE_URL does not belong to the confirmed test TiDB project");
  }
  if (write && process.env[ALLOW_WRITES_ENV] !== "true") {
    throw new Error(`Refusing test database writes unless ${ALLOW_WRITES_ENV}=true`);
  }
}

export function assertPlaywrightServiceSafety() {
  loadTestEnv();

  if (process.env.PAYPAL_SANDBOX !== "1" && process.env.PAYPAL_SANDBOX !== "true") {
    throw new Error("Refusing E2E run unless PAYPAL_SANDBOX is enabled");
  }
  if (process.env.ECPAY_SANDBOX !== "true") {
    throw new Error("Refusing E2E run unless ECPAY_SANDBOX=true");
  }
  if (process.env.ECPAY_LOGISTICS_SANDBOX !== "true") {
    throw new Error("Refusing E2E run unless ECPAY_LOGISTICS_SANDBOX=true");
  }
  if (
    process.env.RUN_RESEND_E2E === "true" &&
    process.env.E2E_ALLOW_RESEND_DELIVERY !== "true"
  ) {
    throw new Error("Refusing external Resend E2E without E2E_ALLOW_RESEND_DELIVERY=true");
  }
  if (
    process.env.RUN_RESEND_E2E === "true" &&
    process.env.E2E_ALLOW_RESEND_DELIVERY === "true" &&
    !process.env.RESEND_API_KEY
  ) {
    throw new Error("Refusing external Resend E2E without RESEND_API_KEY");
  }
}

export async function connectToTestDatabase({ write = false } = {}) {
  const config = loadTestEnv();
  assertTestDatabaseTarget(config, { write });
  const connection = await mysql.createConnection({
    ...config,
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });
  return { connection, config };
}

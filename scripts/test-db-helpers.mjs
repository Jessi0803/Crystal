import dotenv from "dotenv";
import mysql from "mysql2/promise";

const TEST_ENV_PATH = ".env.test.local";
const ALLOWED_TEST_DATABASES = new Set(["test", "crystal_aura_test"]);

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

export function assertTestDatabaseName(database) {
  if (!ALLOWED_TEST_DATABASES.has(database)) {
    throw new Error(
      `Refusing to use database "${database}". Expected one of: ${Array.from(ALLOWED_TEST_DATABASES).join(", ")}`
    );
  }
}

export async function connectToTestDatabase() {
  const config = loadTestEnv();
  assertTestDatabaseName(config.database);
  const connection = await mysql.createConnection({
    ...config,
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });
  return { connection, config };
}

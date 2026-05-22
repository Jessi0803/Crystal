import { connectToTestDatabase } from "./test-db-helpers.mjs";

const { connection, config } = await connectToTestDatabase();

try {
  const [rows] = await connection.query("SELECT DATABASE() AS db");
  const currentDatabase = rows[0]?.db;
  if (currentDatabase !== config.database) {
    throw new Error(`Connected to "${currentDatabase}", expected "${config.database}"`);
  }
  console.log(`Test database connection OK: ${currentDatabase}`);
} finally {
  await connection.end();
}

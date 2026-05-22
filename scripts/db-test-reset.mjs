import { connectToTestDatabase } from "./test-db-helpers.mjs";

if (!process.argv.includes("--yes")) {
  throw new Error("Refusing to reset test database without --yes");
}

const { connection, config } = await connectToTestDatabase();

try {
  const [rows] = await connection.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
  const tableNames = rows
    .map((row) => Object.values(row)[0])
    .filter((name) => typeof name === "string");

  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const tableName of tableNames) {
    await connection.query(`DROP TABLE \`${tableName.replace(/`/g, "``")}\``);
  }
  await connection.query("SET FOREIGN_KEY_CHECKS = 1");

  console.log(`Reset test database "${config.database}". Dropped ${tableNames.length} tables.`);
} finally {
  await connection.end();
}

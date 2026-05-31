import { expect, test } from "@playwright/test";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import mysql, { type RowDataPacket } from "mysql2/promise";

async function connectTestDb() {
  const env = dotenv.parse(readFileSync(".env.test.local"));
  const url = new URL(env.DATABASE_URL);
  return mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });
}

test("all active non-custom non-test products have inventory rows", async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "DB integrity check only needs to run once.");

  const connection = await connectTestDb();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `
        SELECT p.id, p.name
        FROM products p
        LEFT JOIN productInventory pi ON pi.productId = p.id
        WHERE p.active = true
          AND p.category NOT IN ('custom', 'test')
          AND pi.id IS NULL
        ORDER BY p.id
      `
    );

    const missingInventoryRows = rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
    }));

    expect(
      missingInventoryRows,
      "Every active storefront product must have a productInventory row so admin stock display cannot mask missing data."
    ).toEqual([]);
  } finally {
    await connection.end();
  }
});

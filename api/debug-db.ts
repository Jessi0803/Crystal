import type { IncomingMessage, ServerResponse } from "node:http";
import mysql from "mysql2/promise";

/**
 * 只用來自檢 TiDB 裡有哪些表、orders 表欄位是否齊全。不回傳任何資料內容。
 * 驗證完刪除此檔。
 */
export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const url = process.env.DATABASE_URL;
    if (!url) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "DATABASE_URL missing" }));
      return;
    }
    const conn = await mysql.createConnection(url);
    const [dbNameRaw] = await conn.query("SELECT DATABASE() AS db");
    const currentDb = (dbNameRaw as Array<{ db: string }>)[0]?.db ?? null;
    const [dbsRaw] = await conn.query("SHOW DATABASES");
    const databases = (dbsRaw as Array<Record<string, string>>).map(
      (row) => Object.values(row)[0]
    );
    const [tablesRaw] = await conn.query("SHOW TABLES");
    const tables = (tablesRaw as Array<Record<string, string>>).map(
      (row) => Object.values(row)[0]
    );
    let orderColumns: string[] = [];
    let ordersError: string | null = null;
    try {
      const [cols] = await conn.query("SHOW COLUMNS FROM `orders`");
      orderColumns = (cols as Array<{ Field: string }>).map((c) => c.Field);
    } catch (e) {
      ordersError = e instanceof Error ? e.message : String(e);
    }
    await conn.end();
    res.statusCode = 200;
    res.end(
      JSON.stringify(
        { currentDb, databases, tables, orderColumns, ordersError },
        null,
        2
      )
    );
  } catch (err) {
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }
}

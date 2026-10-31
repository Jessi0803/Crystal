/** 僅供手動整合測試：沿用測試資料庫守門，不連正式叢集。 */
import fs from "node:fs/promises";
import { connectToTestDatabase } from "./test-db-helpers.mjs";
const { connection, config } = await connectToTestDatabase({ write: true });
try {
  const [[identity]] = await connection.query(
    "SELECT CURRENT_USER() AS currentUser"
  );
  if (!identity.currentUser.startsWith("3DeLUzaGBUJsiKt."))
    throw new Error("拒絕 migration：實際連線不是 crystal-test");
  console.log(`連線：crystal-test（${identity.currentUser}）`);
  const [[table]] = await connection.query(
    "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'promotions'",
    [config.database]
  );
  const [columns] = await connection.query(
    "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = 'orders' AND COLUMN_NAME IN ('promotion', 'customQuote')",
    [config.database]
  );
  if (Number(table.count) === 1 && columns.length === 2) {
    console.log("0046 已套用，無需重複執行。");
  } else if (Number(table.count) > 0 || columns.length > 0)
    throw new Error("偵測到部分 migration，請人工核對 0046，避免重複執行 DDL");
  else {
    const source = await fs.readFile(
      new URL("../drizzle/0046_promotions.sql", import.meta.url),
      "utf8"
    );
    const statements = source
      .replace(/^--.*$/gm, "")
      .split(";")
      .map(s => s.trim())
      .filter(Boolean);
    for (const statement of statements) await connection.query(statement);
    console.log("0046 已套用至 crystal-test；未修改正式資料庫。");
  }
  const [[versionColumn]] = await connection.query(
    "SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = ? AND table_name = 'orders' AND COLUMN_NAME = 'promotionFlowVersion'",
    [config.database]
  );
  if (Number(versionColumn.count) > 0) {
    console.log("0047 已套用，既有訂單版本不回填。");
  } else {
    const source = await fs.readFile(
      new URL(
        "../drizzle/0047_order_promotion_flow_version.sql",
        import.meta.url
      ),
      "utf8"
    );
    for (const statement of source
      .replace(/^--.*$/gm, "")
      .split(";")
      .map(s => s.trim())
      .filter(Boolean))
      await connection.query(statement);
    console.log("0047 已套用至 crystal-test；舊訂單維持 NULL。");
  }
} finally {
  await connection.end();
}

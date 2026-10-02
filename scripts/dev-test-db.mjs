/**
 * 本機 dev server，但連的是「測試資料庫」，不是正式站。
 *
 * 用途：在瀏覽器親手點一遍流程，又不會寫到正式資料。
 * 正式站的 dev server 請照舊用 `pnpm run dev`（port 3000）。
 *
 *   node scripts/dev-test-db.mjs
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import dotenv from "dotenv";

const TEST_PROJECT_ID = "3DeLUzaGBUJsiKt";
const PROD_PROJECT_ID = "2NtQ6iWnaDtLLkT";
const PORT = process.env.PORT ?? "3200";

const testEnv = dotenv.parse(fs.readFileSync(".env.test.local"));
const databaseUrl = testEnv.DATABASE_URL;
if (!databaseUrl) throw new Error(".env.test.local 缺少 DATABASE_URL");

// 保險：只允許測試叢集，連錯直接停
if (databaseUrl.includes(PROD_PROJECT_ID)) {
  throw new Error("拒絕啟動：這是正式資料庫");
}
if (!databaseUrl.includes(TEST_PROJECT_ID)) {
  throw new Error("拒絕啟動：DATABASE_URL 不是測試資料庫");
}

// 圖片上傳要真的 Blob token 才會動；沒有就只是上傳鈕會報錯，其餘功能不受影響
let blobToken = "";
try {
  blobToken = dotenv.parse(fs.readFileSync(".env.local")).BLOB_READ_WRITE_TOKEN ?? "";
} catch {
  /* 沒有 .env.local 就算了 */
}

console.log("==============================================");
console.log(` 連線：測試資料庫（${TEST_PROJECT_ID}）`);
console.log(` 網址：http://localhost:${PORT}`);
console.log(` 圖片上傳：${blobToken ? "可用（會寫進 Blob）" : "未設定，上傳會報錯"}`);
console.log("==============================================");

const child = spawn("npx", ["tsx", "watch", "server/_core/index.ts"], {
  stdio: "inherit",
  env: {
    ...process.env,
    ...testEnv,
    DATABASE_URL: databaseUrl,
    NODE_ENV: "development",
    PORT,
    SITE_URL: `http://localhost:${PORT}`,
    JWT_SECRET: "local-test-db-jwt-secret-min-32-chars",
    BLOB_READ_WRITE_TOKEN: blobToken,
  },
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});

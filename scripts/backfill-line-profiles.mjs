/**
 * 一次性補齊既有 LINE 會員的 LINE 名稱與大頭貼（users.lineDisplayName / linePictureUrl）。
 *
 * 透過 Messaging API 取得官方帳號好友的 profile；非好友或已封鎖的會員查不到，會略過。
 * 只補空白欄位，不修改會員姓名，也不覆蓋 LINE 登入時寫入的較新資料。
 *
 * 預設只預覽：node scripts/backfill-line-profiles.mjs
 * 實際寫入：  node scripts/backfill-line-profiles.mjs --apply
 * 需先套用 drizzle/0040_users_line_profile.sql。使用 .env 的 DATABASE_URL 與 LINE_CHANNEL_ACCESS_TOKEN。
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const apply = process.argv.includes("--apply");
const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is required");

const url = new URL(process.env.DATABASE_URL);
const connection = await mysql.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.replace(/^\//, "")),
  ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchProfile(lineUserId) {
  const response = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(lineUserId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return { status: "not_friend" };
  if (!response.ok) return { status: "error", httpStatus: response.status };
  const profile = await response.json();
  const displayName = typeof profile.displayName === "string" ? profile.displayName.trim().slice(0, 100) : "";
  const pictureUrl =
    typeof profile.pictureUrl === "string" && profile.pictureUrl.startsWith("https://") && profile.pictureUrl.length <= 1024
      ? profile.pictureUrl
      : "";
  return { status: "ok", displayName: displayName || null, pictureUrl: pictureUrl || null };
}

try {
  const [[target]] = await connection.query("SELECT DATABASE() AS db");
  console.log(`target: ${url.hostname} / ${target.db}  mode: ${apply ? "APPLY" : "dry-run"}`);

  const [rows] = await connection.query(
    `SELECT id, openId FROM users
     WHERE openId LIKE 'line:%' AND (lineDisplayName IS NULL OR linePictureUrl IS NULL)
     ORDER BY id`
  );
  const counts = { candidates: rows.length, found: 0, updated: 0, notFriend: 0, errors: 0, noPicture: 0 };

  for (const row of rows) {
    const result = await fetchProfile(row.openId.slice("line:".length));
    if (result.status === "not_friend") counts.notFriend += 1;
    else if (result.status === "error") {
      counts.errors += 1;
      console.warn(`user ${row.id}: LINE API HTTP ${result.httpStatus}`);
    } else {
      counts.found += 1;
      if (!result.pictureUrl) counts.noPicture += 1;
      if (apply) {
        const [update] = await connection.query(
          `UPDATE users
           SET lineDisplayName = COALESCE(lineDisplayName, ?), linePictureUrl = COALESCE(linePictureUrl, ?)
           WHERE id = ? AND openId = ?`,
          [result.displayName, result.pictureUrl, row.id, row.openId]
        );
        if (update.affectedRows > 0) counts.updated += 1;
      }
    }
    await sleep(100);
  }

  console.log(counts);
  if (!apply) console.log("dry-run only; re-run with --apply to write");
} finally {
  await connection.end();
}

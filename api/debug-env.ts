import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * 只用來自檢環境變數有沒有正確注入 Serverless Function。
 * 只會回傳「是否有值」跟「長度」，不會回傳內容。
 * 驗證完後可刪除此檔案。
 */
export default function handler(_req: IncomingMessage, res: ServerResponse) {
  const keys = [
    "DATABASE_URL",
    "JWT_SECRET",
    "RESEND_API_KEY",
    "ECPAY_MERCHANT_ID",
    "ECPAY_HASH_KEY",
    "ECPAY_HASH_IV",
    "ECPAY_LOGISTICS_MERCHANT_ID",
    "ECPAY_LOGISTICS_HASH_KEY",
    "ECPAY_LOGISTICS_HASH_IV",
    "ECPAY_PAYMENT_HASH_KEY",
    "ECPAY_PAYMENT_HASH_IV",
    "NODE_ENV",
  ] as const;

  const status: Record<string, { present: boolean; length: number }> = {};
  for (const k of keys) {
    const v = process.env[k];
    status[k] = {
      present: typeof v === "string" && v.length > 0,
      length: typeof v === "string" ? v.length : 0,
    };
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(
    JSON.stringify(
      {
        at: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV ?? null,
        env: status,
      },
      null,
      2
    )
  );
}

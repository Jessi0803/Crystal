import type { IncomingMessage, ServerResponse } from "node:http";

/** 用來確認 Vercel 有部署 Serverless Functions（非純靜態） */
export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ ok: true, at: new Date().toISOString() }));
}

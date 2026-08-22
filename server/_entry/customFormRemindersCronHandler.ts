import type { IncomingMessage, ServerResponse } from "node:http";
import { runCustomFormReminderJob } from "../customFormReminders";

function writeJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function isAuthorized(req: IncomingMessage) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;

  const auth = req.headers.authorization;
  const headerSecret = req.headers["x-cron-secret"];
  return auth === `Bearer ${secret}` || headerSecret === secret;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    writeJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  if (!isAuthorized(req)) {
    writeJson(res, 401, { error: "unauthorized" });
    return;
  }

  try {
    const result = await runCustomFormReminderJob();
    writeJson(res, 200, { ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[custom-form-reminders cron] failed", error);
    writeJson(res, 500, { ok: false, error: message });
  }
}

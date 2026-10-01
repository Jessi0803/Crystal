import type { Request, Response } from "express";
import { TRPCError } from "@trpc/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function requestIp(req: Request) {
  const headers = req?.headers ?? {};
  const vercelIp = headers["x-vercel-forwarded-for"];
  const forwarded = headers["x-forwarded-for"];
  const raw = vercelIp ?? forwarded;
  const first = (Array.isArray(raw) ? raw[0] : raw)?.split(",")[0]?.trim();
  return first || req?.ip || req?.socket?.remoteAddress || "unknown";
}

function pruneExpired(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) buckets.delete(key);
  });
  if (buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value as string);
}

/**
 * E2E 測試用的限流放寬倍率。
 *
 * 全套 e2e 會在幾分鐘內大量登入與下單，正式的上限（例如 20 次 / 15 分鐘）會讓測試
 * 互相擠爆，產生與產品無關的假性失敗。
 *
 * 兩道防線確保正式站不受影響：
 * 1. 必須明確設定 E2E_RATE_LIMIT_MULTIPLIER（只在 playwright.config.ts 的測試伺服器設定）
 * 2. 跑在 Vercel／Lambda 上時一律忽略，就算環境變數被誤設也不會生效
 */
function rateLimitMultiplier() {
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) return 1;
  const raw = Number(process.env.E2E_RATE_LIMIT_MULTIPLIER);
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.min(raw, 1000);
}

export function enforceRateLimit(
  req: Request,
  res: Response,
  scope: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now();
  pruneExpired(now);
  const effectiveLimit = limit * rateLimitMultiplier();
  const key = `${scope}:${requestIp(req)}`;
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + windowMs }
    : { count: current.count + 1, resetAt: current.resetAt };
  buckets.set(key, bucket);

  if (typeof res?.setHeader === "function") {
    res.setHeader("X-RateLimit-Limit", String(effectiveLimit));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, effectiveLimit - bucket.count)));
  }
  if (bucket.count <= effectiveLimit) return;

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  if (typeof res?.setHeader === "function") res.setHeader("Retry-After", String(retryAfter));
  throw new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: "操作過於頻繁，請稍後再試",
  });
}

export function resetRateLimitsForTests() {
  buckets.clear();
}

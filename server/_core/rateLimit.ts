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

export function enforceRateLimit(
  req: Request,
  res: Response,
  scope: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now();
  pruneExpired(now);
  const key = `${scope}:${requestIp(req)}`;
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + windowMs }
    : { count: current.count + 1, resetAt: current.resetAt };
  buckets.set(key, bucket);

  if (typeof res?.setHeader === "function") {
    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit - bucket.count)));
  }
  if (bucket.count <= limit) return;

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

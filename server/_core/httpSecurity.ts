import type { NextFunction, Request, Response } from "express";

export function setSecurityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

function requestOrigin(req: Request) {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  const host = (req.get("x-forwarded-host") || req.get("host") || "").trim();
  return host ? `${protocol}://${host}` : null;
}

/** 阻擋瀏覽器從其他網站帶著 session cookie 呼叫 tRPC mutation。 */
export function enforceTrustedOrigin(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  // Server-to-server、Webhook 與舊客戶端可能沒有 Origin；tRPC 的跨站瀏覽器請求會帶 Origin。
  if (!origin) return next();

  const configured = process.env.SITE_URL?.trim().replace(/\/$/, "");
  const allowed = new Set([configured, requestOrigin(req)].filter((value): value is string => Boolean(value)));
  if (allowed.has(origin.replace(/\/$/, ""))) return next();

  res.status(403).json({ error: { code: "INVALID_ORIGIN", message: "不允許的請求來源" } });
}

export function publicServerError(err: unknown) {
  if (process.env.NODE_ENV === "development") {
    return err instanceof Error ? err.stack || err.message : String(err);
  }
  return "Internal Server Error";
}

/**
 * LINE Login（OAuth 2.0）— 與 Email 會員共用 users 表與 JWT session。
 *
 * 環境變數（Vercel / .env）：
 * - LINE_CHANNEL_ID：LINE Login Channel 的 Channel ID
 * - LINE_CHANNEL_SECRET：Channel secret
 * - LINE_CALLBACK_URL（選填）：完整 Callback URL，須與 LINE 後台登入的 Callback 完全一致；
 *   未設定時由請求的 Host / X-Forwarded-* 組出（本機請搭配 ngrok 或設此變數）
 * - SITE_URL（選填）：網站根網址，無尾隨斜線；有助於正確組出 redirect
 */
import type { Express, Request, Response } from "express";
import * as crypto from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { normalizeOrderEmail } from "./_core/emailNormalize";
import { sdk } from "./_core/sdk";
import * as db from "./db";

const LINE_STATE_COOKIE = "line_oauth_state";

function lineConfig() {
  const channelId = process.env.LINE_CHANNEL_ID?.trim();
  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim();
  return { channelId, channelSecret };
}

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  const parsed = parseCookieHeader(raw);
  return typeof parsed[name] === "string" ? parsed[name] : undefined;
}

function siteBaseUrl(req: Request): string {
  const fixed = process.env.SITE_URL?.trim().replace(/\/$/, "");
  if (fixed) return fixed;
  const host = (req.get("x-forwarded-host") || req.get("host") || "").trim();
  const protoHeader = req.get("x-forwarded-proto");
  const proto =
    (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader?.split(",")[0]?.trim()) ||
    (req.protocol === "https" ? "https" : "http");
  return `${proto}://${host}`;
}

function lineCallbackUrl(req: Request): string {
  const fromEnv = process.env.LINE_CALLBACK_URL?.trim();
  if (fromEnv) return fromEnv;
  return `${siteBaseUrl(req)}/api/oauth/line/callback`;
}

async function lineExchangeCode(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; id_token?: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    console.error("[LINE OAuth] token error", json);
    throw new Error(String(json.error_description || json.error || "line_token_failed"));
  }
  return json as { access_token: string; id_token?: string };
}

type LineProfile = { userId: string; displayName?: string; pictureUrl?: string };

async function lineGetProfile(accessToken: string): Promise<LineProfile> {
  const res = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as LineProfile & { message?: string };
  if (!res.ok) {
    console.error("[LINE OAuth] profile error", json);
    throw new Error(json.message || "line_profile_failed");
  }
  return json;
}

type VerifyPayload = { sub?: string; email?: string };

async function lineVerifyIdToken(idToken: string, clientId: string): Promise<VerifyPayload> {
  const body = new URLSearchParams({ id_token: idToken, client_id: clientId });
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = (await res.json()) as VerifyPayload & { error?: string };
  if (!res.ok || !json.sub) {
    console.error("[LINE OAuth] verify error", json);
    throw new Error(json.error || "line_verify_failed");
  }
  return json;
}

export function registerLineOAuthRoutes(app: Express) {
  app.get("/api/oauth/line/start", (req: Request, res: Response) => {
    const { channelId, channelSecret } = lineConfig();
    if (!channelId || !channelSecret) {
      res
        .status(503)
        .send(
          "LINE 登入尚未設定：請在環境變數設定 LINE_CHANNEL_ID、LINE_CHANNEL_SECRET，並於 LINE Developers 登錄 Callback URL。"
        );
      return;
    }

    const state = crypto.randomBytes(24).toString("hex");
    const callback = lineCallbackUrl(req);
    const cookieOpts = { ...getSessionCookieOptions(req), maxAge: 600_000 };
    res.cookie(LINE_STATE_COOKIE, state, cookieOpts);

    const authorize = new URL("https://access.line.me/oauth2/v2.1/authorize");
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("client_id", channelId);
    authorize.searchParams.set("redirect_uri", callback);
    authorize.searchParams.set("state", state);
    authorize.searchParams.set("scope", "profile openid email");

    res.redirect(302, authorize.toString());
  });

  app.get("/api/oauth/line/callback", async (req: Request, res: Response) => {
    const clearStateCookie = () => {
      res.clearCookie(LINE_STATE_COOKIE, { path: "/", ...getSessionCookieOptions(req) });
    };

    try {
      const code = typeof req.query.code === "string" ? req.query.code : "";
      const state = typeof req.query.state === "string" ? req.query.state : "";
      const cookieState = readCookie(req, LINE_STATE_COOKIE);
      if (!code || !state || !cookieState || state !== cookieState) {
        clearStateCookie();
        res.status(400).send("登入狀態驗證失敗，請關閉視窗後從登入頁再試一次。");
        return;
      }

      const { channelId, channelSecret } = lineConfig();
      if (!channelId || !channelSecret) {
        clearStateCookie();
        res.status(503).send("LINE 登入尚未設定。");
        return;
      }

      const redirectUri = lineCallbackUrl(req);
      const tokenJson = await lineExchangeCode(code, redirectUri, channelId, channelSecret);
      const profile = await lineGetProfile(tokenJson.access_token);

      let email: string | null = null;
      if (tokenJson.id_token) {
        try {
          const verify = await lineVerifyIdToken(tokenJson.id_token, channelId);
          if (verify.email) {
            email = normalizeOrderEmail(verify.email);
          }
        } catch {
          // 未授權 email scope 或 verify 失敗時略過
        }
      }

      const openId = `line:${profile.userId}`;
      const name = profile.displayName?.trim() || null;

      await db.upsertUser({
        openId,
        name: name ?? undefined,
        email: email ?? undefined,
        loginMethod: "line",
        lastSignedIn: new Date(),
      });

      let user = await db.getUserByOpenId(openId);
      if (!user) {
        throw new Error("user_missing_after_upsert");
      }

      if (db.shouldGrantAdminRole(user.openId, user.email) && user.role !== "admin") {
        const db2 = await db.getDb();
        if (db2) {
          const { users } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          await db2.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
          user = (await db.getUserByOpenId(openId))!;
        }
      }

      const sessionToken = await sdk.createSessionToken(openId, {
        name: user.name ?? "",
        expiresInMs: ONE_YEAR_MS,
      });
      clearStateCookie();
      const sessionCookieOpts = { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS };
      res.cookie(COOKIE_NAME, sessionToken, sessionCookieOpts);
      res.redirect(302, "/member");
    } catch (err) {
      console.error("[LINE OAuth] callback failed", err);
      clearStateCookie();
      res.status(500).send("LINE 登入失敗，請稍後再試。");
    }
  });
}

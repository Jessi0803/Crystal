import type { Express, Request, Response } from "express";
import express from "express";
import * as crypto from "node:crypto";

type LineWebhookEvent = {
  type?: string;
  source?: {
    type?: string;
    userId?: string;
  };
  timestamp?: number;
};

type LineWebhookBody = {
  destination?: string;
  events?: LineWebhookEvent[];
};

function getMessagingChannelSecret(): string | undefined {
  return (
    process.env.LINE_MESSAGING_CHANNEL_SECRET?.trim() ||
    process.env.LINE_WEBHOOK_CHANNEL_SECRET?.trim()
  );
}

function timingSafeEqualString(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function verifyLineSignature(rawBody: Buffer, signature: string, channelSecret: string): boolean {
  const expected = crypto.createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  return timingSafeEqualString(expected, signature);
}

function parseLineWebhookBody(rawBody: Buffer): LineWebhookBody {
  if (rawBody.length === 0) return {};
  const parsed = JSON.parse(rawBody.toString("utf8")) as unknown;
  if (!parsed || typeof parsed !== "object") return {};
  return parsed as LineWebhookBody;
}

function lineWebhookHandler(req: Request, res: Response): void {
  const channelSecret = getMessagingChannelSecret();
  if (!channelSecret) {
    res.status(503).json({
      ok: false,
      error: "LINE_MESSAGING_CHANNEL_SECRET is not configured",
    });
    return;
  }

  const signature = req.get("x-line-signature") || "";
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
  if (!signature || !verifyLineSignature(rawBody, signature, channelSecret)) {
    res.status(401).json({ ok: false, error: "invalid LINE signature" });
    return;
  }

  try {
    const body = parseLineWebhookBody(rawBody);
    const events = Array.isArray(body.events) ? body.events : [];

    for (const event of events) {
      console.info("[LINE Webhook] event received", {
        type: event.type,
        sourceType: event.source?.type,
        userId: event.source?.userId,
        timestamp: event.timestamp,
      });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[LINE Webhook] failed to parse body", err);
    res.status(400).json({ ok: false, error: "invalid webhook body" });
  }
}

export function registerLineWebhookRoutes(app: Express) {
  app.get(["/api/line/webhook", "/api/trpc/line-webhook"], (_req, res) => {
    res.json({
      ok: true,
      endpoint: "LINE Messaging API webhook",
      configured: Boolean(getMessagingChannelSecret()),
    });
  });

  app.post(
    ["/api/line/webhook", "/api/trpc/line-webhook"],
    express.raw({ type: "application/json", limit: "2mb" }),
    lineWebhookHandler
  );
}

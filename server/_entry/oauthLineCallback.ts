// Vercel：GET /api/oauth-line-callback（vercel.json 將 /api/oauth/line/callback rewrite 至此）
import type { IncomingMessage, ServerResponse } from "node:http";
import express, { type NextFunction } from "express";
import { lineOAuthCallback } from "../lineOAuthRoutes";

const PATH = "/api/oauth-line-callback";

const app = express();
app.get(PATH, lineOAuthCallback);

app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", path: req.url } });
});

app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.stack || err.message : String(err);
    console.error("[api/oauth-line-callback] express error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: { code: "LINE_OAUTH_EXPRESS_ERROR", message } });
    }
  }
);

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}

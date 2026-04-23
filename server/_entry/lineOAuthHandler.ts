// Vercel：/api/line-oauth/*（vercel.json 將 /api/oauth/line/* rewrite 至此）
import type { IncomingMessage, ServerResponse } from "node:http";
import express, { type NextFunction } from "express";
import { registerLineOAuthRoutes } from "../lineOAuthRoutes";

const app = express();
registerLineOAuthRoutes(app);

app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", path: req.url } });
});

app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.stack || err.message : String(err);
    console.error("[api/line-oauth] express error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: { code: "LINE_OAUTH_EXPRESS_ERROR", message } });
    }
  }
);

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}

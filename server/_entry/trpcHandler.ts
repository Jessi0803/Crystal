// Vercel Serverless Function 的 tRPC 入口。
// 透過 esbuild 打包成 api/trpc/[trpc].js 後，Vercel 只當成一般 JS 部署，
// 不必再走它自己的 TS 編譯與 ESM 解析，徹底避開 directory-import / .js 副檔名問題。
import type { IncomingMessage, ServerResponse } from "node:http";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../appRouter";
import { createContext } from "../_core/context";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get(["/api/trpc/ping", "/ping"], (_req, res) => {
  res.json({ ok: true, at: new Date().toISOString() });
});

app.use(
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", path: req.url } });
});

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const message =
      err instanceof Error ? err.stack || err.message : String(err);
    console.error("[api/trpc] express error:", err);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: { code: "TRPC_EXPRESS_ERROR", message } });
    }
  }
);

function writeJson(res: ServerResponse, status: number, body: unknown) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(
      req,
      res
    );
  } catch (err) {
    const message = err instanceof Error ? err.stack || err.message : String(err);
    console.error("[api/trpc] handler threw:", err);
    writeJson(res, 500, { error: { code: "HANDLER_THREW", message } });
  }
}

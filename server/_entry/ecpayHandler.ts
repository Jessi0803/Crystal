// Vercel Serverless Function 的 ECPay 入口。
// 透過 esbuild 打包成 api/ecpay/[...path].js 後，Vercel 會將 /api/ecpay/* 的請求
// 一律導來這支 function。底層沿用 registerECPayRoutes() 註冊的 Express 路由，
// 以確保 Serverless 版本與本地長駐版行為一致。
import type { IncomingMessage, ServerResponse } from "node:http";
import express from "express";
import { registerECPayRoutes } from "../ecpayRoutes";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerECPayRoutes(app);

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
    console.error("[api/ecpay] express error:", err);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: { code: "ECPAY_EXPRESS_ERROR", message } });
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
    console.error("[api/ecpay] handler threw:", err);
    writeJson(res, 500, { error: { code: "HANDLER_THREW", message } });
  }
}

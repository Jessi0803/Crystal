import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { enforceRateLimit } from "./rateLimit";
import { recordAuditEventSafely } from "../auditDb";

export const PUBLIC_INTERNAL_ERROR_MESSAGE = "系統暫時發生錯誤，請稍後再試";

/**
 * 非預期的錯誤（資料庫錯誤、一般 throw new Error 等）會被 tRPC 包成 INTERNAL_SERVER_ERROR，
 * 並沿用原始訊息（可能含 SQL 與查詢參數）。這類錯誤只回傳通用訊息，完整內容由 logTrpcError 記在伺服器。
 * 明確寫給使用者的 TRPCError（有自己的 message）與其他錯誤代碼維持原樣。
 */
export function isUnexpectedInternalError(error: TRPCError) {
  if (error.code !== "INTERNAL_SERVER_ERROR") return false;
  const cause = error.cause;
  return cause != null && !(cause instanceof TRPCError) && error.message === cause.message;
}

export function logTrpcError({ error, path, type }: { error: TRPCError; path?: string; type?: string }) {
  if (error.code !== "INTERNAL_SERVER_ERROR") return;
  console.error(`[tRPC] ${type ?? "request"} ${path ?? "(unknown)"} failed:`, error.cause ?? error);
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    if (!isUnexpectedInternalError(error)) return shape;
    // 開發環境的 stack 第一行同樣包含原始訊息，一併移除；完整內容見伺服器 log
    const { stack: _stack, ...data } = shape.data;
    return { ...shape, message: PUBLIC_INTERNAL_ERROR_MESSAGE, data };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export function rateLimitedPublicProcedure(config: {
  scope: string;
  limit: number;
  windowMs: number;
}) {
  return t.procedure.use(
    t.middleware(async ({ ctx, next }) => {
      enforceRateLimit(ctx.req, ctx.res, config.scope, config.limit, config.windowMs);
      return next();
    })
  );
}

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export function rateLimitedProtectedProcedure(config: {
  scope: string;
  limit: number;
  windowMs: number;
}) {
  return protectedProcedure.use(
    t.middleware(async ({ ctx, next }) => {
      enforceRateLimit(ctx.req, ctx.res, config.scope, config.limit, config.windowMs);
      return next();
    })
  );
}

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    const rawInput = opts.type === "mutation" ? await opts.getRawInput() : undefined;
    const input = rawInput && typeof rawInput === "object" ? rawInput as Record<string, unknown> : {};
    const orderId = typeof input.orderId === "number" ? input.orderId : null;
    const merchantTradeNo = typeof input.merchantTradeNo === "string" ? input.merchantTradeNo : null;

    try {
      const result = await next({
        ctx: {
          ...ctx,
          user: ctx.user,
        },
      });

      if (opts.type === "mutation") {
        await recordAuditEventSafely({
          source: "admin",
          category: opts.path.split(".")[0] || "admin",
          action: opts.path,
          outcome: result.ok ? "success" : "failed",
          severity: result.ok ? "info" : "error",
          orderId,
          merchantTradeNo,
          actorUserId: ctx.user.id,
          summary: result.ok ? `管理員操作 ${opts.path} 完成` : `管理員操作 ${opts.path} 失敗`,
          details: result.ok ? { input } : { input, error: result.error.message },
        });
      }
      return result;
    } catch (error) {
      if (opts.type === "mutation") {
        await recordAuditEventSafely({
          source: "admin",
          category: opts.path.split(".")[0] || "admin",
          action: opts.path,
          outcome: "failed",
          severity: "error",
          orderId,
          merchantTradeNo,
          actorUserId: ctx.user.id,
          summary: `管理員操作 ${opts.path} 發生例外`,
          details: { input, error: error instanceof Error ? error.message : String(error) },
        });
      }
      throw error;
    }
  }),
);

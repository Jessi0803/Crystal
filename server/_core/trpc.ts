import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { enforceRateLimit } from "./rateLimit";
import { recordAuditEventSafely } from "../auditDb";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
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

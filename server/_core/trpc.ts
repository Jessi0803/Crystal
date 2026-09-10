import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { enforceRateLimit } from "./rateLimit";

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

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

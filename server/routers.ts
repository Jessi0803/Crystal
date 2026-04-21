import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { orderRouter } from "./routers/order";
import { chatbotRouter } from "./routers/chatbot";
import { inventoryRouter } from "./routers/inventory";
import { memberRouter } from "./routers/member";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  order: orderRouter,
  chatbot: chatbotRouter,
  inventory: inventoryRouter,
  member: memberRouter,
});

export type AppRouter = typeof appRouter;

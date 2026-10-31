import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { promotions } from "../../drizzle/schema";
import { getDb } from "../db";
import { getActivePromotion } from "../promotionDb";
import { router, publicProcedure, adminProcedure } from "../_core/trpc";
const fields = z.object({
  name: z.string().trim().min(1).max(100),
  threshold: z.number().int().min(1).max(10_000_000),
  discountAmount: z.number().int().min(1).max(10_000_000),
  maxDiscount: z.number().int().min(1).max(10_000_000).nullable(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  isActive: z.boolean(),
});
export const promotionRouter = router({
  active: publicProcedure.query(() => getActivePromotion()),
  adminList: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(promotions).orderBy(desc(promotions.id));
  }),
  adminSave: adminProcedure
    .input(fields.extend({ id: z.number().int().positive().optional() }))
    .mutation(async ({ input }) => {
      if (new Date(input.endsAt) <= new Date(input.startsAt))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "結束時間須晚於開始時間",
        });
      if (input.discountAmount >= input.threshold)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "每次折抵須小於每滿金額",
        });
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...rest } = input;
      const values = {
        ...rest,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
      };
      if (id)
        await db.update(promotions).set(values).where(eq(promotions.id, id));
      else await db.insert(promotions).values(values);
      return { success: true };
    }),
});

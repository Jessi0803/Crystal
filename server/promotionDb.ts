import { and, eq, lte, gt, desc } from "drizzle-orm";
import { promotions } from "../drizzle/schema";
import { getDb } from "./db";
import type { PromotionRule } from "../shared/promotions";
export async function getActivePromotion(
  now = new Date()
): Promise<PromotionRule | null> {
  const db = await getDb();
  if (!db) throw new Error("目前無法確認活動，請稍後再試");
  // 本次只套用一個活動，不支援活動疊加。
  const [row] = await db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.isActive, true),
        lte(promotions.startsAt, now),
        gt(promotions.endsAt, now)
      )
    )
    .orderBy(desc(promotions.id))
    .limit(1);
  return row
    ? {
        id: row.id,
        name: row.name,
        threshold: row.threshold,
        discountAmount: row.discountAmount,
        maxDiscount: row.maxDiscount,
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
      }
    : null;
}

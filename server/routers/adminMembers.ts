import { TRPCError } from "@trpc/server";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { users, orders, orderItems } from "../../drizzle/schema";
import { getDb } from "../db";
import { adminProcedure, router } from "../_core/trpc";

const VIP_TIERS = ["none", "vip", "vvip"] as const;

async function ensureMemberVipColumns() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  try {
    await db.execute(sql`ALTER TABLE \`users\` ADD COLUMN \`vipTier\` varchar(32) NOT NULL DEFAULT 'none'`);
  } catch (error) {
    if (!String(error).includes("Duplicate column")) console.warn("[adminMembers] ensure vipTier column:", error);
  }

  try {
    await db.execute(sql`ALTER TABLE \`users\` ADD COLUMN \`vipNote\` text NULL`);
  } catch (error) {
    if (!String(error).includes("Duplicate column")) console.warn("[adminMembers] ensure vipNote column:", error);
  }

  return db;
}

function memberOrderMatch(userId: number, email?: string | null) {
  const conditions = [eq(orders.userId, userId)];
  const normalizedEmail = email?.trim().toLowerCase();

  if (normalizedEmail) {
    conditions.push(sql`LOWER(TRIM(${orders.buyerEmail})) = ${normalizedEmail}`);
  }

  return or(...conditions);
}

const paidValueSql = sql<number>`
  SUM(
    CASE
      WHEN ${orders.paymentStatus} IN ('paid', 'confirmed')
        OR ${orders.orderStatus} IN ('deposit_paid', 'paid', 'processing', 'shipped', 'arrived', 'picked_up', 'completed')
      THEN ${orders.totalAmount}
      ELSE 0
    END
  )
`;

export const adminMembersRouter = router({
  list: adminProcedure
    .input(
      z
        .object({
          search: z.string().trim().max(100).optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .default({ limit: 50, offset: 0 })
    )
    .query(async ({ input }) => {
      const db = await ensureMemberVipColumns();
      const term = input.search ? `%${input.search}%` : undefined;
      const where = term
        ? or(
            sql`${users.name} LIKE ${term}`,
            sql`${users.email} LIKE ${term}`,
            sql`CAST(${users.id} AS CHAR) LIKE ${term}`
          )
        : undefined;

      const [totalRow] = where
        ? await db.select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` }).from(users).where(where)
        : await db.select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` }).from(users);

      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          loginMethod: users.loginMethod,
          role: users.role,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
          vipTier: sql<(typeof VIP_TIERS)[number]>`COALESCE(\`vipTier\`, 'none')`,
          vipNote: sql<string | null>`${sql.raw("`vipNote`")}`,
          orderCount: sql<number>`CAST(COUNT(DISTINCT ${orders.id}) AS SIGNED)`,
          totalSpent: sql<number>`CAST(COALESCE(${paidValueSql}, 0) AS SIGNED)`,
          latestOrderAt: sql<Date | null>`MAX(${orders.createdAt})`,
        })
        .from(users)
        .leftJoin(
          orders,
          or(
            eq(orders.userId, users.id),
            and(
              sql`${users.email} IS NOT NULL`,
              sql`${users.email} != ''`,
              sql`LOWER(TRIM(${orders.buyerEmail})) = LOWER(TRIM(${users.email}))`
            )
          )
        )
        .where(where)
        .groupBy(
          users.id,
          users.name,
          users.email,
          users.loginMethod,
          users.role,
          users.createdAt,
          users.lastSignedIn,
          sql.raw("`vipTier`"),
          sql.raw("`vipNote`")
        )
        .orderBy(desc(sql`MAX(${orders.createdAt})`), desc(users.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        items: rows,
        total: Number(totalRow?.count ?? 0),
      };
    }),

  detail: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await ensureMemberVipColumns();
      const [member] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          loginMethod: users.loginMethod,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          lastSignedIn: users.lastSignedIn,
          vipTier: sql<(typeof VIP_TIERS)[number]>`COALESCE(\`vipTier\`, 'none')`,
          vipNote: sql<string | null>`${sql.raw("`vipNote`")}`,
        })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "找不到會員" });

      const history = await db
        .select({
          id: orders.id,
          merchantTradeNo: orders.merchantTradeNo,
          paymentStatus: orders.paymentStatus,
          paymentMethod: orders.paymentMethod,
          shippingMethod: orders.shippingMethod,
          orderStatus: orders.orderStatus,
          isPreorder: orders.isPreorder,
          isCustomOrder: orders.isCustomOrder,
          totalAmount: orders.totalAmount,
          buyerName: orders.buyerName,
          buyerEmail: orders.buyerEmail,
          buyerPhone: orders.buyerPhone,
          createdAt: orders.createdAt,
          paidAt: orders.paidAt,
          itemCount: sql<number>`CAST(COUNT(${orderItems.id}) AS SIGNED)`,
        })
        .from(orders)
        .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
        .where(memberOrderMatch(member.id, member.email))
        .groupBy(
          orders.id,
          orders.merchantTradeNo,
          orders.paymentStatus,
          orders.paymentMethod,
          orders.shippingMethod,
          orders.orderStatus,
          orders.isPreorder,
          orders.isCustomOrder,
          orders.totalAmount,
          orders.buyerName,
          orders.buyerEmail,
          orders.buyerPhone,
          orders.createdAt,
          orders.paidAt
        )
        .orderBy(desc(orders.createdAt))
        .limit(100);

      return { member, orders: history };
    }),

  updateVip: adminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        vipTier: z.enum(VIP_TIERS),
        vipNote: z.string().trim().max(1000).nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await ensureMemberVipColumns();
      await db.execute(sql`
        UPDATE \`users\`
        SET \`vipTier\` = ${input.vipTier},
            \`vipNote\` = ${input.vipNote?.trim() || null},
            \`updatedAt\` = NOW()
        WHERE \`id\` = ${input.userId}
      `);

      return { success: true };
    }),
});

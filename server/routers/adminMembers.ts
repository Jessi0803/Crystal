import { TRPCError } from "@trpc/server";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { users, orders, orderItems } from "../../drizzle/schema";
import { getDb } from "../db";
import { adminProcedure, router } from "../_core/trpc";
import { birthdaySchema } from "./member";

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

const MAX_SEARCH_TOKENS = 5;

/**
 * 會員搜尋：不分大小寫的部分比對（users 欄位為 utf8mb4_bin，需自行轉小寫）。
 * 以空白拆成多個關鍵字，每個關鍵字都要命中姓名、Email、LINE 信箱或會員 ID 其中之一；
 * 使用者輸入的 % 與 _ 視為一般字元。
 */
export function buildMemberSearchWhere(search?: string) {
  const tokens = (search ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_SEARCH_TOKENS);
  if (tokens.length === 0) return undefined;

  return and(
    ...tokens.map((token) => {
      const pattern = `%${token.replace(/[!%_]/g, (char) => `!${char}`)}%`;
      return or(
        sql`LOWER(${users.name}) LIKE ${pattern} ESCAPE '!'`,
        sql`LOWER(${users.email}) LIKE ${pattern} ESCAPE '!'`,
        sql`LOWER(${users.lineEmail}) LIKE ${pattern} ESCAPE '!'`,
        sql`CAST(${users.id} AS CHAR) LIKE ${pattern} ESCAPE '!'`
      );
    })
  );
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
      const where = buildMemberSearchWhere(input.search);

      const [totalRow] = where
        ? await db.select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` }).from(users).where(where)
        : await db.select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` }).from(users);

      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          loginMethod: users.loginMethod,
          lineBound: sql<number>`CASE WHEN ${users.openId} LIKE 'line:%' THEN 1 ELSE 0 END`,
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
          users.openId,
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
        items: rows.map((row) => ({ ...row, lineBound: Number(row.lineBound) === 1 })),
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
          openId: users.openId,
          lineEmail: users.lineEmail,
          birthYear: users.birthYear,
          birthMonth: users.birthMonth,
          birthDay: users.birthDay,
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

      const { openId, ...memberFields } = member;
      return { member: { ...memberFields, lineBound: openId.startsWith("line:") }, orders: history };
    }),

  /** 客服代會員修改生日；birthday 為 null 表示清除，讓會員重新填寫 */
  updateBirthday: adminProcedure
    .input(z.object({ userId: z.number().int().positive(), birthday: birthdaySchema.nullable() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [member] = await db.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "找不到會員" });
      await db
        .update(users)
        .set({
          birthYear: input.birthday?.year ?? null,
          birthMonth: input.birthday?.month ?? null,
          birthDay: input.birthday?.day ?? null,
        })
        .where(eq(users.id, input.userId));
      return { success: true };
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

  deleteMember: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "不能刪除目前登入的管理員帳號" });
      }

      const db = await ensureMemberVipColumns();
      const [member] = await db
        .select({
          id: users.id,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "找不到會員" });
      if (member.role === "admin") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "不能從會員管理刪除管理員帳號" });
      }

      await db.execute(sql`UPDATE \`orders\` SET \`userId\` = NULL WHERE \`userId\` = ${input.userId}`);
      await db.execute(sql`UPDATE \`chatbotLogs\` SET \`userId\` = NULL WHERE \`userId\` = ${input.userId}`);
      // 未使用的優惠券隨會員刪除；已使用的保留，作為訂單折抵紀錄
      await db.execute(sql`DELETE FROM \`memberCoupons\` WHERE \`userId\` = ${input.userId} AND \`status\` <> 'used'`);
      await db.execute(sql`DELETE FROM \`users\` WHERE \`id\` = ${input.userId}`);

      return { success: true, deletedUserId: input.userId };
    }),
});

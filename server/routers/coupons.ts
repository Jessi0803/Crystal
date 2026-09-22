import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { users } from "../../drizzle/schema";
import { adminProcedure, protectedProcedure, rateLimitedProtectedProcedure, router } from "../_core/trpc";
import {
  CouponError,
  createCouponTemplate,
  getCouponTemplate,
  getCouponTemplateDetail,
  getLineFriendRewardForUser,
  getLineFriendRewardOffer,
  getLineFriendRewardSettings,
  grantLineFriendReward,
  issueCoupon,
  listActiveCouponTemplates,
  listCouponTemplatesWithStats,
  listMemberCoupons,
  saveLineFriendRewardSettings,
  updateCouponTemplate,
  type CouponTemplateInput,
} from "../couponDb";
import { getDb } from "../db";
import { checkLineFriendship, lineUserIdFromOpenId } from "../lineFriendship";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** 固定截止日期以台灣時間當天 23:59:59 為止 */
export function parseFixedExpiresOn(value: string) {
  if (!DATE_ONLY.test(value)) return null;
  const date = new Date(`${value}T23:59:59+08:00`);
  if (Number.isNaN(date.getTime())) return null;
  // 排除 2026-02-30 這類會被自動進位的日期
  const roundTrip = new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return roundTrip === value ? date : null;
}

const templateInputSchema = z
  .object({
    name: z.string().trim().min(1, "請輸入優惠券名稱").max(100, "優惠券名稱最多 100 字"),
    discountAmount: z.number().int("折抵金額需為整數").min(1, "折抵金額至少 1 元").max(100_000, "折抵金額過大"),
    minOrderAmount: z.number().int("最低消費需為整數").min(0, "最低消費不可為負數").max(10_000_000, "最低消費過大"),
    validityType: z.enum(["days_after_issue", "fixed_date"]),
    validDays: z.number().int("天數需為整數").min(1, "有效天數至少 1 天").max(3650, "有效天數最多 3650 天").nullable(),
    fixedExpiresOn: z.string().nullable(),
    maxPerUser: z.number().int("領取上限需為整數").min(1, "每位會員至少可領 1 張").max(100, "每位會員最多 100 張"),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.validityType === "days_after_issue" && data.validDays == null) {
      ctx.addIssue({ code: "custom", message: "請輸入發放後有效天數", path: ["validDays"] });
    }
    if (data.validityType === "fixed_date") {
      const date = data.fixedExpiresOn ? parseFixedExpiresOn(data.fixedExpiresOn) : null;
      if (!date) {
        ctx.addIssue({ code: "custom", message: "請輸入有效的截止日期", path: ["fixedExpiresOn"] });
      } else if (date.getTime() <= Date.now()) {
        ctx.addIssue({ code: "custom", message: "截止日期需晚於今天", path: ["fixedExpiresOn"] });
      }
    }
  });

type TemplateInput = z.infer<typeof templateInputSchema>;

function toTemplateInput(input: TemplateInput): CouponTemplateInput {
  return {
    name: input.name,
    discountAmount: input.discountAmount,
    minOrderAmount: input.minOrderAmount,
    validityType: input.validityType,
    validDays: input.validityType === "days_after_issue" ? input.validDays : null,
    fixedExpiresAt:
      input.validityType === "fixed_date" && input.fixedExpiresOn ? parseFixedExpiresOn(input.fixedExpiresOn) : null,
    maxPerUser: input.maxPerUser,
    isActive: input.isActive,
  };
}

function toTrpcError(error: unknown): never {
  if (error instanceof CouponError) {
    throw new TRPCError({ code: error.code === "NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST", message: error.message });
  }
  throw error;
}

async function withCouponErrors<T>(run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    toTrpcError(error);
  }
}

async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  const [user] = await db
    .select({ id: users.id, openId: users.openId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}

const lineRewardMessages = {
  granted: "LINE 好友優惠券已放入會員帳戶",
  already: "您已經領取過 LINE 好友禮",
  disabled: "目前沒有 LINE 好友禮活動",
} as const;

export const couponRouter = router({
  // ─── 後台 ─────────────────────────────────────────────────────────────────
  adminList: adminProcedure.query(() => listCouponTemplatesWithStats()),

  adminGet: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const detail = await getCouponTemplateDetail(input.id);
    if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "找不到優惠券" });
    return detail;
  }),

  adminCreate: adminProcedure
    .input(templateInputSchema)
    .mutation(({ input }) => withCouponErrors(() => createCouponTemplate(toTemplateInput(input)))),

  adminUpdate: adminProcedure
    .input(z.object({ id: z.number().int().positive(), data: templateInputSchema }))
    .mutation(({ input }) => withCouponErrors(() => updateCouponTemplate(input.id, toTemplateInput(input.data)))),

  adminSetActive: adminProcedure
    .input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
    .mutation(({ input }) =>
      withCouponErrors(async () => {
        const template = await getCouponTemplate(input.id);
        if (!template) throw new CouponError("NOT_FOUND", "找不到優惠券");
        return updateCouponTemplate(input.id, { ...template, isActive: input.isActive });
      })
    ),

  adminActiveTemplates: adminProcedure.query(() => listActiveCouponTemplates()),

  adminMemberCoupons: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(({ input }) => listMemberCoupons(input.userId)),

  adminIssue: adminProcedure
    .input(z.object({ userId: z.number().int().positive(), templateId: z.number().int().positive() }))
    .mutation(({ input, ctx }) =>
      withCouponErrors(async () => {
        const member = await getUserById(input.userId);
        if (!member) throw new CouponError("NOT_FOUND", "找不到會員");
        const coupon = await issueCoupon({
          templateId: input.templateId,
          userId: member.id,
          source: "ADMIN_GIFT",
          issuedByUserId: ctx.user.id,
        });
        return { id: coupon.id, name: coupon.name, expiresAt: coupon.expiresAt };
      })
    ),

  /** 第一版生日優惠：由管理員選取當月壽星後人工批次發放，不含自動排程或通知。 */
  adminIssueBirthdayBatch: adminProcedure
    .input(
      z.object({
        userIds: z.array(z.number().int().positive()).min(1).max(200),
        templateId: z.number().int().positive(),
        birthdayMonth: z.number().int().min(1).max(12),
        campaignYear: z.number().int().min(2020).max(2100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const template = await getCouponTemplate(input.templateId);
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "找不到優惠券" });
      if (!template.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "此優惠券已停用，無法發放" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userIds = Array.from(new Set(input.userIds));
      const members = await db
        .select({ id: users.id, birthMonth: users.birthMonth })
        .from(users)
        .where(inArray(users.id, userIds));
      const memberById = new Map(members.map((member) => [member.id, member]));
      const campaignKey = `birthday:${input.campaignYear}`;
      const results: Array<{ userId: number; status: "issued" | "skipped" | "failed"; message?: string }> = [];

      for (const userId of userIds) {
        const member = memberById.get(userId);
        if (!member) {
          results.push({ userId, status: "failed", message: "找不到會員" });
          continue;
        }
        if (member.birthMonth !== input.birthdayMonth) {
          results.push({ userId, status: "failed", message: "會員不屬於所選生日月份" });
          continue;
        }

        try {
          await issueCoupon({
            templateId: input.templateId,
            userId,
            source: "BIRTHDAY",
            campaignKey,
            issuedByUserId: ctx.user.id,
          });
          results.push({ userId, status: "issued" });
        } catch (error) {
          if (error instanceof CouponError && error.code === "LIMIT_REACHED") {
            results.push({ userId, status: "skipped", message: error.message });
          } else {
            console.error("[birthdayCoupon] issue failed", { userId, campaignKey, error });
            results.push({
              userId,
              status: "failed",
              message: error instanceof CouponError ? error.message : "發放失敗，請稍後重試",
            });
          }
        }
      }

      return {
        campaignKey,
        templateName: template.name,
        issued: results.filter((result) => result.status === "issued").length,
        skipped: results.filter((result) => result.status === "skipped").length,
        failed: results.filter((result) => result.status === "failed").length,
        results,
      };
    }),

  adminLineRewardSettings: adminProcedure.query(() => getLineFriendRewardSettings()),

  adminSaveLineRewardSettings: adminProcedure
    .input(z.object({ enabled: z.boolean(), templateId: z.number().int().positive().nullable() }))
    .mutation(({ input }) => withCouponErrors(() => saveLineFriendRewardSettings(input))),

  // ─── 會員 ─────────────────────────────────────────────────────────────────
  mine: protectedProcedure.query(({ ctx }) => listMemberCoupons(ctx.user.id)),

  lineRewardStatus: protectedProcedure.query(async ({ ctx }) => {
    const [offer, reward] = await Promise.all([
      getLineFriendRewardOffer(),
      getLineFriendRewardForUser(ctx.user.id),
    ]);
    return {
      offer,
      lineBound: lineUserIdFromOpenId(ctx.user.openId) != null,
      claimed: reward != null,
    };
  }),

  /** 已綁定 LINE 的會員加入好友後，主動領取好友禮（由伺服器向 LINE 確認好友狀態） */
  claimLineFriendReward: rateLimitedProtectedProcedure({
    scope: "line-friend-reward",
    limit: 10,
    windowMs: 15 * 60_000,
  }).mutation(async ({ ctx }) => {
    const lineUserId = lineUserIdFromOpenId(ctx.user.openId);
    if (!lineUserId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "請先綁定 LINE 帳號" });
    }
    const existing = await getLineFriendRewardForUser(ctx.user.id);
    if (existing) return { status: "already" as const, message: lineRewardMessages.already };

    const friendship = await checkLineFriendship({ lineUserId });
    if (friendship.status === "unknown") {
      throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "暫時無法向 LINE 確認好友狀態，請稍後再試" });
    }
    if (friendship.status === "not_friend") {
      return { status: "not_friend" as const, message: "尚未加入官方 LINE 好友，加入後再按一次即可領取" };
    }

    const result = await grantLineFriendReward({ userId: ctx.user.id, lineUserId });
    if (result.status === "unavailable") {
      return { status: "unavailable" as const, message: result.message };
    }
    return { status: result.status, message: lineRewardMessages[result.status] };
  }),
});

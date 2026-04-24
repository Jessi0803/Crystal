/**
 * 會員系統 Router（Email 登入）
 * - register: 註冊（email + 密碼 + 姓名）
 * - login: 登入
 * - logout: 登出
 * - me: 取得目前登入會員資訊
 * - forgotPassword: 申請重設密碼（回傳 token，實際發信由前端提示）
 * - resetPassword: 使用 token 重設密碼
 * - updateProfile: 更新姓名
 * - myOrders: 查詢自己的訂單
 */
import { TRPCError } from "@trpc/server";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { sdk } from "../_core/sdk";
import * as crypto from "crypto";
import * as db from "../db";
import { getOrdersForMember } from "../orderDb";
import { sendPasswordResetEmail, sendVerificationEmail } from "../email";

const SALT_ROUNDS = 10;

// 密碼規則：至少 8 字元
const passwordSchema = z.string().min(8, "密碼至少需要 8 個字元");

export const memberRouter = router({
  /** 註冊 */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("請輸入有效的 Email"),
        password: passwordSchema,
        name: z.string().min(1, "請輸入姓名").max(50),
        origin: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 檢查 Email 是否已被使用
      const existing = await db.getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "此 Email 已被註冊，請直接登入或使用忘記密碼",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
      const user = await db.createEmailUser({
        email: input.email,
        passwordHash,
        name: input.name,
      });

      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "註冊失敗，請稍後再試" });
      }

      // 自動登入：建立 session cookie
      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

      // 發送驗證信（必須 await，否則 Vercel Serverless 會在 response 結束後凍結 function）
      const verifyToken = crypto.randomBytes(32).toString("hex");
      const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 小時
      await db.setVerifyToken(input.email, verifyToken, verifyExpiresAt);
      const siteOrigin = input.origin ?? "https://goodaytarot.com";
      const verifyUrl = `${siteOrigin}/verify-email?token=${verifyToken}`;
      try {
        await sendVerificationEmail({
          to: input.email,
          name: input.name,
          verifyUrl,
        });
      } catch (err) {
        console.error("[Email] 驗證信發送失敗:", err);
      }

      return { success: true, user: { id: user.id, name: user.name, email: user.email } };
    }),

  /** 登入 */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("請輸入有效的 Email"),
        password: z.string().min(1, "請輸入密碼"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let user = await db.getUserByEmail(input.email);

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email 或密碼錯誤",
        });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email 或密碼錯誤",
        });
      }

      // 既有帳號若符合 admin 名單，登入時自動補齊 admin 權限。
      if (db.shouldGrantAdminRole(user.openId, user.email) && user.role !== "admin") {
        const db2 = await db.getDb();
        if (db2) {
          const { users } = await import("../../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          await db2.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
          user = { ...user, role: "admin" };
        }
      }

      // 建立 session cookie
      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

      return { success: true, user: { id: user.id, name: user.name, email: user.email } };
    }),

  /** 驗證 Email */
  verifyEmail: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const user = await db.getUserByVerifyToken(input.token);
      if (!user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "驗證連結已失效或不存在，請重新發送驗證信",
        });
      }
      await db.markEmailVerified(user.id);
      return { success: true, message: "Email 已驗證成功" };
    }),

  /** 重新發送驗證信 */
  resendVerification: protectedProcedure
    .input(z.object({ origin: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user.email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "無法取得 Email" });
      }
      const user = await db.getUserByEmail(ctx.user.email);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "帳號不存在" });
      if (user.emailVerified) {
        return { success: true, message: "Email 已經驗證過" };
      }
      const verifyToken = crypto.randomBytes(32).toString("hex");
      const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.setVerifyToken(ctx.user.email, verifyToken, verifyExpiresAt);
      const siteOrigin = input.origin ?? "https://goodaytarot.com";
      const verifyUrl = `${siteOrigin}/verify-email?token=${verifyToken}`;
      await sendVerificationEmail({
        to: ctx.user.email,
        name: ctx.user.name ?? ctx.user.email,
        verifyUrl,
      });
      return { success: true, message: "驗證信已重新發送" };
    }),

  /** 申請重設密碼 */
  forgotPassword: publicProcedure
    .input(z.object({
      email: z.string().email(),
      origin: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const user = await db.getUserByEmail(input.email);

      // 不論 email 是否存在都回傳成功，避免洩漏帳號資訊
      if (!user || !user.passwordHash) {
        return { success: true, message: "若此 Email 已註冊，重設連結已發送" };
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 小時後過期
      await db.setResetToken(input.email, token, expiresAt);

      const siteOrigin = input.origin ?? "https://goodaytarot.com";
      const resetUrl = `${siteOrigin}/reset-password?token=${token}`;

      // 必須 await，Vercel Serverless 會在 response 結束後凍結 function
      try {
        await sendPasswordResetEmail({
          to: input.email,
          name: user.name ?? input.email,
          resetUrl,
        });
      } catch (err) {
        console.error("[Email] 忘記密碼信發送失敗:", err);
      }

      return {
        success: true,
        message: "若此 Email 已註冊，重設連結已發送",
      };
    }),

  /** 使用 token 重設密碼 */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        newPassword: passwordSchema,
      })
    )
    .mutation(async ({ input }) => {
      const user = await db.getUserByResetToken(input.token);
      if (!user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "重設連結已失效或不存在，請重新申請",
        });
      }

      const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
      await db.updatePasswordAndClearToken(user.id, passwordHash);

      return { success: true, message: "密碼已重設，請重新登入" };
    }),

  /** 更新會員姓名 */
  updateProfile: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(50) }))
    .mutation(async ({ input, ctx }) => {
      const db2 = await db.getDb();
      if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db2.update(users).set({ name: input.name }).where(eq(users.openId, ctx.user.openId));
      return { success: true };
    }),

  /** 查詢自己的訂單 */
  myOrders: protectedProcedure.query(async ({ ctx }) => {
    return getOrdersForMember({
      userId: ctx.user.id,
      email: ctx.user.email,
    });
  }),
});

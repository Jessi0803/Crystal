import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { ENV } from "./env";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  /** 前台及 E2E 只需要知道目前是否為沙盒，不暴露商店識別資料。 */
  paymentMode: publicProcedure.query(() => ({
    ecpaySandbox: process.env.ECPAY_SANDBOX === "true",
    ecpayLogisticsSandbox: process.env.ECPAY_LOGISTICS_SANDBOX === "true",
  })),

  /** 僅供管理員診斷環境變數是否注入；不回傳值或金鑰前綴。 */
  envCheck: adminProcedure.query(() => ({
    hasResendApiKey: !!ENV.resendApiKey && ENV.resendApiKey.length > 0,
    nodeEnv: process.env.NODE_ENV ?? "(not set)",
    hasEcpayMerchantId: !!process.env.ECPAY_MERCHANT_ID,
    hasEcpayHashKey: !!process.env.ECPAY_HASH_KEY,
    ecpaySandbox: process.env.ECPAY_SANDBOX === "true",
    hasEcpayLogisticsMerchantId: !!process.env.ECPAY_LOGISTICS_MERCHANT_ID,
    hasEcpayLogisticsHashKey: !!process.env.ECPAY_LOGISTICS_HASH_KEY,
    hasEcpayLogisticsHashIV: !!process.env.ECPAY_LOGISTICS_HASH_IV,
    ecpayLogisticsSandbox: process.env.ECPAY_LOGISTICS_SANDBOX === "true",
  })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});

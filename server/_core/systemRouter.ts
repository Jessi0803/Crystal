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

  /** 診斷用：確認環境變數是否正確注入（不回傳實際値） */
  envCheck: publicProcedure.query(() => ({
    hasResendApiKey: !!ENV.resendApiKey && ENV.resendApiKey.length > 0,
    resendApiKeyPrefix: ENV.resendApiKey ? ENV.resendApiKey.substring(0, 8) + "..." : "(empty)",
    nodeEnv: process.env.NODE_ENV ?? "(not set)",
    // 綠界金流
    hasEcpayMerchantId: !!process.env.ECPAY_MERCHANT_ID,
    ecpayMerchantId: process.env.ECPAY_MERCHANT_ID || "(empty)",
    hasEcpayHashKey: !!process.env.ECPAY_HASH_KEY,
    ecpayHashKeyPrefix: process.env.ECPAY_HASH_KEY ? process.env.ECPAY_HASH_KEY.substring(0, 6) + "..." : "(empty)",
    // 綠界物流
    hasEcpayLogisticsMerchantId: !!process.env.ECPAY_LOGISTICS_MERCHANT_ID,
    ecpayLogisticsMerchantId: process.env.ECPAY_LOGISTICS_MERCHANT_ID || "(empty)",
    hasEcpayLogisticsHashKey: !!process.env.ECPAY_LOGISTICS_HASH_KEY,
    ecpayLogisticsHashKeyPrefix: process.env.ECPAY_LOGISTICS_HASH_KEY ? process.env.ECPAY_LOGISTICS_HASH_KEY.substring(0, 6) + "..." : "(empty)",
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

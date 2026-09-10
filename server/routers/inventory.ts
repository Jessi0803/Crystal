/**
 * 庫存管理 tRPC 路由
 * 處理：庫存查詢、庫存鎖定（結帳保留）、管理員設定庫存
 */
import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getProductAvailability,
  upsertProductInventory,
  getProductInventory,
  getDefaultAllowPreorder,
} from "../inventoryDb";

export const inventoryRouter = router({
  /**
   * 查詢商品可購買狀態（公開）
   */
  getAvailability: publicProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ input }) => {
      return getProductAvailability(input.productId);
    }),

  /**
   * 批次查詢多個商品的庫存狀態
   */
  getBatchAvailability: publicProcedure
    .input(z.object({ productIds: z.array(z.string()) }))
    .query(async ({ input }) => {
      const results = await Promise.all(
        input.productIds.map(async (id) => ({
          productId: id,
          ...(await getProductAvailability(id)),
        }))
      );
      return results;
    }),

  /**
   * 管理員設定商品庫存
   */
  setInventory: adminProcedure
    .input(
      z.object({
        productId: z.string(),
        productName: z.string(),
        stock: z.number().min(-1), // -1 = 無限庫存
        allowPreorder: z.boolean().optional(),
        preorderNote: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const allowPreorder = input.allowPreorder ?? (await getDefaultAllowPreorder(input.productId));
      await upsertProductInventory({
        productId: input.productId,
        productName: input.productName,
        stock: input.stock,
        allowPreorder,
        preorderNote: input.preorderNote,
      });
      return { success: true };
    }),

  /**
   * 管理員取得商品庫存設定
   */
  getInventory: adminProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ input }) => {
      return getProductInventory(input.productId);
    }),
});

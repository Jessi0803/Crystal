import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { dbProducts, type DbProduct } from "../../drizzle/schema";
import { storagePut } from "../storage";

let tableEnsured = false;
async function ensureProductsTable() {
  if (tableEnsured) return;
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`products\` (
      \`id\` varchar(64) NOT NULL,
      \`name\` varchar(200) NOT NULL,
      \`subtitle\` varchar(200) NOT NULL DEFAULT '',
      \`category\` varchar(64) NOT NULL,
      \`categoryLabel\` varchar(64) NOT NULL,
      \`price\` int NOT NULL,
      \`originalPrice\` int DEFAULT NULL,
      \`priceRange\` varchar(200) DEFAULT NULL,
      \`depositRange\` varchar(200) DEFAULT NULL,
      \`image\` mediumtext NOT NULL,
      \`tags\` json DEFAULT NULL,
      \`description\` text DEFAULT NULL,
      \`story\` text DEFAULT NULL,
      \`benefits\` json DEFAULT NULL,
      \`suitableFor\` json DEFAULT NULL,
      \`howToUse\` json DEFAULT NULL,
      \`disclaimer\` text DEFAULT NULL,
      \`crystalType\` text DEFAULT NULL,
      \`color\` varchar(100) DEFAULT NULL,
      \`featured\` boolean NOT NULL DEFAULT false,
      \`active\` boolean NOT NULL DEFAULT true,
      \`sortOrder\` int NOT NULL DEFAULT 0,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    )
  `);
  // 若資料表已存在但 image 欄位是 text（64KB 上限），升級為 mediumtext（16MB）
  try {
    await db.execute(sql`ALTER TABLE \`products\` MODIFY COLUMN \`image\` mediumtext NOT NULL`);
  } catch { /* 已是 mediumtext 或其他無害錯誤，略過 */ }
  // 一次性補值：更新四種客製化商品的注意事項
  try {
    const customDisclaimer = [
      "《初版與維修》",
      "免費提供一次初版修改或維修。",
      "",
      "可調整範圍：更換不喜歡的配飾、調整水晶或配飾的擺放順序。",
      "",
      "以下需加收 NT$200：",
      "・更改手圍、新增條件（如要銀管、要珠框、不要紫色、要磁扣等）— 因屬重新設計，請在預約時直接告知。",
      "・第二次或以上的修改。",
    ].join("\n");
    const customIds = [
      "custom-deposit-product",
      "tarot-crystal-deposit-product",
      "chakra-crystal-deposit-product",
      "numerology-crystal-deposit-product",
    ];
    for (const id of customIds) {
      await db.execute(
        sql`UPDATE \`products\` SET \`disclaimer\` = ${customDisclaimer} WHERE \`id\` = ${id} AND (\`disclaimer\` IS NULL OR \`disclaimer\` = '此商品為客製化服務訂金，實際尾款金額由老闆確認後另行通知。')`
      );
    }
  } catch { /* 略過 */ }
  // 一次性補值：更新四種客製化商品的下單流程
  try {
    const customHowToUse = JSON.stringify([
      "填寫以下報名表單，提供手圍、喜歡金飾或銀飾，並確認設計需求。",
      "支付訂金。",
      "加入官方 LINE，等待設計師傳送水晶搭配圖。",
      "手鍊與設計確認完成後，將提供尾款報價。",
      "尾款支付完畢，準備出貨。",
    ]);
    const customIds = [
      "custom-deposit-product",
      "tarot-crystal-deposit-product",
      "chakra-crystal-deposit-product",
      "numerology-crystal-deposit-product",
    ];
    for (const id of customIds) {
      await db.execute(
        sql`UPDATE \`products\` SET \`howToUse\` = ${customHowToUse} WHERE \`id\` = ${id}`
      );
    }
  } catch { /* 略過 */ }
  tableEnsured = true;
}

function toFrontendProduct(p: DbProduct) {
  return {
    id: p.id,
    name: p.name,
    subtitle: p.subtitle ?? "",
    category: p.category,
    categoryLabel: p.categoryLabel,
    price: p.price,
    originalPrice: p.originalPrice ?? undefined,
    priceRange: p.priceRange ?? undefined,
    depositRange: p.depositRange ?? undefined,
    image: p.image,
    tags: (p.tags as string[]) ?? [],
    description: p.description ?? "",
    story: p.story ?? "",
    benefits: (p.benefits as string[]) ?? [],
    suitableFor: (p.suitableFor as string[]) ?? [],
    howToUse: (p.howToUse as string[]) ?? [],
    disclaimer: p.disclaimer ?? "",
    inStock: p.active,
    featured: p.featured,
    crystalType: p.crystalType ?? "",
    color: p.color ?? "",
  };
}

const ProductInputSchema = z.object({
  name: z.string().min(1),
  subtitle: z.string().default(""),
  category: z.string().min(1),
  categoryLabel: z.string().min(1),
  price: z.number().int().min(0),
  originalPrice: z.number().int().min(0).optional(),
  priceRange: z.string().optional(),
  depositRange: z.string().optional(),
  image: z.string().min(1),
  tags: z.array(z.string()).default([]),
  description: z.string().default(""),
  story: z.string().default(""),
  benefits: z.array(z.string()).default([]),
  suitableFor: z.array(z.string()).default([]),
  howToUse: z.array(z.string()).default([]),
  disclaimer: z.string().default(""),
  crystalType: z.string().default(""),
  color: z.string().default(""),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const productRouter = router({
  list: publicProcedure.query(async () => {
    await ensureProductsTable();
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select()
      .from(dbProducts)
      .where(and(eq(dbProducts.active, true)));
    return rows
      .filter((p) => p.category !== "test")
      .sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt.getTime() - a.createdAt.getTime())
      .map(toFrontendProduct);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      await ensureProductsTable();
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select()
        .from(dbProducts)
        .where(eq(dbProducts.id, input.id))
        .limit(1);
      return rows[0] ? toFrontendProduct(rows[0]) : null;
    }),

  adminList: adminProcedure.query(async () => {
    await ensureProductsTable();
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(dbProducts);
    return rows
      .filter((p) => p.category !== "test")
      .sort((a, b) => (a.active ? 0 : 1) - (b.active ? 0 : 1) || a.sortOrder - b.sortOrder);
  }),

  create: adminProcedure
    .input(ProductInputSchema)
    .mutation(async ({ input }) => {
      await ensureProductsTable();
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫無法連線" });
      const id = `prod-${Date.now()}`;
      await db.insert(dbProducts).values({ id, ...input });
      return { id };
    }),

  update: adminProcedure
    .input(ProductInputSchema.extend({ id: z.string() }))
    .mutation(async ({ input }) => {
      await ensureProductsTable();
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫無法連線" });
      const { id, ...data } = input;
      await db.update(dbProducts).set(data).where(eq(dbProducts.id, id));
      return { success: true };
    }),

  toggleActive: adminProcedure
    .input(z.object({ id: z.string(), active: z.boolean() }))
    .mutation(async ({ input }) => {
      await ensureProductsTable();
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫無法連線" });
      await db.update(dbProducts).set({ active: input.active }).where(eq(dbProducts.id, input.id));
      return { success: true };
    }),

  uploadImage: adminProcedure
    .input(z.object({
      filename: z.string(),
      contentType: z.string(),
      dataBase64: z.string().max(6_000_000),
    }))
    .mutation(async ({ input }) => {
      const buf = Buffer.from(input.dataBase64, "base64");
      const ext = input.filename.split(".").pop() ?? "jpg";
      const key = `products/${Date.now()}.${ext}`;
      const result = await storagePut(key, buf, input.contentType);
      return { url: result.url };
    }),

  seed: adminProcedure
    .input(z.array(ProductInputSchema.extend({ id: z.string() })))
    .mutation(async ({ input }) => {
      await ensureProductsTable();
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫無法連線" });
      let count = 0;
      for (const product of input) {
        const existing = await db
          .select({ id: dbProducts.id })
          .from(dbProducts)
          .where(eq(dbProducts.id, product.id))
          .limit(1);
        if (existing.length === 0) {
          await db.insert(dbProducts).values(product);
          count++;
        }
      }
      return { count };
    }),
});

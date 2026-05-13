import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { dbProducts, type DbProduct } from "../../drizzle/schema";
import { storagePut } from "../storage";

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
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫無法連線" });
      const id = `prod-${Date.now()}`;
      await db.insert(dbProducts).values({ id, ...input });
      return { id };
    }),

  update: adminProcedure
    .input(ProductInputSchema.extend({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫無法連線" });
      const { id, ...data } = input;
      await db.update(dbProducts).set(data).where(eq(dbProducts.id, id));
      return { success: true };
    }),

  toggleActive: adminProcedure
    .input(z.object({ id: z.string(), active: z.boolean() }))
    .mutation(async ({ input }) => {
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

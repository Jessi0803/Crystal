import { eq, inArray, or } from "drizzle-orm";
import type { Request, Response } from "express";
import { products as staticProducts } from "../client/src/lib/data";
import { dbProducts } from "../drizzle/schema";
import { getDb } from "./db";

const SITE_ORIGIN = "https://goodaytarot.com";
const PUBLIC_PATHS = [
  "/",
  "/products",
  "/quiz",
  "/custom",
  "/custom/form",
  "/custom/form-b",
  "/custom/form-c",
  "/custom/form-d",
  "/knowledge",
  "/shopping-guide",
  "/crystal-workshop",
  "/contact",
  "/about",
  "/terms",
  "/privacy",
];
const staticProductIds = staticProducts
  .filter((product) => product.category !== "test")
  .map((product) => product.id);

export async function serveSitemap(_req: Request, res: Response) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Match the storefront's active catalog and static products. A DB row
    // takes precedence over its static counterpart, even after unpublishing.
    const rows = await db
      .select({ id: dbProducts.id, active: dbProducts.active, category: dbProducts.category })
      .from(dbProducts)
      .where(or(eq(dbProducts.active, true), inArray(dbProducts.id, staticProductIds)));
    const databaseIds = new Set(rows.map((product) => product.id));
    const productIds = [
      ...rows.filter((product) => product.active && product.category !== "test").map((product) => product.id),
      ...staticProductIds.filter((id) => !databaseIds.has(id)),
    ];
    const paths = [
      ...PUBLIC_PATHS,
      ...productIds.sort().map((id) => `/products/${encodeURIComponent(id)}`),
    ];
    const urls = paths.map((path) => `  <url><loc>${SITE_ORIGIN}${path}</loc></url>`);
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls,
      "</urlset>",
      "",
    ].join("\n");

    res.set("Cache-Control", "public, max-age=0, s-maxage=300").type("application/xml").send(xml);
  } catch (error) {
    console.error("[sitemap] failed to load public products", error);
    res.status(503).set("Cache-Control", "no-store").type("text/plain").send("Sitemap temporarily unavailable");
  }
}

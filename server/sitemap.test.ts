import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { getDb } from "./db";
import { serveSitemap } from "./sitemap";

vi.mock("./db", () => ({ getDb: vi.fn() }));

function response() {
  return {
    status: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
    send: vi.fn(),
  };
}

describe("sitemap", () => {
  it("lists public routes and published products without reintroducing unpublished static IDs", async () => {
    const where = vi.fn().mockResolvedValue([
      { id: "商品&1", active: true, category: "healing" },
      { id: "d001-moon-secret", active: false, category: "healing" },
      { id: "test-product", active: true, category: "test" },
    ]);
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({ from: () => ({ where }) }),
    } as unknown as Awaited<ReturnType<typeof getDb>>);
    const res = response();

    await serveSitemap({} as Request, res as unknown as Response);

    const xml = res.send.mock.calls[0][0];
    expect(res.type).toHaveBeenCalledWith("application/xml");
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain("<loc>https://goodaytarot.com/knowledge</loc>");
    expect(xml).toContain("/products/%E5%95%86%E5%93%81%261</loc>");
    expect(xml).toContain("/products/custom-deposit-product</loc>");
    expect(xml).not.toMatch(/d001-moon-secret|test-product|test-credit-5|\.com\/(admin|member|checkout|order|balance)/);
  });

  it("returns a non-cacheable 503 when the product catalog is unavailable", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const res = response();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await serveSitemap({} as Request, res as unknown as Response);
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.set).toHaveBeenCalledWith("Cache-Control", "no-store");
    } finally {
      log.mockRestore();
    }
  });
});

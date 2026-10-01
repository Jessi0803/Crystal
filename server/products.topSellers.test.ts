import { describe, expect, it } from "vitest";
import { rankTopSellers } from "./routers/products";

const products = [
  { id: "a", featured: false, sortOrder: 3 },
  { id: "b", featured: false, sortOrder: 1 },
  { id: "c", featured: true, sortOrder: 9 },
  { id: "d", featured: false, sortOrder: 2 },
];

describe("rankTopSellers", () => {
  it("puts featured products first, then the best sellers", () => {
    const sales = new Map([
      ["a", 5],
      ["b", 30],
      ["c", 0],
      ["d", 12],
    ]);

    expect(rankTopSellers(products, sales, 4).map((product) => product.id)).toEqual(["c", "b", "d", "a"]);
  });

  it("falls back to the manual sort order when nothing has sold", () => {
    expect(rankTopSellers(products, new Map(), 4).map((product) => product.id)).toEqual(["c", "b", "d", "a"]);
  });

  it("limits the number of products and keeps the input untouched", () => {
    const sales = new Map([["a", 5]]);
    expect(rankTopSellers(products, sales, 2)).toHaveLength(2);
    expect(products.map((product) => product.id)).toEqual(["a", "b", "c", "d"]);
  });
});

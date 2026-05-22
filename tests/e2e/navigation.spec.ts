import { expect, test } from "@playwright/test";

const routes = [
  ["/", /椛|Crystal|水晶/],
  ["/products", /商品|E2E 現貨手鍊/],
  ["/custom", /客製|專屬能量|四大客製方案/],
  ["/knowledge", /水晶/],
  ["/shopping-guide", /購物|配送|付款/],
  ["/contact", /LINE|Instagram|聯絡/],
  ["/about", /品牌|Crystal|椛/],
  ["/crystal-workshop", /水晶|課程|創業/],
] as const;

test.describe("navigation smoke", () => {
  for (const [path, text] of routes) {
    test(`loads ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("body")).toContainText(text);
      await expect(page.locator("body")).not.toContainText("Application error");
    });
  }

  test("unknown route shows not found page", async ({ page }) => {
    await page.goto("/not-a-real-route");
    await expect(page.locator("body")).toContainText(/404|找不到|不存在/);
  });
});

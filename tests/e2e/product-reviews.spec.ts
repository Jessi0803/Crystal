/**
 * 商品顧客回饋（第一階段：後台建立 → 商品頁顯示）
 *
 * 需先對測試資料庫套用 drizzle/0042_product_reviews.sql。
 * 每個測試都用唯一的顯示名稱建立自己的資料，結束前刪掉。
 */
import { expect, test, type Page } from "@playwright/test";
import { loginAsAdminByCookie } from "./helpers";

// 這份測試一輪會進出後台好幾次，預設的 30 秒不夠
test.describe.configure({ timeout: 90_000 });

const IN_STOCK = { id: "e2e-bracelet-in-stock", name: "E2E 現貨手鍊" };
const PREORDER = { id: "e2e-bracelet-preorder", name: "E2E 預購手鍊" };

function uniqueName(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

/** 橫向捲軸是捲到底才撈下一批，要先全部載完才能驗排序 */
async function loadAllReviews(page: Page) {
  const scroller = page.locator('[aria-label="顧客回饋"]');
  await expect(scroller).toBeVisible({ timeout: 30_000 });
  let previous = -1;
  for (let round = 0; round < 12; round += 1) {
    const current = await page.locator("article").count();
    if (current === previous) break;
    previous = current;
    await scroller.evaluate((element) => element.scrollTo({ left: element.scrollWidth }));
    await page.waitForTimeout(600);
  }
  return page.locator("article").count();
}

/** 後台列表在手機是 <li> 卡片、桌機是 <tr>，兩種版型只有一種看得見 */
function reviewRow(page: Page, displayName: string) {
  return page.locator("li:visible, tr:visible").filter({ hasText: displayName }).first();
}

async function openAdminReviews(page: Page) {
  await loginAsAdminByCookie(page);
  await page.goto("/admin/reviews");
  await expect(page.getByRole("heading", { name: "商品回饋管理" })).toBeVisible({ timeout: 30_000 });
  // AdminLayout 會在 auth.me 回來時從「無外殼」換成「有側欄」，整頁元件因此 remount。
  // 太早開彈窗會被這次 remount 關掉，所以先等外殼就定位。
  await expect(page.locator("aside")).toHaveCount(1, { timeout: 30_000 });
}

/** 在新增／編輯彈窗裡填完整份表單 */
async function fillReviewForm(
  page: Page,
  options: { productName: string; displayName: string; rating: number; content: string; status?: "上架（商品頁顯示）" | "隱藏" | "待審核" }
) {
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("搜尋商品名稱").fill(options.productName);
  await dialog.getByRole("button", { name: options.productName, exact: true }).click();
  await expect(dialog.getByText(`已選擇：${options.productName}`)).toBeVisible();

  await dialog.getByPlaceholder("例如：Ducky").fill(options.displayName);
  await dialog.getByRole("button", { name: `給 ${options.rating} 星` }).click();
  await dialog.locator("textarea").fill(options.content);
  if (options.status) {
    await dialog.locator("select").first().selectOption({ label: options.status });
  }
}

async function createReview(
  page: Page,
  options: { productName: string; displayName: string; rating: number; content: string; status?: "上架（商品頁顯示）" | "隱藏" | "待審核" }
) {
  await page.getByRole("button", { name: "新增回饋" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await fillReviewForm(page, options);
  await page.getByRole("dialog").getByRole("button", { name: "儲存" }).click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 30_000 });
  await expect(reviewRow(page, options.displayName)).toBeVisible({ timeout: 30_000 });
}

/**
 * 收尾用：直接呼叫 API 刪掉測試資料。
 * 清理不該受版面影響，UI 刪除另有專門的測試。
 */
async function cleanUpReviews(page: Page, displayName: string) {
  await loginAsAdminByCookie(page);
  const input = encodeURIComponent(JSON.stringify({ "0": { json: {} } }));
  const response = await page.request.get(`/api/trpc/reviews.adminList?batch=1&input=${input}`);
  if (response.status() !== 200) return;
  const rows = (await response.json())[0].result.data.json as { id: number; displayName: string }[];
  for (const row of rows.filter((item) => item.displayName === displayName)) {
    await page.request.post("/api/trpc/reviews.adminRemove?batch=1", { data: { "0": { json: { id: row.id } } } });
  }
}

/** 從後台列表按刪除鈕刪掉（window.confirm 自動按確定） */
async function deleteReview(page: Page, displayName: string) {
  page.once("dialog", (dialog) => dialog.accept());
  const row = reviewRow(page, displayName);
  // 後台標頭是 sticky 的，先把這一列捲到畫面中間，避免按鈕被蓋住
  await row.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await row.getByRole("button", { name: "刪除" }).click();
  await expect(page.getByText(displayName, { exact: true })).toHaveCount(0, { timeout: 30_000 });
}

test("後台建立的回饋會出現在對應商品頁，且不會出現在其他商品", async ({ page }) => {
  const displayName = uniqueName("E2E回饋");
  const content = `這是 ${displayName} 的測試回饋內容。`;

  await openAdminReviews(page);
  await createReview(page, { productName: IN_STOCK.name, displayName, rating: 5, content });

  try {
    // 綁定的商品頁看得到
    await page.goto(`/products/${IN_STOCK.id}`);
    await expect(page.getByRole("heading", { name: "顧客回饋" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(content)).toBeVisible();
    await expect(page.getByText(`— ${displayName}`)).toBeVisible();

    // 其他商品頁完全沒有這個區塊
    await page.goto(`/products/${PREORDER.id}`);
    await expect(page.getByText(content)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "顧客回饋" })).toHaveCount(0);
  } finally {
    await cleanUpReviews(page, displayName);
  }
});

test("隱藏的回饋不會顯示，重新上架後又出現", async ({ page }) => {
  const displayName = uniqueName("E2E隱藏");
  const content = `這是 ${displayName} 的測試回饋內容。`;

  await openAdminReviews(page);
  await createReview(page, { productName: IN_STOCK.name, displayName, rating: 4, content, status: "隱藏" });

  try {
    await page.goto(`/products/${IN_STOCK.id}`);
    await expect(page.getByText(content)).toHaveCount(0);

    // 列表上的開關直接上架
    await openAdminReviews(page);
    const row = reviewRow(page, displayName);
    await row.getByRole("switch").click();
    await expect(row.getByText("已上架")).toBeVisible({ timeout: 30_000 });

    await page.goto(`/products/${IN_STOCK.id}`);
    await expect(page.getByText(content)).toBeVisible({ timeout: 30_000 });
  } finally {
    await cleanUpReviews(page, displayName);
  }
});

test("沒有任何已上架回饋的商品，整個顧客回饋區塊不存在", async ({ page }) => {
  await page.goto(`/products/${PREORDER.id}`);
  await expect(page.getByRole("heading", { name: PREORDER.name })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "顧客回饋" })).toHaveCount(0);
  await expect(page.getByText("目前尚無評論")).toHaveCount(0);
});

test("沒有選商品不能送出", async ({ page }) => {
  await openAdminReviews(page);
  await page.getByRole("button", { name: "新增回饋" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByPlaceholder("例如：Ducky").fill("E2E 未選商品");
  await dialog.locator("textarea").fill("沒有選商品，不應該送得出去。");
  await dialog.getByRole("button", { name: "儲存" }).click();

  await expect(dialog.getByText("請選擇對應商品")).toBeVisible();
  await expect(dialog).toBeVisible();
});

test("編輯可以改內容與評分，商品頁跟著更新", async ({ page }) => {
  const displayName = uniqueName("E2E編輯");
  const content = `這是 ${displayName} 的原始內容。`;
  const updated = `這是 ${displayName} 的修改後內容。`;

  await openAdminReviews(page);
  await createReview(page, { productName: IN_STOCK.name, displayName, rating: 5, content });

  try {
    await reviewRow(page, displayName).getByRole("button", { name: "編輯" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator("textarea").fill(updated);
    await dialog.getByRole("button", { name: "給 3 星" }).click();
    await dialog.getByRole("button", { name: "儲存" }).click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });

    await page.goto(`/products/${IN_STOCK.id}`);
    await expect(page.getByText(updated)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(content)).toHaveCount(0);
    await expect(page.getByLabel("評分 3 顆星，滿分 5 顆星")).toBeVisible();
  } finally {
    await cleanUpReviews(page, displayName);
  }
});

test("排序數字小的回饋顯示在前面", async ({ page }) => {
  const first = uniqueName("E2E排序前");
  const second = uniqueName("E2E排序後");

  await openAdminReviews(page);
  await createReview(page, { productName: IN_STOCK.name, displayName: second, rating: 5, content: `${second} 的內容。` });
  await createReview(page, { productName: IN_STOCK.name, displayName: first, rating: 5, content: `${first} 的內容。` });

  try {
    // 把 first 的排序改成 -1，讓它排到 second 前面
    await reviewRow(page, first).getByRole("button", { name: "編輯" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("排序（數字小的在前）").fill("-1");
    await dialog.getByRole("button", { name: "儲存" }).click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });

    await page.goto(`/products/${IN_STOCK.id}`);
    await loadAllReviews(page);
    await expect(page.getByText(`— ${first}`)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(`— ${second}`)).toBeVisible();

    const texts = await page.locator("article").allInnerTexts();
    const firstIndex = texts.findIndex((text) => text.includes(first));
    const secondIndex = texts.findIndex((text) => text.includes(second));
    expect(firstIndex).toBeGreaterThanOrEqual(0);
    expect(secondIndex).toBeGreaterThanOrEqual(0);
    expect(firstIndex).toBeLessThan(secondIndex);
  } finally {
    await cleanUpReviews(page, first);
    await cleanUpReviews(page, second);
  }
});

test("刪除後商品頁不再顯示", async ({ page }) => {
  const displayName = uniqueName("E2E刪除");
  const content = `這是 ${displayName} 的測試回饋內容。`;

  await openAdminReviews(page);
  await createReview(page, { productName: IN_STOCK.name, displayName, rating: 5, content });
  await deleteReview(page, displayName);

  await page.goto(`/products/${IN_STOCK.id}`);
  await expect(page.getByText(content)).toHaveCount(0);
});

test("手機版的顧客回饋區塊版面正常", async ({ page }) => {
  const displayName = uniqueName("E2E手機");
  const content = `這是 ${displayName} 的測試回饋內容。`;

  await openAdminReviews(page);
  await createReview(page, { productName: IN_STOCK.name, displayName, rating: 5, content });

  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/products/${IN_STOCK.id}`);
    await expect(page.getByRole("heading", { name: "顧客回饋" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(content)).toBeVisible();

    // 不可以產生水平捲動
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  } finally {
    await cleanUpReviews(page, displayName);
  }
});


test("捲到底會自動載入下一批，不需要按任何按鈕", async ({ page }) => {
  const prefix = uniqueName("E2E分批");
  const names: string[] = [];

  await openAdminReviews(page);
  // 一批 8 則，建 10 則才看得到第二批
  for (let index = 0; index < 10; index += 1) {
    const displayName = `${prefix}-${index}`;
    names.push(displayName);
    await createReview(page, {
      productName: IN_STOCK.name,
      displayName,
      rating: 5,
      content: `${displayName} 的測試回饋內容。`,
    });
  }

  try {
    await page.goto(`/products/${IN_STOCK.id}`);
    await expect(page.getByRole("heading", { name: "顧客回饋" })).toBeVisible({ timeout: 30_000 });

    // 沒有「查看全部」這種按鈕
    await expect(page.getByRole("button", { name: /查看全部/ })).toHaveCount(0);

    // 一開始只載第一批
    const firstPage = await page.locator("article").count();
    expect(firstPage).toBe(8);

    // 捲到底之後應該自己載更多
    const scroller = page.locator('[aria-label="顧客回饋"]');
    await scroller.evaluate((element) => element.scrollTo({ left: element.scrollWidth }));
    await expect.poll(() => page.locator("article").count(), { timeout: 30_000 }).toBeGreaterThan(firstPage);

    // 全部載完後仍然只有一排，而且不會讓整頁橫向捲動
    await loadAllReviews(page);
    const rows = await page.evaluate(
      () => new Set(Array.from(document.querySelectorAll("article")).map((el) => Math.round(el.getBoundingClientRect().top))).size
    );
    expect(rows).toBe(1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  } finally {
    for (const displayName of names) await cleanUpReviews(page, displayName);
  }
});

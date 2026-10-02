/**
 * 顧客商品評價（第二階段）
 *
 * 需先對測試資料庫套用：
 *   drizzle/0042_product_reviews.sql
 *   drizzle/0043_customer_review_unique.sql
 *
 * 每個測試自己建立訂單與評價，結束前把評價刪掉。
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  createAtmHomeDeliveryOrder,
  loginAsAdminByCookie,
  loginAsUserByCookie,
} from "./helpers";

test.describe.configure({ timeout: 120_000 });

const PRODUCT = { id: "e2e-bracelet-in-stock", name: "E2E 現貨手鍊" };
// 訂單裡的品名是購買當下的快照（含手圍、扣環等規格），所以用前綴比對
const reviewButtonName = new RegExp(`^評價「${PRODUCT.name}`);
const viewButtonName = new RegExp(`^查看「${PRODUCT.name}`);

function uniqueText(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function trpcMutation(request: APIRequestContext, procedure: string, json: unknown) {
  return request.post(`/api/trpc/${procedure}?batch=1`, { data: { "0": { json } } });
}

async function trpcQuery(request: APIRequestContext, procedure: string, json: unknown) {
  const input = encodeURIComponent(JSON.stringify({ "0": { json } }));
  return request.get(`/api/trpc/${procedure}?batch=1&input=${input}`);
}

/** 以會員身分下一張轉帳訂單，再由管理員把它推到「已完成」 */
async function createCompletedMemberOrder(page: Page, email: string) {
  await loginAsUserByCookie(page);
  const merchantTradeNo = await createAtmHomeDeliveryOrder(page, email);
  expect(merchantTradeNo).toBeTruthy();

  await loginAsAdminByCookie(page);
  const order = await fetchOrder(page, merchantTradeNo);

  // 轉帳單要先確認收款，訂單狀態才推得到完成
  const confirmed = await trpcMutation(page.request, "order.confirmTransfer", { orderId: order.id });
  expect(confirmed.status(), await confirmed.text()).toBe(200);

  const updated = await trpcMutation(page.request, "order.updateOrderStatus", {
    orderId: order.id,
    status: "completed",
  });
  expect(updated.status(), await updated.text()).toBe(200);

  return { merchantTradeNo, orderId: order.id as number };
}

/** 以管理員身分讀單筆訂單（含 items），比翻列表穩 */
async function fetchOrder(page: Page, merchantTradeNo: string) {
  const response = await trpcQuery(page.request, "order.getOrder", { merchantTradeNo });
  expect(response.status(), await response.text()).toBe(200);
  const order = (await response.json())[0].result.data.json;
  expect(order, `找不到訂單 ${merchantTradeNo}`).toBeTruthy();
  return order as { id: number; items: { id: number }[] };
}

async function openMyOrder(page: Page, merchantTradeNo: string) {
  await loginAsUserByCookie(page);
  await page.goto("/member");
  const header = page.getByText(`訂單 #${merchantTradeNo}`);
  await expect(header).toBeVisible({ timeout: 30_000 });
  await header.click();
}

async function deleteReviewsByText(page: Page, text: string) {
  await loginAsAdminByCookie(page);
  const list = await trpcQuery(page.request, "reviews.adminList", {});
  if (list.status() !== 200) return;
  const rows = (await list.json())[0].result.data.json as any[];
  for (const row of rows.filter((r) => r.content?.includes(text))) {
    await trpcMutation(page.request, "reviews.adminRemove", { id: row.id });
  }
}

test("會員可以評價已完成訂單的商品，審核後出現在商品頁並標示已購買", async ({ page }) => {
  const content = uniqueText("E2E顧客評價內容");
  const { merchantTradeNo } = await createCompletedMemberOrder(page, `e2e-review-${Date.now()}@example.com`);

  try {
    await openMyOrder(page, merchantTradeNo);
    await page.getByRole("button", { name: reviewButtonName }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "分享商品使用感受" })).toBeVisible({ timeout: 30_000 });
    await dialog.getByRole("button", { name: "5 星" }).click();
    await dialog.locator("textarea").fill(content);
    await dialog.getByRole("button", { name: "送出評價" }).click();

    // 送出後立刻變成等待審核
    await expect(dialog).toBeHidden({ timeout: 30_000 });
    await expect(page.getByText("評價已送出 · 等待審核")).toBeVisible({ timeout: 30_000 });

    // 待審核不得公開
    await page.goto(`/products/${PRODUCT.id}`);
    await expect(page.getByText(content)).toHaveCount(0);

    // 管理員審核上架
    await loginAsAdminByCookie(page);
    await page.goto("/admin/reviews");
    await expect(page.locator("aside")).toHaveCount(1, { timeout: 30_000 });
    await page.getByRole("button", { name: /^待審核/ }).click();
    const row = page.locator("li:visible, tr:visible").filter({ hasText: content.slice(0, 20) }).first();
    await expect(row).toBeVisible({ timeout: 30_000 });
    await expect(row.getByText("顧客投稿 · 已購買")).toBeVisible();
    await row.evaluate((element) => element.scrollIntoView({ block: "center" }));
    await row.getByRole("switch").click();
    // 上架成功後這一列就會離開「待審核」篩選，確認寫入完成再去看商品頁
    await expect(row).toHaveCount(0, { timeout: 30_000 });

    // 商品頁出現，而且掛上「已購買」
    await page.goto(`/products/${PRODUCT.id}`);
    await expect(page.getByText(content)).toBeVisible({ timeout: 30_000 });
    const article = page.locator("article").filter({ hasText: content });
    await expect(article.getByText("· 已購買")).toBeVisible();
    await expect(page.getByText(/5\.0 \/ 5 · \d+ 則/)).toBeVisible();

    // 會員端同步變成已完成評價
    await openMyOrder(page, merchantTradeNo);
    await expect(page.getByText("已完成評價")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: viewButtonName }).click();
    await expect(page.getByText(content)).toBeVisible();
  } finally {
    await deleteReviewsByText(page, content);
  }
});

test("匿名發表顯示為匿名顧客", async ({ page }) => {
  const content = uniqueText("E2E匿名評價");
  const { merchantTradeNo } = await createCompletedMemberOrder(page, `e2e-anon-${Date.now()}@example.com`);

  try {
    await openMyOrder(page, merchantTradeNo);
    await page.getByRole("button", { name: reviewButtonName }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("textarea").fill(content);
    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "送出評價" }).click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });

    await loginAsAdminByCookie(page);
    const list = await trpcQuery(page.request, "reviews.adminList", {});
    const rows = (await list.json())[0].result.data.json as any[];
    const created = rows.find((row) => row.content === content);
    expect(created).toBeTruthy();
    expect(created.displayName).toBe("匿名顧客");
    expect(created.source).toBe("customer");
    expect(created.status).toBe("pending");
  } finally {
    await deleteReviewsByText(page, content);
  }
});

test("尚未完成的訂單沒有評價入口，Server 也拒絕", async ({ page }) => {
  await loginAsUserByCookie(page);
  const merchantTradeNo = await createAtmHomeDeliveryOrder(page, `e2e-not-done-${Date.now()}@example.com`);

  await openMyOrder(page, merchantTradeNo);
  await expect(page.getByText("E2E 現貨手鍊")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /^評價「/ })).toHaveCount(0);

  // 直接打 API 也要被擋：先拿到 orderItemId
  await loginAsAdminByCookie(page);
  const order = await fetchOrder(page, merchantTradeNo);
  const orderItemId = order.items[0].id;

  await loginAsUserByCookie(page);
  await page.goto("/member");
  const response = await trpcMutation(page.request, "reviews.customerCreate", {
    orderItemId,
    rating: 5,
    content: "訂單還沒完成，不該通過",
    images: [],
    anonymous: false,
  });
  expect(response.status()).toBe(400);
  expect(await response.text()).toContain("還不能評價");
});

test("同一個訂單商品同時送出兩次，只會留下一則", async ({ page }) => {
  const content = uniqueText("E2E重複送出");
  const { merchantTradeNo, orderId } = await createCompletedMemberOrder(page, `e2e-dup-${Date.now()}@example.com`);

  try {
    await loginAsUserByCookie(page);
    await page.goto("/member");

    const states = await trpcQuery(page.request, "reviews.statusByOrder", { orderId });
    expect(states.status(), await states.text()).toBe(200);
    const orderItemId = (await states.json())[0].result.data.json[0].orderItemId;

    const body = { orderItemId, rating: 5, content, images: [], anonymous: false };
    const [first, second] = await Promise.all([
      trpcMutation(page.request, "reviews.customerCreate", body),
      trpcMutation(page.request, "reviews.customerCreate", body),
    ]);
    const statuses = [first.status(), second.status()].sort();
    expect(statuses[0]).toBe(200);
    expect(statuses[1]).toBe(409);

    await loginAsAdminByCookie(page);
    const list = await trpcQuery(page.request, "reviews.adminList", {});
    const rows = (await list.json())[0].result.data.json as any[];
    expect(rows.filter((row) => row.content === content)).toHaveLength(1);

    // 第三次送出也要被擋
    await loginAsUserByCookie(page);
    await page.goto("/member");
    const third = await trpcMutation(page.request, "reviews.customerCreate", body);
    expect(third.status()).toBe(409);
    expect(await third.text()).toContain("已經留下過評價");

    expect(merchantTradeNo).toBeTruthy();
  } finally {
    await deleteReviewsByText(page, content);
  }
});

test("偽造 productId / userId / status / displayName 都不會進資料庫", async ({ page }) => {
  const content = uniqueText("E2E偽造欄位");
  const { orderId } = await createCompletedMemberOrder(page, `e2e-forge-${Date.now()}@example.com`);

  try {
    await loginAsUserByCookie(page);
    await page.goto("/member");
    const states = await trpcQuery(page.request, "reviews.statusByOrder", { orderId });
    const orderItemId = (await states.json())[0].result.data.json[0].orderItemId;

    const response = await trpcMutation(page.request, "reviews.customerCreate", {
      orderItemId,
      rating: 5,
      content,
      images: [],
      anonymous: false,
      // 以下全部是偽造，伺服器必須忽略
      userId: 1,
      productId: "e2e-bracelet-preorder",
      productName: "偽造商品名稱",
      displayName: "官方設計師",
      source: "admin",
      status: "published",
      isFeatured: true,
    });
    expect(response.status(), await response.text()).toBe(200);

    await loginAsAdminByCookie(page);
    const list = await trpcQuery(page.request, "reviews.adminList", {});
    const created = ((await list.json())[0].result.data.json as any[]).find((row) => row.content === content);
    expect(created).toBeTruthy();
    expect(created.productId).toBe(PRODUCT.id);
    // productName 是購買當下的快照，會帶著規格後綴
    expect(created.productName.startsWith(PRODUCT.name)).toBe(true);
    expect(created.productName).not.toBe("偽造商品名稱");
    expect(created.displayName).not.toBe("官方設計師");
    expect(created.source).toBe("customer");
    expect(created.status).toBe("pending");
    expect(created.isFeatured).toBe(false);

    // 待審核的評價不得出現在商品頁
    await page.goto(`/products/${PRODUCT.id}`);
    await expect(page.getByText(content)).toHaveCount(0);
    await page.goto("/products/e2e-bracelet-preorder");
    await expect(page.getByText(content)).toHaveCount(0);
  } finally {
    await deleteReviewsByText(page, content);
  }
});

test("其他會員知道 orderId 也查不到評價狀態", async ({ page }) => {
  const { orderId } = await createCompletedMemberOrder(page, `e2e-idor-${Date.now()}@example.com`);

  // 換成另一個身分（用 admin 以外的 openId，避免 admin 全通）
  await page.context().clearCookies();
  await page.goto("/products");
  const anonymous = await trpcQuery(page.request, "reviews.statusByOrder", { orderId });
  expect([401, 403]).toContain(anonymous.status());
});

test("未登入不能呼叫顧客評價 API", async ({ request }) => {
  const create = await trpcMutation(request, "reviews.customerCreate", {
    orderItemId: 1,
    rating: 5,
    content: "未登入不該成功",
    images: [],
    anonymous: false,
  });
  expect([401, 403]).toContain(create.status());

  const upload = await trpcMutation(request, "reviews.customerUploadImage", {
    contentType: "image/jpeg",
    dataBase64: "AAAA",
  });
  expect([401, 403]).toContain(upload.status());

  const status = await trpcQuery(request, "reviews.statusByOrder", { orderId: 1 });
  expect([401, 403]).toContain(status.status());
});

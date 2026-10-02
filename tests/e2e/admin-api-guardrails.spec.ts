import { expect, test, type APIRequestContext, type Browser } from "@playwright/test";
import { loginAsUserByCookie } from "./helpers";

async function callTrpc(
  request: APIRequestContext,
  procedure: string,
  json: unknown,
  type: "query" | "mutation"
) {
  if (type === "query") {
    const input = encodeURIComponent(JSON.stringify({ "0": { json } }));
    return request.get(`/api/trpc/${procedure}?batch=1&input=${input}`);
  }
  return request.post(`/api/trpc/${procedure}?batch=1`, {
    data: { "0": { json } },
  });
}

async function expectAdminProcedureForbidden(
  request: APIRequestContext,
  procedure: string,
  json: unknown = {},
  type: "query" | "mutation" = "query"
) {
  const response = await callTrpc(request, procedure, json, type);
  expect([401, 403]).toContain(response.status());
  const text = await response.text();
  expect(text).toMatch(/未登入|僅限管理員|FORBIDDEN|UNAUTHORIZED/i);
}

async function regularMemberRequest(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  // 這支在測「一般會員不能呼叫後台 API」，重點是角色不是登入流程
  await loginAsUserByCookie(page);
  await page.goto("/products");
  return { context, request: context.request };
}

test("unauthenticated requests cannot call admin tRPC procedures", async ({ request }) => {
  await expectAdminProcedureForbidden(request, "order.listOrders", { status: "all", limit: 10, offset: 0 });
  await expectAdminProcedureForbidden(request, "order.getStats");
  await expectAdminProcedureForbidden(request, "product.adminList");
  await expectAdminProcedureForbidden(request, "chatbot.listLogs", { page: 1, pageSize: 10 });
  await expectAdminProcedureForbidden(request, "reviews.adminList", {});
  await expectAdminProcedureForbidden(request, "reviews.adminGet", { id: 1 });
  await expectAdminProcedureForbidden(request, "reviews.adminCreate", {
    productId: "e2e-bracelet-in-stock",
    displayName: "E2E 守門",
    rating: 5,
    content: "不應該被建立",
    images: [],
    status: "published",
    isFeatured: false,
    sortOrder: 0,
  }, "mutation");
  await expectAdminProcedureForbidden(request, "reviews.adminUpdate", {
    id: 1,
    productId: "e2e-bracelet-in-stock",
    displayName: "E2E 守門",
    rating: 5,
    content: "不應該被修改",
    images: [],
    status: "published",
    isFeatured: false,
    sortOrder: 0,
  }, "mutation");
  await expectAdminProcedureForbidden(request, "reviews.adminSetStatus", { id: 1, status: "hidden" }, "mutation");
  await expectAdminProcedureForbidden(request, "reviews.adminRemove", { id: 1 }, "mutation");
  await expectAdminProcedureForbidden(request, "reviews.uploadImage", {
    contentType: "image/jpeg",
    dataBase64: "AAAA",
  }, "mutation");
  await expectAdminProcedureForbidden(request, "inventory.setInventory", {
    productId: "e2e-bracelet-in-stock",
    productName: "E2E 現貨手鍊",
    stock: 5,
    allowPreorder: false,
  }, "mutation");
});

test("regular member sessions cannot call admin tRPC procedures", async ({ browser }) => {
  const { context, request } = await regularMemberRequest(browser);
  try {
    await expectAdminProcedureForbidden(request, "order.listOrders", { status: "all", limit: 10, offset: 0 });
    await expectAdminProcedureForbidden(request, "order.getStats");
    await expectAdminProcedureForbidden(request, "product.adminList");
    await expectAdminProcedureForbidden(request, "chatbot.listLogs", { page: 1, pageSize: 10 });
    await expectAdminProcedureForbidden(request, "reviews.adminList", {});
    await expectAdminProcedureForbidden(request, "reviews.adminGet", { id: 1 });
    await expectAdminProcedureForbidden(request, "reviews.adminCreate", {
      productId: "e2e-bracelet-in-stock",
      displayName: "E2E 守門",
      rating: 5,
      content: "不應該被建立",
      images: [],
      status: "published",
      isFeatured: false,
      sortOrder: 0,
    }, "mutation");
    await expectAdminProcedureForbidden(request, "reviews.adminUpdate", {
      id: 1,
      productId: "e2e-bracelet-in-stock",
      displayName: "E2E 守門",
      rating: 5,
      content: "不應該被修改",
      images: [],
      status: "published",
      isFeatured: false,
      sortOrder: 0,
    }, "mutation");
    await expectAdminProcedureForbidden(request, "reviews.adminSetStatus", { id: 1, status: "hidden" }, "mutation");
    await expectAdminProcedureForbidden(request, "reviews.adminRemove", { id: 1 }, "mutation");
    await expectAdminProcedureForbidden(request, "reviews.uploadImage", {
      contentType: "image/jpeg",
      dataBase64: "AAAA",
    }, "mutation");
    await expectAdminProcedureForbidden(request, "inventory.setInventory", {
      productId: "e2e-bracelet-in-stock",
      productName: "E2E 現貨手鍊",
      stock: 5,
      allowPreorder: false,
    }, "mutation");
  } finally {
    await context.close();
  }
});

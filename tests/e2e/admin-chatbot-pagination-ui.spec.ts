import { expect, test } from "@playwright/test";
import { loginAsAdminByCookie } from "./helpers";

function trpcSuccess(data: unknown) {
  return [{ result: { data: { json: data } } }];
}

test("admin chatbot log UI paginates and exposes recommendation metadata", async ({ page }) => {
  await loginAsAdminByCookie(page);

  await page.route("**/api/trpc/chatbot.listLogs**", async (route) => {
    const secondPage = decodeURIComponent(route.request().url()).includes('"offset":20');
    const item = secondPage
      ? {
          id: 21,
          createdAt: "2026-05-01T08:00:00.000Z",
          customerName: "第二頁會員",
          customerEmail: "page-two@example.com",
          customerQuestion: "第二頁的推薦問題",
          botReply: "第二頁回覆",
          relatedProducts: [{ name: "E2E 現貨手鍊" }],
          retrievedQuestions: ["測試知識庫問題"],
          retrievedKnowledge: [{ id: "faq-e2e", question: "測試知識庫問題", category: "商品", score: 0.82 }],
          answerStatus: "complete",
          answerStatusReason: "有較高分知識命中，且未使用備援或人工轉介",
          topKnowledgeScore: 0.82,
          usedFallback: false,
          pagePath: "/products/e2e-bracelet-in-stock",
        }
      : {
          id: 1,
          createdAt: "2026-05-26T08:00:00.000Z",
          customerName: "第一頁會員",
          customerEmail: "page-one@example.com",
          customerQuestion: "第一頁的推薦問題",
          botReply: "第一頁回覆",
          relatedProducts: [],
          retrievedQuestions: [],
          retrievedKnowledge: [],
          answerStatus: "low_confidence",
          answerStatusReason: "最高知識命中分數低於 0.65",
          topKnowledgeScore: 0.61,
          usedFallback: false,
          pagePath: "/",
        };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(trpcSuccess({ items: [item], total: 21 })),
    });
  });

  await page.goto("/admin/chatbot");
  await expect(page.locator("body")).toContainText("目前顯示第 1 / 2 頁，共 21 筆");
  await expect(page.locator("body")).toContainText("第一頁的推薦問題");
  await expect(page.locator("body")).toContainText("低信心");
  await expect(page.locator("body")).toContainText("最高命中 61%");
  await page.getByRole("button", { name: "下一頁" }).click();
  await expect(page.locator("body")).toContainText("目前顯示第 2 / 2 頁，共 21 筆");

  await page.getByRole("button", { name: /第二頁的推薦問題/ }).click();
  await expect(page.locator("body")).toContainText("來源頁面：/products/e2e-bracelet-in-stock");
  await expect(page.locator("body")).toContainText("E2E 現貨手鍊");
  await expect(page.locator("body")).toContainText("測試知識庫問題");
  await expect(page.locator("body")).toContainText("測試知識庫問題（82%）");
  await expect(page.locator("body")).toContainText("有較高分知識命中，且未使用備援或人工轉介");

  const filteredRequest = page.waitForRequest((request) =>
    request.url().includes("chatbot.listLogs") && decodeURIComponent(request.url()).includes('"answerStatus":"low_confidence"')
  );
  await page.getByLabel("回答狀態").selectOption("low_confidence");
  await filteredRequest;
  await expect(page.locator("body")).toContainText("第一頁的推薦問題");
});

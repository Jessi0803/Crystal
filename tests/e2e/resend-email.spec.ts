import { expect, test } from "@playwright/test";
import { Resend } from "resend";

const externalEmailTest = process.env.RUN_RESEND_E2E === "true" ? test : test.skip;

async function findSentEmailId(resend: Resend, email: string, subject: string, excludedId?: string) {
  let sentEmailId: string | undefined;
  await expect
    .poll(
      async () => {
        const { data, error } = await resend.emails.list({ limit: 20 });
        if (error) {
          if (error.message.includes("Too many requests")) {
            return undefined;
          }
          throw new Error(`Unable to list Resend sent emails: ${error.message}`);
        }
        sentEmailId = data?.data.find(
          (message) =>
            message.id !== excludedId &&
            message.to.includes(email) &&
            message.subject.includes(subject)
        )?.id;
        return sentEmailId;
      },
      { timeout: 30_000, intervals: [1_000, 2_000, 3_000] }
    )
    .toBeTruthy();
  return sentEmailId!;
}

async function getSentEmail(resend: Resend, emailId: string) {
  let sentEmail: Awaited<ReturnType<Resend["emails"]["get"]>>["data"];
  await expect
    .poll(
      async () => {
        const { data, error } = await resend.emails.get(emailId);
        if (error) {
          if (error.message.includes("Too many requests")) {
            return false;
          }
          throw new Error(`Unable to retrieve Resend sent email: ${error.message}`);
        }
        sentEmail = data;
        return true;
      },
      { timeout: 30_000, intervals: [750, 1_000, 2_000] }
    )
    .toBe(true);
  return sentEmail!;
}

function extractAppLink(html: string | null | undefined, path: string) {
  const url = html?.match(new RegExp(`https?://[^"'\\s<>]+${path}[^"'\\s<>]+`))?.[0];
  expect(url, `Expected email HTML to contain a ${path} link`).toBeTruthy();
  return url!;
}

externalEmailTest("registration sends a verification email through Resend test delivery", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Send the external Resend verification once per run.");
  test.slow();

  const apiKey = process.env.RESEND_API_KEY;
  expect(apiKey, "RESEND_API_KEY must be loaded only when RUN_RESEND_E2E=true").toBeTruthy();

  const runLabel = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const email = `delivered+register-${runLabel}@resend.dev`;

  await page.goto("/register");
  await page.locator('input[placeholder="請輸入您的姓名"]').fill("E2E Resend Member");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[placeholder="至少 8 個字元"]').fill("Test123456");
  await page.locator('input[placeholder="再次輸入密碼"]').fill("Test123456");
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/member/);
  await expect(page.locator("body")).toContainText("請驗證您的 Email");
  await expect(page.locator("body")).toContainText(email);

  const resend = new Resend(apiKey);
  const sentEmailId = await findSentEmailId(resend, email, "請驗證您的 Email");
  const sentEmail = await getSentEmail(resend, sentEmailId);
  expect(sentEmail?.to).toContain(email);
  expect(sentEmail?.subject).toContain("請驗證您的 Email");
  expect(sentEmail?.html).toContain("/verify-email?token=");

  await page.goto(extractAppLink(sentEmail?.html, "/verify-email\\?token="));
  await expect(page.locator("body")).toContainText("Email 驗證成功");
  await page.goto("/member");
  await expect(page.locator("body")).not.toContainText("請驗證您的 Email");
});

externalEmailTest("forgot password sends a reset link through Resend test delivery", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Send the external Resend reset email once per run.");
  test.slow();

  const apiKey = process.env.RESEND_API_KEY;
  expect(apiKey, "RESEND_API_KEY must be loaded only when RUN_RESEND_E2E=true").toBeTruthy();

  const runLabel = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const email = `delivered+password-reset-${runLabel}@resend.dev`;

  await page.goto("/register");
  await page.locator('input[placeholder="請輸入您的姓名"]').fill("E2E Password Reset Member");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[placeholder="至少 8 個字元"]').fill("Test123456");
  await page.locator('input[placeholder="再次輸入密碼"]').fill("Test123456");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/member/);

  await page.goto("/forgot-password");
  await page.locator('input[type="email"]').fill(email);
  await page.getByRole("button", { name: "發送重設連結" }).click();
  await expect(page.locator("body")).toContainText("重設連結已發送");

  const resend = new Resend(apiKey);
  const sentEmailId = await findSentEmailId(resend, email, "密碼重設連結");
  const sentEmail = await getSentEmail(resend, sentEmailId);
  expect(sentEmail?.to).toContain(email);
  expect(sentEmail?.subject).toContain("密碼重設連結");
  expect(sentEmail?.html).toContain("/reset-password?token=");

  const resetLink = extractAppLink(sentEmail?.html, "/reset-password\\?token=");
  await page.goto(resetLink);
  await page.locator('input[placeholder="至少 8 個字元"]').fill("ResetPassword123");
  await page.locator('input[placeholder="再次輸入新密碼"]').fill("ResetPassword123");
  await page.getByRole("button", { name: "確認重設密碼" }).click();
  await expect(page.locator("body")).toContainText("密碼已重設");

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("Test123456");
  await page.locator('button[type="submit"]').click();
  await expect(page.locator("body")).toContainText("Email 或密碼錯誤");

  await page.locator('input[type="password"]').fill("ResetPassword123");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/products/);

  await page.goto(resetLink);
  await page.locator('input[placeholder="至少 8 個字元"]').fill("AnotherPassword123");
  await page.locator('input[placeholder="再次輸入新密碼"]').fill("AnotherPassword123");
  await page.getByRole("button", { name: "確認重設密碼" }).click();
  await expect(page.locator("body")).toContainText("重設連結已失效或不存在");
});

externalEmailTest("member can resend and use a replacement verification email", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Send external Resend verification emails once per run.");
  test.slow();

  const apiKey = process.env.RESEND_API_KEY;
  expect(apiKey, "RESEND_API_KEY must be loaded only when RUN_RESEND_E2E=true").toBeTruthy();

  const runLabel = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const email = `delivered+resend-${runLabel}@resend.dev`;

  await page.goto("/register");
  await page.locator('input[placeholder="請輸入您的姓名"]').fill("E2E Resend Verification Member");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[placeholder="至少 8 個字元"]').fill("Test123456");
  await page.locator('input[placeholder="再次輸入密碼"]').fill("Test123456");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/member/);

  const resend = new Resend(apiKey);
  const firstEmailId = await findSentEmailId(resend, email, "請驗證您的 Email");

  await page.getByRole("button", { name: "重新發送驗證信" }).click();
  await expect(page.locator("body")).toContainText("驗證信已重新發送");
  const replacementEmailId = await findSentEmailId(resend, email, "請驗證您的 Email", firstEmailId);
  const replacementEmail = await getSentEmail(resend, replacementEmailId);

  await page.goto(extractAppLink(replacementEmail?.html, "/verify-email\\?token="));
  await expect(page.locator("body")).toContainText("Email 驗證成功");
  await page.goto("/member");
  await expect(page.locator("body")).not.toContainText("重新發送驗證信");
});

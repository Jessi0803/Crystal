import { expect, test } from "@playwright/test";
import { Resend } from "resend";

const externalEmailTest = process.env.RUN_RESEND_E2E === "true" ? test : test.skip;

async function findSentEmailId(resend: Resend, email: string, subject: string) {
  let sentEmailId: string | undefined;
  await expect
    .poll(
      async () => {
        const { data, error } = await resend.emails.list({ limit: 20 });
        if (error) {
          throw new Error(`Unable to list Resend sent emails: ${error.message}`);
        }
        sentEmailId = data?.data.find(
          (message) => message.to.includes(email) && message.subject.includes(subject)
        )?.id;
        return sentEmailId;
      },
      { timeout: 30_000, intervals: [1_000, 2_000, 3_000] }
    )
    .toBeTruthy();
  return sentEmailId!;
}

externalEmailTest("registration sends a verification email through Resend test delivery", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Send the external Resend verification once per run.");

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

  const { data: sentEmail, error } = await resend.emails.get(sentEmailId);
  if (error) {
    throw new Error(`Unable to retrieve Resend sent email: ${error.message}`);
  }
  expect(sentEmail?.to).toContain(email);
  expect(sentEmail?.subject).toContain("請驗證您的 Email");
  expect(sentEmail?.html).toContain("/verify-email?token=");
});

externalEmailTest("forgot password sends a reset link through Resend test delivery", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Send the external Resend reset email once per run.");

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
  const { data: sentEmail, error } = await resend.emails.get(sentEmailId);
  if (error) {
    throw new Error(`Unable to retrieve Resend sent email: ${error.message}`);
  }
  expect(sentEmail?.to).toContain(email);
  expect(sentEmail?.subject).toContain("密碼重設連結");
  expect(sentEmail?.html).toContain("/reset-password?token=");
});

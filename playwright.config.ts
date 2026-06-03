import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";

const PORT = Number(process.env.E2E_PORT || 3100);
const baseURL = `http://127.0.0.1:${PORT}`;
const testEnv = dotenv.parse(readFileSync(".env.test.local"));
const testDatabaseUrl = testEnv.DATABASE_URL;
const allowResendDelivery =
  process.env.RUN_RESEND_E2E === "true" && process.env.E2E_ALLOW_RESEND_DELIVERY === "true";
const allowRealChatbot =
  process.env.RUN_CHATBOT_REAL_E2E === "true" && process.env.E2E_ALLOW_REAL_CHATBOT === "true";

if (!testDatabaseUrl) {
  throw new Error(".env.test.local must define DATABASE_URL for Playwright");
}

if (allowResendDelivery) {
  dotenv.config({ path: ".env.resend.local", override: false, quiet: true });
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY must be configured in .env.resend.local for Resend E2E");
  }
}

if (allowRealChatbot) {
  dotenv.config({ path: ".env", override: false, quiet: true });
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY must be configured in .env for real Chatbot E2E");
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "pnpm exec tsx server/_core/index.ts",
    env: {
      PORT: String(PORT),
      NODE_ENV: "development",
      DOTENV_CONFIG_PATH: ".env.test.local",
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "e2e-local-jwt-secret-min-32-chars",
      PAYPAL_SANDBOX: "1",
      ECPAY_SANDBOX: "true",
      ECPAY_MERCHANT_ID: "3002607",
      ECPAY_HASH_KEY: "pwFHCqoQZGmho4w6",
      ECPAY_HASH_IV: "EkRm7iFT261dpevs",
      ECPAY_LOGISTICS_SANDBOX: "true",
      ECPAY_LOGISTICS_MERCHANT_ID: "2000933",
      ECPAY_LOGISTICS_HASH_KEY: "XBERn1YOvpM9nfZc",
      ECPAY_LOGISTICS_HASH_IV: "h1ONHk4P4yqbl5LK",
      SENDER_NAME: "Tester",
      SENDER_PHONE: "0912345678",
      SENDER_ZIPCODE: "100",
      SENDER_ADDRESS: "TestAddress",
      RESEND_API_KEY: allowResendDelivery ? process.env.RESEND_API_KEY ?? "" : "",
      GEMINI_API_KEY: allowRealChatbot ? process.env.GEMINI_API_KEY ?? "" : "",
      E2E_STORAGE_STUB: "true",
      VITE_ANALYTICS_ENDPOINT: "__e2e_analytics",
      VITE_ANALYTICS_WEBSITE_ID: "e2e",
    },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
});

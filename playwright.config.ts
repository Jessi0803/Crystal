import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT || 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

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
    command: `PORT=${PORT} NODE_ENV=development DOTENV_CONFIG_PATH=.env.test.local JWT_SECRET=e2e-local-jwt-secret-min-32-chars ECPAY_SANDBOX=true ECPAY_MERCHANT_ID=3002607 ECPAY_HASH_KEY=pwFHCqoQZGmho4w6 ECPAY_HASH_IV=EkRm7iFT261dpevs ECPAY_LOGISTICS_SANDBOX=true ECPAY_LOGISTICS_MERCHANT_ID=2000933 ECPAY_LOGISTICS_HASH_KEY=XBERn1YOvpM9nfZc ECPAY_LOGISTICS_HASH_IV=h1ONHk4P4yqbl5LK SENDER_NAME=Tester SENDER_PHONE=0912345678 SENDER_ZIPCODE=100 SENDER_ADDRESS=TestAddress VITE_ANALYTICS_ENDPOINT=__e2e_analytics VITE_ANALYTICS_WEBSITE_ID=e2e pnpm exec tsx server/_core/index.ts`,
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

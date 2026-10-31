import { defineConfig } from "@playwright/test";
import base from "./playwright.promotions.config";
export default defineConfig({
  ...base,
  testMatch: "balance-payment.spec.ts",
  grep: /failed credit balance payment keeps the original link|free-shipping zero balance confirms delivery/,
  outputDir: "test-results/promotion-legacy",
  reporter: [
    ["list"],
    [
      "html",
      { outputFolder: "playwright-report/promotion-legacy", open: "never" },
    ],
  ],
});

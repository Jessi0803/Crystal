import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
const baseServer = base.webServer as {
  command: string;
  env: Record<string, string>;
  timeout?: number;
};
export default defineConfig({
  ...base,
  testMatch: "promotions-acceptance.spec.ts",
  globalSetup: "./tests/e2e/promotion-global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  use: { ...base.use, baseURL: "http://127.0.0.1:3200" },
  projects: [{ name: "chromium", use: base.projects?.[0].use }],
  webServer: {
    ...baseServer,
    command: "node_modules/.bin/tsx server/_core/index.ts",
    env: {
      ...baseServer.env,
      PORT: "3200",
      SITE_URL: "http://127.0.0.1:3200",
      RESEND_API_KEY: "",
      LINE_CHANNEL_ACCESS_TOKEN: "",
      LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: "",
      BLOB_READ_WRITE_TOKEN: "",
      E2E_STORAGE_STUB: "true",
    },
    url: "http://127.0.0.1:3200",
    reuseExistingServer: false,
  },
});

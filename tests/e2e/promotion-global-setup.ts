import {
  assertPlaywrightServiceSafety,
  assertTestDatabaseTarget,
  loadTestEnv,
} from "../../scripts/test-db-helpers.mjs";
export default async function setup() {
  const config = loadTestEnv();
  assertTestDatabaseTarget(config, { write: true });
  assertPlaywrightServiceSafety();
  console.log(
    "活動最小驗收：僅 crystal-test、sandbox、獨立資料；不執行全套 seed/reset。"
  );
}

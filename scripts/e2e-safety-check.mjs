import {
  assertPlaywrightServiceSafety,
  assertTestDatabaseTarget,
  loadTestEnv,
} from "./test-db-helpers.mjs";

const config = loadTestEnv();
assertTestDatabaseTarget(config, { write: true });
assertPlaywrightServiceSafety();

const resendMode = process.env.RUN_RESEND_E2E === "true" ? "explicit test delivery enabled" : "disabled";
console.log(
  `E2E safety check OK: confirmed TiDB test target "${config.database}", payment/logistics sandbox required, Resend ${resendMode}.`
);

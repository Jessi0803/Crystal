/**
 * 檢查 Vercel Serverless Functions 能否在 Vercel 的執行環境載入。
 *
 * Vercel 的函式載入器不支援「以 require() 載入只提供 ES Module 的套件」，
 * 本機 Node 22+/24 卻允許，所以這類問題在本機測不出來（例如 sanitize-html
 * 2.17.7 依賴的 htmlparser2 12，曾讓所有 API 在預覽部署回 500）。
 *
 * 做法：照 package.json 的 build 設定打包三支函式，再用
 * `--no-experimental-require-module` 關閉 require(esm) 後載入，模擬 Vercel。
 * 升級伺服器端套件後請執行：pnpm run check:vercel
 */
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const entries = [
  "server/_entry/trpcHandler.ts",
  "server/_entry/ecpayHandler.ts",
  "server/_entry/customFormRemindersCronHandler.ts",
];

// 放在專案內，打包後的外部套件才能從專案的 node_modules 解析
const outDir = path.resolve("node_modules/.cache/check-vercel-bundles");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

let failed = 0;
for (const entry of entries) {
  const outfile = path.join(outDir, `${path.basename(entry, ".ts")}.mjs`);
  await build({
    entryPoints: [entry],
    outfile,
    platform: "node",
    target: "node20",
    packages: "external",
    bundle: true,
    format: "esm",
    logLevel: "error",
  });

  const result = spawnSync(
    process.execPath,
    [
      "--no-experimental-require-module",
      "--input-type=module",
      "-e",
      `await import(${JSON.stringify(pathToFileURL(outfile).href)});`,
    ],
    { encoding: "utf8", env: { ...process.env, NODE_ENV: "production" } }
  );

  if (result.status === 0) {
    console.log(`✓ ${entry}`);
  } else {
    failed += 1;
    const error = (result.stderr || result.stdout).split("\n").find((line) => /Error/.test(line)) ?? result.stderr;
    console.error(`✗ ${entry}\n  ${error.trim()}`);
  }
}

rmSync(outDir, { recursive: true, force: true });

if (failed > 0) {
  console.error(`\n${failed} 支函式無法在 Vercel 的環境載入，部署後 API 會回 500。`);
  process.exit(1);
}
console.log("\n全部函式都能在 Vercel 的環境載入。");

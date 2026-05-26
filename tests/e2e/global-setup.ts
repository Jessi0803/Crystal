import { execFileSync } from "node:child_process";

export default async function globalSetup() {
  execFileSync("pnpm", ["e2e:safety:check"], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
  execFileSync("pnpm", ["db:test:seed"], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

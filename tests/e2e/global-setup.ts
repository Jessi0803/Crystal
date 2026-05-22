import { execFileSync } from "node:child_process";

export default async function globalSetup() {
  execFileSync("pnpm", ["db:test:seed"], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

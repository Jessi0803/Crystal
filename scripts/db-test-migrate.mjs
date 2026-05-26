import { spawn } from "node:child_process";
import { connectToTestDatabase } from "./test-db-helpers.mjs";

const { connection, config } = await connectToTestDatabase({ write: true });
await connection.end();

console.log(`Running migrations against test database: ${config.database}`);

const drizzleKit = process.platform === "win32"
  ? "node_modules\\.bin\\drizzle-kit.cmd"
  : "./node_modules/.bin/drizzle-kit";

const child = spawn(drizzleKit, ["migrate"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "test",
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { op: "update" | "insert" | "delete"; values?: Record<string, unknown> };

const fake = vi.hoisted(() => {
  const state = {
    selectQueue: [] as unknown[][],
    calls: [] as { op: "update" | "insert" | "delete"; values?: Record<string, unknown> }[],
  };
  function selectChain() {
    const rows = state.selectQueue.shift() ?? [];
    const chain: any = {
      from: () => chain,
      where: () => chain,
      leftJoin: () => chain,
      limit: () => Promise.resolve(rows),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(rows).then(resolve),
    };
    return chain;
  }
  const db: any = {
    select: () => selectChain(),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        state.calls.push({ op: "update", values });
        return { where: () => Promise.resolve([{ affectedRows: 1 }]) };
      },
    }),
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        state.calls.push({ op: "insert", values });
        return { onDuplicateKeyUpdate: () => Promise.resolve(undefined) };
      },
    }),
    delete: () => {
      state.calls.push({ op: "delete" });
      return { where: () => Promise.resolve(undefined) };
    },
    execute: () => Promise.resolve(undefined),
  };
  return { state, db };
});

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: () => fake.db }));

import { bindLineToUser, upsertLineUserAsPrimary } from "./db";

const LINE_OPEN_ID = "line:Unew";

function user(overrides: Record<string, unknown>) {
  return {
    id: 1,
    openId: "email:a@x.com",
    name: "會員",
    email: "a@x.com",
    lineEmail: null,
    passwordHash: null,
    emailVerified: true,
    role: "user",
    loginMethod: "email",
    resetToken: null,
    resetTokenExpiresAt: null,
    ...overrides,
  };
}

function updates(): Call[] {
  return fake.state.calls.filter((call) => call.op === "update");
}

beforeEach(() => {
  process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/app";
  fake.state.selectQueue = [];
  fake.state.calls = [];
});

describe("upsertLineUserAsPrimary email matching", () => {
  it("does not take over a member already bound to another LINE account", async () => {
    fake.state.selectQueue = [
      [],
      [user({ id: 7, openId: "line:Uoriginal", passwordHash: "hash" })],
    ];

    await upsertLineUserAsPrimary({ openId: LINE_OPEN_ID, email: "A@x.com", name: "新 LINE" });

    expect(updates()).toHaveLength(0);
    expect(fake.state.calls.some((call) => call.op === "delete")).toBe(false);
    const insert = fake.state.calls.find((call) => call.op === "insert");
    expect(insert?.values).toMatchObject({ openId: LINE_OPEN_ID, lineEmail: "a@x.com" });
    // 不寫入已屬於其他帳號的 Email，避免同一 Email 對應兩個帳號
    expect(insert?.values).not.toHaveProperty("email");
  });

  it("still links a LINE login to an email-only member with the same email", async () => {
    fake.state.selectQueue = [[], [user({ id: 3, passwordHash: "hash" })]];

    await upsertLineUserAsPrimary({ openId: LINE_OPEN_ID, email: "a@x.com" });

    expect(updates()).toHaveLength(1);
    expect(updates()[0].values).toMatchObject({ openId: LINE_OPEN_ID, email: "a@x.com", lineEmail: "a@x.com" });
    expect(fake.state.calls.some((call) => call.op === "insert")).toBe(false);
  });

  it("does not merge or overwrite email when an existing LINE member's email belongs to another LINE", async () => {
    fake.state.selectQueue = [
      [user({ id: 5, openId: LINE_OPEN_ID, email: "old@line.com", loginMethod: "line" })],
      [user({ id: 7, openId: "line:Uoriginal", passwordHash: "hash" })],
    ];

    await upsertLineUserAsPrimary({ openId: LINE_OPEN_ID, email: "a@x.com" });

    expect(fake.state.calls.some((call) => call.op === "delete")).toBe(false);
    expect(updates()).toHaveLength(1);
    expect(updates()[0].values).toMatchObject({ email: "old@line.com", lineEmail: "a@x.com" });
  });

  it("keeps the login email of an email member who bound this LINE and records the LINE email", async () => {
    fake.state.selectQueue = [
      [user({ id: 9, openId: LINE_OPEN_ID, email: "a@x.com", passwordHash: "hash" })],
    ];

    await upsertLineUserAsPrimary({ openId: LINE_OPEN_ID, email: "b@y.com" });

    expect(updates()).toHaveLength(1);
    expect(updates()[0].values).toMatchObject({ lineEmail: "b@y.com" });
    expect(updates()[0].values).not.toHaveProperty("email");
    expect(updates()[0].values).not.toHaveProperty("openId");
  });
});

describe("bindLineToUser", () => {
  it("records the LINE email when binding", async () => {
    fake.state.selectQueue = [[user({ id: 3, passwordHash: "hash" })], []];

    await expect(
      bindLineToUser({ userId: 3, lineOpenId: LINE_OPEN_ID, lineEmail: "b@y.com" })
    ).resolves.toBe("bound");
    expect(updates()[0].values).toMatchObject({ openId: LINE_OPEN_ID, lineEmail: "b@y.com" });
    expect(updates()[0].values).not.toHaveProperty("email");
  });

  it("refuses a LINE account that already belongs to another member", async () => {
    fake.state.selectQueue = [[user({ id: 3, passwordHash: "hash" })], [{ id: 8 }]];

    await expect(bindLineToUser({ userId: 3, lineOpenId: LINE_OPEN_ID })).resolves.toBe("line_in_use");
    expect(updates()).toHaveLength(0);
  });

  it("refuses to replace a different LINE binding", async () => {
    fake.state.selectQueue = [[user({ id: 3, openId: "line:Uother", passwordHash: "hash" })]];

    await expect(bindLineToUser({ userId: 3, lineOpenId: LINE_OPEN_ID })).resolves.toBe("user_has_other_line");
    expect(updates()).toHaveLength(0);
  });
});

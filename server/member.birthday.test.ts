import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./email", () => ({ sendPasswordResetEmail: vi.fn(), sendVerificationEmail: vi.fn() }));
vi.mock("./auditDb", () => ({ recordAuditEventSafely: vi.fn() }));

import { getDb } from "./db";
import { memberRouter } from "./routers/member";
import { adminMembersRouter } from "./routers/adminMembers";
import { validateBirthday } from "@shared/birthday";

const getDbMock = vi.mocked(getDb);
const dialect = new MySqlDialect();

type Update = { values: Record<string, unknown>; where: { sql: string; params: unknown[] } };

function createDb(opts: { affectedRows?: number; selectRows?: unknown[] } = {}) {
  const updates: Update[] = [];
  const db = {
    updates,
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: (condition: Parameters<typeof dialect.sqlToQuery>[0]) => {
          updates.push({ values, where: dialect.sqlToQuery(condition) });
          return Promise.resolve([{ affectedRows: opts.affectedRows ?? 1 }]);
        },
      }),
    }),
    select: () => {
      const chain: any = { from: () => chain, where: () => chain, limit: () => Promise.resolve(opts.selectRows ?? []) };
      return chain;
    },
  };
  getDbMock.mockResolvedValue(db as any);
  return db;
}

function member(overrides: Record<string, unknown> = {}) {
  return memberRouter.createCaller({
    user: {
      id: 12,
      openId: "email:m@example.com",
      name: "會員",
      role: "user",
      birthYear: null,
      birthMonth: null,
      birthDay: null,
      ...overrides,
    } as any,
    req: { headers: {} } as any,
    res: {} as any,
  });
}

function admin(user: { id: number; role: string } | null = { id: 1, role: "admin" }) {
  return adminMembersRouter.createCaller({ user: user as any, req: { headers: {} } as any, res: {} as any });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validateBirthday", () => {
  const now = new Date("2026-09-17T00:00:00+08:00");

  it.each([
    ["Feb 29 without a year", { year: null, month: 2, day: 29 }],
    ["Feb 29 in a leap year", { year: 2000, month: 2, day: 29 }],
    ["a full date", { year: 1990, month: 12, day: 31 }],
  ])("accepts %s", (_label, birthday) => {
    expect(validateBirthday(birthday, now)).toBeNull();
  });

  it.each([
    ["Feb 29 in a common year", { year: 2023, month: 2, day: 29 }],
    ["Feb 30", { year: null, month: 2, day: 30 }],
    ["April 31", { year: null, month: 4, day: 31 }],
    ["month 13", { year: null, month: 13, day: 1 }],
    ["month 0", { year: null, month: 0, day: 1 }],
    ["day 0", { year: null, month: 1, day: 0 }],
    ["a negative day", { year: null, month: 1, day: -1 }],
    ["a year before 1900", { year: 1899, month: 1, day: 1 }],
    ["a future year", { year: 2027, month: 1, day: 1 }],
    ["a future date this year", { year: 2026, month: 12, day: 1 }],
  ])("rejects %s", (_label, birthday) => {
    expect(validateBirthday(birthday, now)).not.toBeNull();
  });
});

describe("member.updateProfile birthday", () => {
  it("saves the birthday once, only while it is still empty", async () => {
    const db = createDb();

    await member().updateProfile({ name: "新名字", birthday: { year: null, month: 5, day: 20 } });

    expect(db.updates).toHaveLength(1);
    expect(db.updates[0].values).toEqual({ name: "新名字", birthYear: null, birthMonth: 5, birthDay: 20 });
    expect(db.updates[0].where.sql).toContain("`users`.`birthMonth` is null");
    expect(db.updates[0].where.params).toEqual([12]);
  });

  it("refuses to change a saved birthday", async () => {
    const db = createDb();

    await expect(
      member({ birthYear: 1990, birthMonth: 5, birthDay: 20 }).updateProfile({
        name: "會員",
        birthday: { year: 1990, month: 6, day: 20 },
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN", message: "生日已填寫，如需修改請聯絡客服" });
    expect(db.updates).toHaveLength(0);
  });

  it("still updates the name when the same birthday is sent again", async () => {
    const db = createDb();

    await member({ birthYear: null, birthMonth: 5, birthDay: 20 }).updateProfile({
      name: "改名",
      birthday: { year: null, month: 5, day: 20 },
    });

    expect(db.updates).toHaveLength(1);
    expect(db.updates[0].values).toEqual({ name: "改名" });
  });

  it("updates only the name when no birthday is sent", async () => {
    const db = createDb();

    await member({ birthMonth: 5, birthDay: 20 }).updateProfile({ name: "改名" });

    expect(db.updates[0].values).toEqual({ name: "改名" });
  });

  it("rejects the save when another request already set the birthday", async () => {
    createDb({ affectedRows: 0 });

    await expect(
      member().updateProfile({ name: "會員", birthday: { year: null, month: 5, day: 20 } })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an invalid birthday", async () => {
    const db = createDb();

    await expect(
      member().updateProfile({ name: "會員", birthday: { year: null, month: 2, day: 30 } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.updates).toHaveLength(0);
  });
});

describe("adminMembers.updateBirthday", () => {
  it("lets an admin correct a member's birthday", async () => {
    const db = createDb({ selectRows: [{ id: 12 }] });

    await admin().updateBirthday({ userId: 12, birthday: { year: 1991, month: 3, day: 8 } });

    expect(db.updates[0].values).toEqual({ birthYear: 1991, birthMonth: 3, birthDay: 8 });
  });

  it("lets an admin clear the birthday so the member can fill it again", async () => {
    const db = createDb({ selectRows: [{ id: 12 }] });

    await admin().updateBirthday({ userId: 12, birthday: null });

    expect(db.updates[0].values).toEqual({ birthYear: null, birthMonth: null, birthDay: null });
  });

  it("rejects an unknown member", async () => {
    const db = createDb({ selectRows: [] });

    await expect(admin().updateBirthday({ userId: 99, birthday: null })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.updates).toHaveLength(0);
  });

  it.each([
    ["a guest", null],
    ["a normal member", { id: 12, role: "user" }],
  ])("rejects %s", async (_label, user) => {
    const db = createDb({ selectRows: [{ id: 12 }] });

    await expect(admin(user).updateBirthday({ userId: 12, birthday: null })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(db.updates).toHaveLength(0);
  });
});

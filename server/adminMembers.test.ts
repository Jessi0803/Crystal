import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { TRPCError } from "@trpc/server";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import { adminMembersRouter, buildMemberSearchWhere } from "./routers/adminMembers";

const getDbMock = vi.mocked(getDb);

function createCaller(user: { id: number; role: string } | null) {
  return adminMembersRouter.createCaller({
    user: user as any,
    req: {} as any,
    res: {} as any,
  });
}

function createQueryChain<T>(result: T) {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    then: (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
    catch: (reject: (reason: unknown) => unknown) => Promise.resolve(result).catch(reject),
    finally: (handler: () => unknown) => Promise.resolve(result).finally(handler),
  };
  return chain;
}

function createMockDb(selectResults: unknown[]) {
  const queue = [...selectResults];
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    select: vi.fn(() => createQueryChain(queue.shift() ?? [])),
  };
}

describe("adminMembers router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin users", async () => {
    const caller = createCaller({ id: 2, role: "user" });

    await expect(caller.list({ limit: 50, offset: 0 })).rejects.toThrow(TRPCError);
    await expect(caller.list({ limit: 50, offset: 0 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("lists members with purchase summary", async () => {
    const db = createMockDb([
      [{ count: 1 }],
      [
        {
          id: 7,
          name: "羅意涵",
          email: "buyer@example.com",
          loginMethod: "email",
          role: "user",
          createdAt: new Date("2026-06-01T00:00:00Z"),
          lastSignedIn: new Date("2026-06-02T00:00:00Z"),
          vipTier: "vip",
          vipNote: "偏好銀色飾品",
          orderCount: 2,
          totalSpent: 3600,
          latestOrderAt: new Date("2026-06-02T00:00:00Z"),
        },
      ],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const caller = createCaller({ id: 1, role: "admin" });
    const result = await caller.list({ search: "羅意涵", limit: 50, offset: 0 });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 7,
      name: "羅意涵",
      vipTier: "vip",
      orderCount: 2,
      totalSpent: 3600,
    });
    expect(db.execute).toHaveBeenCalledTimes(2);
    expect(db.select).toHaveBeenCalledTimes(2);
  });

  it("returns member detail with order history", async () => {
    const db = createMockDb([
      [
        {
          id: 7,
          name: "羅意涵",
          email: "buyer@example.com",
          loginMethod: "email",
          openId: "line:Ubuyer",
          lineEmail: "buyer-line@example.com",
          lineDisplayName: "買家 LINE",
          linePictureUrl: "https://profile.line-scdn.net/buyer",
          role: "user",
          createdAt: new Date("2026-06-01T00:00:00Z"),
          updatedAt: new Date("2026-06-01T00:00:00Z"),
          lastSignedIn: new Date("2026-06-02T00:00:00Z"),
          vipTier: "vvip",
          vipNote: null,
        },
      ],
      [
        {
          id: 10,
          merchantTradeNo: "CAMPV499RZI7CB",
          paymentStatus: "paid",
          paymentMethod: "credit",
          shippingMethod: "home",
          orderStatus: "processing",
          isPreorder: false,
          isCustomOrder: false,
          totalAmount: 1680,
          buyerName: "羅意涵",
          buyerEmail: "buyer@example.com",
          buyerPhone: "0912345678",
          createdAt: new Date("2026-06-02T00:00:00Z"),
          paidAt: new Date("2026-06-02T00:05:00Z"),
          itemCount: 1,
        },
      ],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const caller = createCaller({ id: 1, role: "admin" });
    const result = await caller.detail({ userId: 7 });

    expect(result.member).toMatchObject({
      id: 7,
      vipTier: "vvip",
      lineBound: true,
      lineEmail: "buyer-line@example.com",
      lineDisplayName: "買家 LINE",
      linePictureUrl: "https://profile.line-scdn.net/buyer",
    });
    // 只提供是否綁定，不把 LINE userId 傳到前端
    expect(result.member).not.toHaveProperty("openId");
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0]).toMatchObject({
      merchantTradeNo: "CAMPV499RZI7CB",
      totalAmount: 1680,
      itemCount: 1,
    });
    expect(db.execute).toHaveBeenCalledTimes(2);
    expect(db.select).toHaveBeenCalledTimes(2);
  });

  it("updates VIP tier and note", async () => {
    const db = createMockDb([]);
    getDbMock.mockResolvedValue(db as any);

    const caller = createCaller({ id: 1, role: "admin" });
    const result = await caller.updateVip({
      userId: 7,
      vipTier: "vip",
      vipNote: "常買月光石",
    });

    expect(result).toEqual({ success: true });
    expect(db.execute).toHaveBeenCalledTimes(3);
  });

  it("deletes a regular member and clears user links from related records", async () => {
    const db = createMockDb([
      [
        {
          id: 7,
          role: "user",
        },
      ],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const caller = createCaller({ id: 1, role: "admin" });
    const result = await caller.deleteMember({ userId: 7 });

    expect(result).toEqual({ success: true, deletedUserId: 7 });
    expect(db.select).toHaveBeenCalledTimes(1);
    // 2 次 ensure VIP 欄位 + 訂單、客服紀錄、未使用優惠券、會員本身
    expect(db.execute).toHaveBeenCalledTimes(6);
    const statements = db.execute.mock.calls.map(([query]: [{ queryChunks: unknown[] }]) =>
      JSON.stringify(query.queryChunks)
    );
    expect(statements.some((statement: string) => statement.includes("DELETE FROM `memberCoupons`"))).toBe(true);
  });

  it("does not allow admins to delete themselves", async () => {
    const caller = createCaller({ id: 1, role: "admin" });

    await expect(caller.deleteMember({ userId: 1 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("does not allow deleting another admin account from member management", async () => {
    const db = createMockDb([
      [
        {
          id: 2,
          role: "admin",
        },
      ],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const caller = createCaller({ id: 1, role: "admin" });

    await expect(caller.deleteMember({ userId: 2 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(db.execute).toHaveBeenCalledTimes(2);
  });
});

describe("buildMemberSearchWhere", () => {
  const dialect = new MySqlDialect();
  const compile = (search?: string) => {
    const where = buildMemberSearchWhere(search);
    return where ? dialect.sqlToQuery(where) : undefined;
  };

  it("matches case-insensitively across name, email, LINE email and id", () => {
    const query = compile("  GMAIL  ")!;
    expect(query.params).toEqual(["%gmail%", "%gmail%", "%gmail%", "%gmail%"]);
    expect(query.sql).toContain("LOWER(`users`.`name`) LIKE ?");
    expect(query.sql).toContain("LOWER(`users`.`email`) LIKE ?");
    expect(query.sql).toContain("LOWER(`users`.`lineEmail`) LIKE ?");
    expect(query.sql).toContain("CAST(`users`.`id` AS CHAR) LIKE ?");
  });

  it("requires every keyword to match", () => {
    const query = compile("Chun Gmail")!;
    expect(query.params).toEqual([
      "%chun%", "%chun%", "%chun%", "%chun%",
      "%gmail%", "%gmail%", "%gmail%", "%gmail%",
    ]);
    expect(query.sql).toMatch(/\) and \(/);
  });

  it("treats wildcard characters as plain text", () => {
    expect(compile("50%_off!")!.params[0]).toBe("%50!%!_off!!%");
  });

  it("returns no filter for a blank search", () => {
    expect(compile("   ")).toBeUndefined();
    expect(compile(undefined)).toBeUndefined();
  });
});

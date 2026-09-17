/**
 * 優惠券資料庫整合測試（真實 SQL：條件式 UPDATE、UNIQUE、transaction、並行）
 *
 * 預設略過。只會連到 .env.test.local 的測試資料庫，並沿用 scripts/test-db-helpers.mjs 的安全檢查：
 *   NODE_ENV=test RUN_COUPON_DB_TESTS=true E2E_ALLOW_TEST_DB_WRITES=true \
 *   E2E_TEST_DATABASE_NAME=... E2E_TIDB_PROJECT_ID=... npx vitest run server/couponDb.integration.test.ts
 * 需先套用 drizzle/0037_member_coupons.sql。測試只刪除自己建立的資料。
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

const runIntegration = process.env.RUN_COUPON_DB_TESTS === "true";

type CouponDbModule = typeof import("./couponDb");
type DbModule = typeof import("./db");
type SchemaModule = typeof import("../drizzle/schema");

describe.skipIf(!runIntegration)("couponDb against the test database", () => {
  let couponDb: CouponDbModule;
  let dbModule: DbModule;
  let schema: SchemaModule;
  const runId = crypto.randomBytes(4).toString("hex");
  const created = { userIds: [] as number[], templateIds: [] as number[], orderIds: [] as number[] };
  let previousSettings: { key: string; value: string }[] = [];

  async function db() {
    const instance = await dbModule.getDb();
    if (!instance) throw new Error("test database not available");
    return instance;
  }

  async function createUser(label: string) {
    const openId = `test-coupon:${runId}:${label}`;
    const instance = await db();
    await instance.insert(schema.users).values({ openId, name: `coupon ${label}`, email: `${label}.${runId}@example.test` });
    const [user] = await instance.select().from(schema.users).where(eq(schema.users.openId, openId)).limit(1);
    created.userIds.push(user.id);
    return user;
  }

  async function createTemplate(overrides: Partial<Parameters<CouponDbModule["createCouponTemplate"]>[0]> = {}) {
    const template = await couponDb.createCouponTemplate({
      name: `整合測試券 ${runId}`,
      discountAmount: 50,
      minOrderAmount: 0,
      validityType: "days_after_issue",
      validDays: 30,
      fixedExpiresAt: null,
      maxPerUser: 1,
      isActive: true,
      ...overrides,
    });
    created.templateIds.push(template!.id);
    return template!;
  }

  async function createOrder(userId: number, paymentMethod: "credit" | "atm" = "credit") {
    const instance = await db();
    const merchantTradeNo = `TC${runId}${crypto.randomBytes(5).toString("hex")}`.slice(0, 20);
    await instance.insert(schema.orders).values({
      merchantTradeNo,
      userId,
      paymentMethod,
      paymentStatus: paymentMethod === "atm" ? "transfer_pending" : "pending",
      totalAmount: 1000,
      buyerName: "整合測試",
      buyerEmail: `order.${runId}@example.test`,
      buyerPhone: "0912345678",
    });
    const [order] = await instance.select().from(schema.orders).where(eq(schema.orders.merchantTradeNo, merchantTradeNo)).limit(1);
    created.orderIds.push(order.id);
    return order;
  }

  async function couponRow(id: number) {
    const [row] = await (await db()).select().from(schema.memberCoupons).where(eq(schema.memberCoupons.id, id)).limit(1);
    return row;
  }

  async function checkoutWithCoupon(couponId: number, userId: number, paymentMethod: "credit" | "atm" = "credit") {
    const reservedAt = await couponDb.reserveCoupon(couponId, userId);
    if (!reservedAt) return null;
    const order = await createOrder(userId, paymentMethod);
    expect(await couponDb.attachReservedCouponToOrder(couponId, reservedAt, order.id)).toBe(true);
    return order;
  }

  beforeAll(async () => {
    // @ts-expect-error -- plain ESM helper without type declarations
    const helpers = await import("../scripts/test-db-helpers.mjs");
    const config = helpers.loadTestEnv();
    helpers.assertTestDatabaseTarget(config, { write: true });
    dbModule = await import("./db");
    couponDb = await import("./couponDb");
    schema = await import("../drizzle/schema");
    const instance = await db();
    previousSettings = await instance
      .select({ key: schema.siteSettings.key, value: schema.siteSettings.value })
      .from(schema.siteSettings)
      .where(inArray(schema.siteSettings.key, ["lineFriendRewardEnabled", "lineFriendRewardTemplateId"]));
  });

  afterAll(async () => {
    if (!dbModule) return;
    const instance = await db();
    if (created.userIds.length) {
      await instance.delete(schema.lineFriendRewards).where(inArray(schema.lineFriendRewards.userId, created.userIds));
      await instance.delete(schema.memberCoupons).where(inArray(schema.memberCoupons.userId, created.userIds));
    }
    if (created.orderIds.length) await instance.delete(schema.orders).where(inArray(schema.orders.id, created.orderIds));
    if (created.templateIds.length) {
      await instance.delete(schema.couponTemplates).where(inArray(schema.couponTemplates.id, created.templateIds));
    }
    if (created.userIds.length) await instance.delete(schema.users).where(inArray(schema.users.id, created.userIds));
    await instance
      .delete(schema.siteSettings)
      .where(inArray(schema.siteSettings.key, ["lineFriendRewardEnabled", "lineFriendRewardTemplateId"]));
    for (const setting of previousSettings) await instance.insert(schema.siteSettings).values(setting);
  });

  it("keeps the issued snapshot when the template changes later", async () => {
    const member = await createUser("snapshot");
    const template = await createTemplate();
    const issued = await couponDb.issueCoupon({ templateId: template.id, userId: member.id, source: "ADMIN_GIFT" });

    await couponDb.updateCouponTemplate(template.id, { ...template, discountAmount: 100, minOrderAmount: 500 });

    const stored = await couponRow(issued.id);
    expect(stored.discountAmount).toBe(50);
    expect(stored.minOrderAmount).toBe(0);
    expect(stored.expiresAt.getTime() - stored.issuedAt.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("enforces the per-member limit even for concurrent issuance", async () => {
    const member = await createUser("limit");
    const template = await createTemplate({ maxPerUser: 2 });
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => couponDb.issueCoupon({ templateId: template.id, userId: member.id, source: "ADMIN_GIFT" }))
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
    expect(await couponDb.listMemberCoupons(member.id)).toHaveLength(2);
  });

  it("refuses to issue a disabled template", async () => {
    const member = await createUser("disabled");
    const template = await createTemplate({ isActive: false });
    await expect(
      couponDb.issueCoupon({ templateId: template.id, userId: member.id, source: "ADMIN_GIFT" })
    ).rejects.toMatchObject({ code: "INACTIVE" });
  });

  it("lets only one of two concurrent checkouts reserve a coupon", async () => {
    const member = await createUser("concurrent");
    const template = await createTemplate();
    const coupon = await couponDb.issueCoupon({ templateId: template.id, userId: member.id, source: "ADMIN_GIFT" });

    const reservations = await Promise.all(
      Array.from({ length: 5 }, () => couponDb.reserveCoupon(coupon.id, member.id))
    );
    expect(reservations.filter(Boolean)).toHaveLength(1);
  });

  it("rejects another member's coupon and expired coupons", async () => {
    const owner = await createUser("owner");
    const other = await createUser("other");
    const template = await createTemplate();
    const coupon = await couponDb.issueCoupon({ templateId: template.id, userId: owner.id, source: "ADMIN_GIFT" });

    await expect(couponDb.getCouponForCheckout(coupon.id, other.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await couponDb.reserveCoupon(coupon.id, other.id)).toBeNull();

    await (await db())
      .update(schema.memberCoupons)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(schema.memberCoupons.id, coupon.id));
    await expect(couponDb.getCouponForCheckout(coupon.id, owner.id)).rejects.toMatchObject({ code: "EXPIRED" });
    expect(await couponDb.reserveCoupon(coupon.id, owner.id)).toBeNull();
  });

  it("marks a coupon used once and never for a second order", async () => {
    const member = await createUser("used");
    const template = await createTemplate();
    const coupon = await couponDb.issueCoupon({ templateId: template.id, userId: member.id, source: "ADMIN_GIFT" });
    const order = await checkoutWithCoupon(coupon.id, member.id);

    // 重複付款通知
    const marks = await Promise.all([
      couponDb.markCouponUsedForOrder(order!.id),
      couponDb.markCouponUsedForOrder(order!.id),
    ]);
    expect(marks.reduce((sum, value) => sum + value, 0)).toBe(1);
    expect((await couponRow(coupon.id)).status).toBe("used");

    await expect(couponDb.getCouponForCheckout(coupon.id, member.id)).rejects.toMatchObject({ code: "UNAVAILABLE" });
    expect(await couponDb.reserveCoupon(coupon.id, member.id)).toBeNull();
  });

  it("returns the coupon after a failed payment", async () => {
    const member = await createUser("failed");
    const template = await createTemplate();
    const coupon = await couponDb.issueCoupon({ templateId: template.id, userId: member.id, source: "ADMIN_GIFT" });
    const order = await checkoutWithCoupon(coupon.id, member.id);

    await couponDb.releaseCouponsForOrders([order!.id], { includeUsed: false, reason: "test failure" });
    expect(await couponDb.markCouponUsedForOrder(order!.id)).toBe(0);

    const stored = await couponRow(coupon.id);
    expect(stored).toMatchObject({ status: "available", orderId: null });
    expect(await checkoutWithCoupon(coupon.id, member.id)).not.toBeNull();
  });

  it("returns a used coupon when a paid order is cancelled", async () => {
    const member = await createUser("cancel");
    const template = await createTemplate();
    const coupon = await couponDb.issueCoupon({ templateId: template.id, userId: member.id, source: "ADMIN_GIFT" });
    const order = await checkoutWithCoupon(coupon.id, member.id);
    await couponDb.markCouponUsedForOrder(order!.id);

    await couponDb.releaseCouponsForOrders([order!.id], { includeUsed: true, reason: "test cancel" });
    expect(await couponRow(coupon.id)).toMatchObject({ status: "available", orderId: null, usedAt: null });
  });

  it("keeps a fresh card reservation but frees a stale one", async () => {
    const member = await createUser("stale");
    const template = await createTemplate();
    const coupon = await couponDb.issueCoupon({ templateId: template.id, userId: member.id, source: "ADMIN_GIFT" });
    const firstOrder = await checkoutWithCoupon(coupon.id, member.id);
    expect(await couponDb.reserveCoupon(coupon.id, member.id)).toBeNull();

    await (await db())
      .update(schema.memberCoupons)
      .set({ reservedAt: new Date(Date.now() - 31 * 60_000) })
      .where(eq(schema.memberCoupons.id, coupon.id));
    const [view] = await couponDb.listMemberCoupons(member.id);
    expect(view.displayStatus).toBe("available");

    const secondOrder = await checkoutWithCoupon(coupon.id, member.id);
    expect(secondOrder).not.toBeNull();
    // 舊訂單之後才付款成功：不可再核銷同一張券
    expect(await couponDb.markCouponUsedForOrder(firstOrder!.id)).toBe(0);
    expect(await couponDb.markCouponUsedForOrder(secondOrder!.id)).toBe(1);
  });

  it("never frees a stale reservation of a bank transfer order", async () => {
    const member = await createUser("atm");
    const template = await createTemplate();
    const coupon = await couponDb.issueCoupon({ templateId: template.id, userId: member.id, source: "ADMIN_GIFT" });
    await checkoutWithCoupon(coupon.id, member.id, "atm");
    await (await db())
      .update(schema.memberCoupons)
      .set({ reservedAt: new Date(Date.now() - 2 * 60 * 60_000) })
      .where(eq(schema.memberCoupons.id, coupon.id));

    expect(await couponDb.reserveCoupon(coupon.id, member.id)).toBeNull();
  });

  describe("LINE binding", () => {
    it("binds an email member, keeps their login email, and refuses conflicts", async () => {
      const member = await createUser("bind");
      const other = await createUser("bind-other");
      const lineOpenId = `line:Utest${runId}bind`;

      expect(await dbModule.bindLineToUser({ userId: member.id, lineOpenId })).toBe("bound");
      expect(await dbModule.bindLineToUser({ userId: member.id, lineOpenId })).toBe("already_bound");
      expect(await dbModule.bindLineToUser({ userId: other.id, lineOpenId })).toBe("line_in_use");
      expect(
        await dbModule.bindLineToUser({ userId: member.id, lineOpenId: `line:Utest${runId}bind2` })
      ).toBe("user_has_other_line");

      // 已綁定的 Email 會員之後用 LINE 登入：保留原本的登入 Email
      const instance = await db();
      await instance.update(schema.users).set({ passwordHash: "hash" }).where(eq(schema.users.id, member.id));
      await dbModule.upsertLineUserAsPrimary({ openId: lineOpenId, email: `line-email.${runId}@example.test`, name: "LINE 名稱" });
      const [stored] = await instance.select().from(schema.users).where(eq(schema.users.id, member.id)).limit(1);
      expect(stored.openId).toBe(lineOpenId);
      expect(stored.email).toBe(member.email);
      expect(stored.lineEmail).toBe(`line-email.${runId}@example.test`);

      // 另一個 LINE 帳號的信箱剛好等於此會員的信箱：不可接管此帳號
      const intruderOpenId = `line:Utest${runId}intruder`;
      await dbModule.upsertLineUserAsPrimary({ openId: intruderOpenId, email: member.email });
      const [afterIntruder] = await instance.select().from(schema.users).where(eq(schema.users.id, member.id)).limit(1);
      expect(afterIntruder.openId).toBe(lineOpenId);
      const [intruder] = await instance.select().from(schema.users).where(eq(schema.users.openId, intruderOpenId)).limit(1);
      created.userIds.push(intruder.id);
      expect(intruder.id).not.toBe(member.id);
      expect(intruder.email).toBeNull();
      expect(intruder.lineEmail).toBe(member.email);
      expect((await dbModule.getUserByEmail(member.email!))?.id).toBe(member.id);
    });
  });

  describe("LINE friend reward", () => {
    let rewardTemplateId: number;

    beforeAll(async () => {
      const template = await createTemplate({ name: `LINE 好友禮 ${runId}`, maxPerUser: 1 });
      rewardTemplateId = template.id;
      await couponDb.saveLineFriendRewardSettings({ enabled: true, templateId: rewardTemplateId });
    });

    it("grants once under concurrent and repeated requests", async () => {
      const member = await createUser("line-concurrent");
      const lineUserId = `Utest${runId}concurrent`;
      const results = await Promise.all(
        Array.from({ length: 6 }, () => couponDb.grantLineFriendReward({ userId: member.id, lineUserId }))
      );
      expect(results.filter((result) => result.status === "granted")).toHaveLength(1);
      expect(results.filter((result) => result.status !== "granted").every((result) => result.status === "already")).toBe(true);

      const again = await couponDb.grantLineFriendReward({ userId: member.id, lineUserId });
      expect(again.status).toBe("already");
      const coupons = await couponDb.listMemberCoupons(member.id);
      expect(coupons).toHaveLength(1);
      expect(coupons[0]).toMatchObject({ source: "LINE_FRIEND", discountAmount: 50 });
    });

    it("does not grant again after re-binding a different LINE account", async () => {
      const member = await createUser("line-rebind");
      await couponDb.grantLineFriendReward({ userId: member.id, lineUserId: `Utest${runId}first` });
      const rebind = await couponDb.grantLineFriendReward({ userId: member.id, lineUserId: `Utest${runId}second` });
      expect(rebind.status).toBe("already");
      expect(await couponDb.listMemberCoupons(member.id)).toHaveLength(1);
    });

    it("does not grant the same LINE account to a second member", async () => {
      const first = await createUser("line-owner-a");
      const second = await createUser("line-owner-b");
      const lineUserId = `Utest${runId}shared`;
      expect((await couponDb.grantLineFriendReward({ userId: first.id, lineUserId })).status).toBe("granted");
      expect((await couponDb.grantLineFriendReward({ userId: second.id, lineUserId })).status).toBe("already");
      expect(await couponDb.listMemberCoupons(second.id)).toHaveLength(0);
    });

    it("uses the template chosen in settings, with its current amount", async () => {
      const member = await createUser("line-settings");
      const template = await createTemplate({ name: `LINE 好友禮 100 ${runId}`, discountAmount: 100 });
      await couponDb.saveLineFriendRewardSettings({ enabled: true, templateId: template.id });

      const result = await couponDb.grantLineFriendReward({ userId: member.id, lineUserId: `Utest${runId}settings` });
      expect(result.status).toBe("granted");
      expect(result.status === "granted" && result.coupon.discountAmount).toBe(100);

      await couponDb.saveLineFriendRewardSettings({ enabled: true, templateId: rewardTemplateId });
    });

    it("grants nothing while the reward is switched off, and allows claiming later", async () => {
      const member = await createUser("line-disabled");
      const lineUserId = `Utest${runId}disabled`;
      await couponDb.saveLineFriendRewardSettings({ enabled: false, templateId: rewardTemplateId });
      expect((await couponDb.grantLineFriendReward({ userId: member.id, lineUserId })).status).toBe("disabled");
      expect(await couponDb.getLineFriendRewardForUser(member.id)).toBeNull();

      await couponDb.saveLineFriendRewardSettings({ enabled: true, templateId: rewardTemplateId });
      expect((await couponDb.grantLineFriendReward({ userId: member.id, lineUserId })).status).toBe("granted");
    });

    it("keeps unclaimed status when the chosen template is disabled", async () => {
      const member = await createUser("line-inactive");
      const template = await createTemplate({ name: `停用好友禮 ${runId}` });
      await couponDb.saveLineFriendRewardSettings({ enabled: true, templateId: template.id });
      await couponDb.updateCouponTemplate(template.id, { ...template, isActive: false });

      const result = await couponDb.grantLineFriendReward({ userId: member.id, lineUserId: `Utest${runId}inactive` });
      expect(result.status).toBe("unavailable");
      expect(await couponDb.getLineFriendRewardForUser(member.id)).toBeNull();

      await couponDb.saveLineFriendRewardSettings({ enabled: true, templateId: rewardTemplateId });
    });
  });
});

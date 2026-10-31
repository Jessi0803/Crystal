import {
  test,
  expect,
  type BrowserContext,
  type APIRequestContext,
} from "@playwright/test";
import { SignJWT } from "jose";
import superjson from "superjson";
import fs from "node:fs/promises";
import { connectToTestDatabase } from "../../scripts/test-db-helpers.mjs";
import { generateCheckMacValue } from "../../server/ecpay";

const baseURL = "http://127.0.0.1:3200";
const run = `PA${Date.now().toString(36)}`;
let db: any, admin: BrowserContext, member: BrowserContext;
let userId: number,
  promotionId: number,
  couponId: number,
  highCouponId: number,
  deposit: number;
let rule: any;
const productId = `promo-accept-${run}`;
const customId = "custom-deposit-product";
const evidence: any[] = [];

async function rpc(
  request: APIRequestContext,
  path: string,
  input: unknown,
  mutation = true,
  reject = false
): Promise<any> {
  const serialized = superjson.serialize(input);
  const response = mutation
    ? await request.post(`${baseURL}/api/trpc/${path}`, { data: serialized })
    : await request.get(
        `${baseURL}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify(serialized))}`
      );
  const body = await response.json();
  if (reject) {
    expect(body.error, JSON.stringify(body)).toBeTruthy();
    return body.error.json ?? body.error;
  }
  expect(response.ok(), `${path}: ${JSON.stringify(body)}`).toBeTruthy();
  return superjson.deserialize(body.result.data);
}
async function rows(sql: string, values: any[] = []) {
  return (await db.execute(sql, values))[0] as any[];
}
async function order(no: string) {
  return (
    await rows("SELECT * FROM orders WHERE merchantTradeNo = ?", [no])
  )[0];
}
async function pay(
  request: APIRequestContext,
  no: string,
  amount: number,
  success = true
) {
  const form: Record<string, string> = {
    MerchantID: "3002607",
    MerchantTradeNo: no,
    RtnCode: success ? "1" : "10100058",
    RtnMsg: success ? "Paid" : "Failed",
    TradeNo: `${run}${Date.now().toString(36)}`.slice(0, 20),
    TradeAmt: String(amount),
    PaymentType: "Credit_CreditCard",
  };
  form.CheckMacValue = generateCheckMacValue(form);
  const response = await request.post(`${baseURL}/api/ecpay/notify`, { form });
  expect(await response.text()).toBe("1|OK");
}
async function activity(active: boolean, discountAmount = 111) {
  await rpc(admin.request, "promotions.adminSave", {
    id: promotionId,
    name: `活動驗收 ${run}`,
    threshold: 1111,
    discountAmount,
    maxDiscount: null,
    startsAt: new Date(Date.now() - 86400_000).toISOString(),
    endsAt: new Date(Date.now() + 86400_000).toISOString(),
    isActive: active,
  });
}
async function create(custom = false, coupon?: number) {
  const result = await rpc(member.request, "order.createAndPay", {
    buyerName: "活動驗收收件人",
    buyerEmail: `${run}@example.com`,
    buyerPhone: "0912345678",
    checkoutRegion: "domestic",
    paymentMethod: "credit",
    shippingMethod: "home",
    shippingAddress: "台北市中正區驗收路 1 號",
    receiverZipCode: "100",
    items: [
      {
        id: custom ? customId : productId,
        baseProductId: custom ? customId : productId,
        name: "活動驗收",
        price: custom ? deposit : 2500,
        quantity: 1,
        wristSize: "15",
        claspType: "elastic",
      },
    ],
    memberCouponId: coupon,
    origin: baseURL,
  });
  expect(result.kind).toBe("ecpay_credit");
  expect(result.paymentURL).toContain("payment-stage.ecpay.com.tw");
  return { result, row: await order(result.merchantTradeNo) };
}
async function customOrder() {
  const created = await create(true);
  await pay(member.request, created.row.merchantTradeNo, deposit);
  expect((await order(created.row.merchantTradeNo)).orderStatus).toBe(
    "deposit_paid"
  );
  return created.row;
}
const shipping = {
  checkoutRegion: "domestic",
  receiverPhone: "0912345678",
  shippingMethod: "home",
  shippingAddress: "台北市中正區驗收路 1 號",
  receiverZipCode: "100",
  origin: baseURL,
};
async function link(id: number, amount?: number) {
  return rpc(admin.request, "order.createBalancePaymentLink", {
    orderId: id,
    ...(amount != null ? { amount } : {}),
  });
}
async function directLegacy(suffix: string, version: number | null = null) {
  const no = `${run}${suffix}`;
  const [insert] = await db.execute(
    "INSERT INTO orders (merchantTradeNo,userId,paymentStatus,paymentMethod,deliveryRegion,shippingMethod,orderStatus,isCustomOrder,totalAmount,buyerName,buyerEmail,buyerPhone,promotionFlowVersion) VALUES (?,?,'confirmed','atm','domestic','home','deposit_paid',true,1000,'活動驗收',?,'0912345678',?)",
    [no, userId, `${run}@example.com`, version]
  );
  await db.execute(
    "INSERT INTO orderItems (orderId,productId,productName,quantity,unitPrice,subtotal) VALUES (?,?,?,1,1000,1000)",
    [insert.insertId, customId, "客製訂金"]
  );
  return { id: Number(insert.insertId), merchantTradeNo: no };
}

test.describe.configure({ mode: "serial" });
test.beforeAll(async ({ browser }) => {
  ({ connection: db } = await connectToTestDatabase({ write: true }));
  const [identity] = await rows("SELECT CURRENT_USER() AS currentUser");
  expect(identity.currentUser.split(".")[0]).toBe("3DeLUzaGBUJsiKt");
  console.log(
    `驗收資料庫：crystal-test（${identity.currentUser}）；run=${run}`
  );
  expect(
    (
      await rows(
        "SELECT id FROM promotions WHERE isActive = true AND startsAt <= NOW() AND endsAt > NOW()"
      )
    ).length,
    "避免覆蓋其他正在測試的活動"
  ).toBe(0);
  async function session(role: string) {
    const openId = `${run}-${role}`;
    const [result] = await db.execute(
      "INSERT INTO users(openId,name,email,emailVerified,role,loginMethod) VALUES (?,?,?,true,?,'email')",
      [openId, `活動驗收 ${role}`, `${run}-${role}@example.com`, role]
    );
    if (role === "user") userId = Number(result.insertId);
    const context = await browser.newContext({ baseURL });
    const value = await new SignJWT({
      openId,
      appId: "",
      name: `活動驗收 ${role}`,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime("2h")
      .sign(new TextEncoder().encode("e2e-local-jwt-secret-min-32-chars"));
    await context.addCookies([
      {
        name: "app_session_id",
        value,
        url: baseURL,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    return context;
  }
  admin = await session("admin");
  member = await session("user");
  const mode = await rpc(admin.request, "system.paymentMode", undefined, false);
  expect(mode).toMatchObject({
    ecpaySandbox: true,
    ecpayLogisticsSandbox: true,
  });
  await db.execute(
    "INSERT INTO products(id,name,category,categoryLabel,price,originalPrice,image,active,showWristSize,showFitPreference,twoItemFreeShippingEligible,claspOptions) VALUES (?,?,'healing','驗收',2500,3000,'/images/d-design/d001.jpg',true,false,false,false,?)",
    [productId, `活動驗收商品 ${run}`, JSON.stringify(["elastic"])]
  );
  await db.execute(
    "INSERT INTO productInventory(productId,productName,stock,allowPreorder) VALUES (?,?,-1,false)",
    [productId, `活動驗收商品 ${run}`]
  );
  const [custom] = await rows("SELECT price,active FROM products WHERE id=?", [
    customId,
  ]);
  expect(custom, "測試庫需有既有客製商品").toBeTruthy();
  expect(custom.active).toBe(1);
  deposit = custom.price;
  expect(deposit).toBeLessThanOrEqual(1500);
  const page = await admin.newPage();
  await page.goto("/admin/promotions");
  await expect(
    page.getByRole("heading", { name: "活動管理", exact: true })
  ).toBeVisible();
  await rpc(admin.request, "promotions.adminSave", {
    name: `活動驗收 ${run}`,
    threshold: 1111,
    discountAmount: 111,
    maxDiscount: null,
    startsAt: new Date(Date.now() - 86400_000).toISOString(),
    endsAt: new Date(Date.now() + 86400_000).toISOString(),
    isActive: true,
  });
  const list = await rpc(
    admin.request,
    "promotions.adminList",
    undefined,
    false
  );
  promotionId = list.find((p: any) => p.name === `活動驗收 ${run}`).id;
  rule = await rpc(member.request, "promotions.active", undefined, false);
  await page.reload();
  await expect(
    page.getByRole("cell", { name: `活動驗收 ${run}`, exact: true })
  ).toBeVisible();
  await page.close();
  for (const minOrderAmount of [2000, 2400]) {
    const template = await rpc(admin.request, "coupons.adminCreate", {
      name: `驗收券 ${run} ${minOrderAmount}`,
      discountAmount: 100,
      minOrderAmount,
      validityType: "days_after_issue",
      validDays: 30,
      fixedExpiresOn: null,
      maxPerUser: 1,
      isActive: true,
    });
    const issued = await rpc(admin.request, "coupons.adminIssue", {
      userId,
      templateId: template.id,
    });
    if (minOrderAmount === 2000) couponId = issued.id;
    else highCouponId = issued.id;
  }
});
test.afterAll(async () => {
  if (db) {
    if (promotionId)
      await db.execute("UPDATE promotions SET isActive=false WHERE id=?", [
        promotionId,
      ]);
    await fs.mkdir("test-results", { recursive: true });
    await fs.writeFile(
      "test-results/promotion-acceptance-evidence.json",
      JSON.stringify({ run, promotionId, userId, deposit, evidence }, null, 2)
    );
    await db.end();
  }
  await admin?.close();
  await member?.close();
});

test("一般商品：前台預覽、活動後低消、付款與取消退券", async () => {
  const page = await member.newPage();
  await page.goto(`/products/${productId}`);
  await page
    .locator("#product-options")
    .getByRole("button", { name: /加入購物袋/ })
    .click();
  await page.goto("/checkout");
  await expect(page.getByText("-NT$ 222", { exact: true })).toBeVisible();
  const error = await rpc(
    member.request,
    "order.createAndPay",
    {
      buyerName: "活動驗收",
      buyerEmail: `${run}@example.com`,
      buyerPhone: "0912345678",
      checkoutRegion: "domestic",
      paymentMethod: "credit",
      shippingMethod: "home",
      shippingAddress: "台北市中正區驗收路 1 號",
      receiverZipCode: "100",
      items: [
        {
          id: productId,
          name: "活動驗收",
          price: 2500,
          quantity: 1,
          claspType: "elastic",
        },
      ],
      memberCouponId: highCouponId,
      origin: baseURL,
    },
    true,
    true
  );
  expect(error.message).toContain("2400");
  const created = await create(false, couponId);
  expect(created.row.promotionFlowVersion).toBe(1);
  expect(created.row.totalAmount).toBe(2308);
  expect(Number(created.result.paymentParams.TotalAmount)).toBe(2308);
  await pay(member.request, created.row.merchantTradeNo, 2308);
  expect(
    (await rows("SELECT status FROM memberCoupons WHERE id=?", [couponId]))[0]
      .status
  ).toBe("used");
  await rpc(admin.request, "order.updateOrderStatus", {
    orderId: created.row.id,
    status: "cancelled",
  });
  expect(
    (await rows("SELECT status FROM memberCoupons WHERE id=?", [couponId]))[0]
      .status
  ).toBe("available");
  evidence.push({
    case: "一般商品＋優惠券＋取消退回",
    order: created.row.merchantTradeNo,
    total: 2308,
  });
  await page.close();
});

test("客製：保留原活動、尾款優惠券、信用卡失敗重試與回呼", async () => {
  const original = await customOrder();
  await activity(false, 1);
  const quote = await rpc(admin.request, "order.setCustomFinalPrice", {
    orderId: original.id,
    finalPrice: 3333,
  });
  expect(quote.discount).toBe(333);
  const balance = await link(original.id);
  const total = 3333 - deposit - 333 - 100 + 130;
  const first = await rpc(member.request, "order.getBalancePaymentCheckout", {
    ...shipping,
    merchantTradeNo: balance.merchantTradeNo,
    paymentMethod: "credit",
    memberCouponId: couponId,
    expectedTotal: total,
  });
  expect(first.amount).toBe(total);
  await pay(member.request, first.paymentParams.MerchantTradeNo, total, false);
  const retry = await rpc(member.request, "order.getBalancePaymentCheckout", {
    ...shipping,
    merchantTradeNo: balance.merchantTradeNo,
    paymentMethod: "credit",
    expectedTotal: total,
  });
  expect(retry.paymentParams.MerchantTradeNo).not.toBe(
    first.paymentParams.MerchantTradeNo
  );
  await pay(member.request, retry.paymentParams.MerchantTradeNo, total);
  expect(
    (await rows("SELECT status FROM memberCoupons WHERE id=?", [couponId]))[0]
      .status
  ).toBe("used");
  const page = await member.newPage();
  await page.goto(`/balance/${balance.merchantTradeNo}`);
  await expect(
    page.getByRole("heading", { name: "尾款已完成付款" })
  ).toBeVisible();
  await rpc(admin.request, "order.updateOrderStatus", {
    orderId: original.id,
    status: "cancelled",
  });
  expect(
    (await rows("SELECT status FROM memberCoupons WHERE id=?", [couponId]))[0]
      .status
  ).toBe("available");
  evidence.push({
    case: "客製保存規則與付款重試",
    order: original.merchantTradeNo,
    balance: balance.merchantTradeNo,
    total,
    discount: 333,
  });
  await page.close();
});

test("新版合併：有活動與無活動逐單報價，再合計尾款", async () => {
  await activity(true);
  const a = await customOrder();
  await activity(false);
  const b = await customOrder();
  await rpc(admin.request, "order.mergeOrders", { orderIds: [a.id, b.id] });
  const incomplete = await rpc(
    admin.request,
    "order.createBalancePaymentLink",
    { orderId: a.id },
    true,
    true
  );
  expect(incomplete.message).toContain("逐單");
  await rpc(admin.request, "order.setCustomFinalPrice", {
    orderId: a.id,
    finalPrice: 1500,
  });
  await rpc(admin.request, "order.setCustomFinalPrice", {
    orderId: b.id,
    finalPrice: 2000,
  });
  const balance = await link(a.id);
  const checkout = await rpc(
    member.request,
    "order.getBalancePaymentCheckout",
    {
      ...shipping,
      merchantTradeNo: balance.merchantTradeNo,
      paymentMethod: "atm",
    }
  );
  expect(checkout.amount).toBe(3500 - deposit * 2 - 111);
  const detail = await rpc(
    member.request,
    "order.getBalancePayment",
    { merchantTradeNo: balance.merchantTradeNo },
    false
  );
  expect(detail.quote.discount).toBe(111);
  expect(detail.promotionOrders).toHaveLength(2);
  evidence.push({
    case: "新版逐單合併",
    orders: [a.merchantTradeNo, b.merchantTradeNo],
    balance: balance.merchantTradeNo,
    total: checkout.amount,
  });
});

test("舊版：既有尾款與合併維持原操作，跨版本禁止", async () => {
  const a = await directLegacy("OLD1"),
    b = await directLegacy("OLD2");
  const first = await link(a.id, 700);
  const replaced = await link(a.id, 800);
  expect(replaced.merchantTradeNo).toBe(first.merchantTradeNo);
  const denied = await rpc(
    admin.request,
    "order.setCustomFinalPrice",
    { orderId: a.id, finalPrice: 2000 },
    true,
    true
  );
  expect(denied.message).toContain("舊訂單");
  await rpc(admin.request, "order.mergeOrders", { orderIds: [a.id, b.id] });
  const merged = await link(a.id, 1500);
  const checkout = await rpc(
    member.request,
    "order.getBalancePaymentCheckout",
    {
      ...shipping,
      merchantTradeNo: merged.merchantTradeNo,
      paymentMethod: "atm",
    }
  );
  expect(checkout.amount).toBe(1500);
  const old = await directLegacy("OLD3"),
    fresh = await directLegacy("NEW1", 1);
  const mixed = await rpc(
    admin.request,
    "order.mergeOrders",
    { orderIds: [old.id, fresh.id] },
    true,
    true
  );
  expect(mixed.message).toContain("跨版本");
  expect(
    (
      await rows(
        "SELECT orderId FROM orderMergeMembers WHERE orderId IN (?,?)",
        [old.id, fresh.id]
      )
    ).length
  ).toBe(0);
  const untouched = await order(old.merchantTradeNo);
  expect(untouched.promotionFlowVersion).toBeNull();
  const oldLink = await link(old.id, 600);
  const page = await member.newPage();
  await page.goto(`/balance/${oldLink.merchantTradeNo}`);
  await expect(page.getByText("尾款小計", { exact: true })).toBeVisible();
  await expect(page.getByText("優惠券", { exact: true })).toHaveCount(0);
  evidence.push({
    case: "舊流程與版本隔離",
    orders: [
      a.merchantTradeNo,
      b.merchantTradeNo,
      old.merchantTradeNo,
      fresh.merchantTradeNo,
    ],
    fixedLink: merged.merchantTradeNo,
  });
  await page.close();
});

test("優惠超過商品尾款可折運費到零，不建立金流交易", async () => {
  const zero = await directLegacy("ZERO", 1);
  const snapshot = {
    rule,
    qualifiedAt: new Date().toISOString(),
    discount: 111,
    quote: { finalPrice: 1111, depositPaid: 1100, discount: 111 },
  };
  await db.execute(
    "UPDATE orders SET totalAmount=1100,promotion=?,customQuote=? WHERE id=?",
    [JSON.stringify(snapshot), JSON.stringify(snapshot.quote), zero.id]
  );
  await db.execute(
    "UPDATE orderItems SET unitPrice=1100,subtotal=1100 WHERE orderId=?",
    [zero.id]
  );
  const balance = await link(zero.id);
  const result = await rpc(member.request, "order.getBalancePaymentCheckout", {
    ...shipping,
    merchantTradeNo: balance.merchantTradeNo,
    paymentMethod: "credit",
    shippingMethod: "cvs_711",
    cvsStoreId: "131386",
    cvsStoreName: "驗收門市",
    cvsType: "UNIMARTC2C",
    expectedTotal: 0,
  });
  expect(result).toMatchObject({ kind: "no_payment", amount: 0 });
  const detail = await rpc(
    member.request,
    "order.getBalancePayment",
    { merchantTradeNo: balance.merchantTradeNo },
    false
  );
  expect(detail.paymentStatus).toBe("paid");
  const [count] = await rows(
    "SELECT COUNT(*) AS count FROM orderBalancePaymentAttempts WHERE balancePaymentId=?",
    [detail.id]
  );
  expect(Number(count.count)).toBe(0);
  evidence.push({
    case: "活動折尾款與運費至零",
    order: zero.merchantTradeNo,
    balance: balance.merchantTradeNo,
    total: 0,
  });
});

test("同單客製與一般手鍊：門檻含首單商品，尾款不重收已付款項", async () => {
  const created = await rpc(member.request, "order.createAndPay", {
    buyerName: "混合訂單驗收",
    buyerEmail: `${run}@example.com`,
    buyerPhone: "0912345678",
    checkoutRegion: "domestic",
    paymentMethod: "credit",
    shippingMethod: "home",
    shippingAddress: "台北市中正區驗收路 1 號",
    receiverZipCode: "100",
    origin: baseURL,
    items: [
      {
        id: customId,
        name: "客製訂金",
        price: deposit,
        quantity: 1,
        wristSize: "15",
        claspType: "elastic",
      },
      {
        id: productId,
        name: "一般手鍊",
        price: 2500,
        quantity: 1,
        claspType: "elastic",
      },
    ],
  });
  const mixed = await order(created.merchantTradeNo);
  expect(mixed.totalAmount).toBe(2500 + deposit);
  await pay(member.request, mixed.merchantTradeNo, 2500 + deposit);
  const adminPage = await admin.newPage();
  await adminPage.goto("/admin/orders");
  await adminPage
    .locator("button")
    .filter({ hasText: mixed.merchantTradeNo })
    .click();
  await expect(
    adminPage.getByRole("button", { name: /設定.*總價/ })
  ).toHaveCount(0);
  adminPage.once("dialog", async dialog => {
    expect(dialog.message()).toContain("尚需補付");
    await dialog.accept(String(2000 - deposit));
  });
  const generated = adminPage.waitForResponse(
    response =>
      response.url().includes("order.createBalancePaymentLink") &&
      response.request().method() === "POST"
  );
  await adminPage
    .getByRole("button", { name: "產生尾款／配送連結", exact: true })
    .click();
  const response = await generated;
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const balance: any = superjson.deserialize(
    (Array.isArray(payload) ? payload[0] : payload).result.data
  );
  const detail = await rpc(
    member.request,
    "order.getBalancePayment",
    { merchantTradeNo: balance.merchantTradeNo },
    false
  );
  expect(detail.quote).toMatchObject({
    finalPrice: 2000,
    depositPaid: deposit,
    paidRegularSubtotal: 2500,
    discount: 444,
  });
  expect(balance.payableAmount).toBe(2000 - deposit - 444);
  await adminPage.close();
  expect(balance.amount).toBe(2000 - deposit);
  const total = 2000 - deposit - 444 - 100 + 130;
  const checkout = await rpc(
    member.request,
    "order.getBalancePaymentCheckout",
    {
      ...shipping,
      merchantTradeNo: balance.merchantTradeNo,
      paymentMethod: "credit",
      memberCouponId: highCouponId,
      expectedTotal: total,
    }
  );
  expect(checkout.amount).toBe(total);
  await pay(member.request, checkout.paymentParams.MerchantTradeNo, total);
  expect((await order(mixed.merchantTradeNo)).totalAmount).toBe(
    4500 - 444 - 100 + 130
  );
  const page = await member.newPage();
  await page.goto(`/balance/${balance.merchantTradeNo}`);
  await expect(
    page.getByText("活動優惠 NT$ 444", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("資格依下單時間保留", { exact: false })
  ).toHaveCount(0);
  await expect(page.getByText("活動適用金額", { exact: false })).toHaveCount(0);
  evidence.push({
    case: "混合訂單一般商品納入活動",
    order: mixed.merchantTradeNo,
    balance: balance.merchantTradeNo,
    customPrice: 2000,
    firstOrderRegular: 2500,
    discount: 444,
    total,
  });
  await page.close();

  // 無活動也只輸入尚欠尾款；不要求管理員先算總價。
  await activity(false);
  const noActivity = await customOrder();
  const ordinaryBalance = await link(noActivity.id, 1500);
  expect(ordinaryBalance.amount).toBe(1500);
  expect(ordinaryBalance.payableAmount).toBe(1500);
  const ordinaryDetail = await rpc(
    member.request,
    "order.getBalancePayment",
    { merchantTradeNo: ordinaryBalance.merchantTradeNo },
    false
  );
  expect(ordinaryDetail.quote).toMatchObject({
    finalPrice: 1500 + deposit,
    depositPaid: deposit,
    discount: 0,
  });

  // 合併單仍逐單保存活動規則，但從同一個產生連結動作提交尚欠尾款。
  await activity(true);
  const mergeA = await customOrder();
  await activity(false);
  const mergeB = await customOrder();
  await rpc(admin.request, "order.mergeOrders", {
    orderIds: [mergeA.id, mergeB.id],
  });
  const incomplete = await rpc(
    admin.request,
    "order.createBalancePaymentLink",
    {
      orderId: mergeA.id,
      balances: [{ orderId: mergeA.id, amount: 1500 - deposit }],
    },
    true,
    true
  );
  expect(incomplete.message).toContain("逐單");
  const unchanged = await rows(
    "SELECT customQuote FROM orders WHERE id IN (?, ?)",
    [mergeA.id, mergeB.id]
  );
  expect(unchanged.every(row => row.customQuote === null)).toBe(true);
  const merged = await rpc(admin.request, "order.createBalancePaymentLink", {
    orderId: mergeA.id,
    balances: [
      { orderId: mergeA.id, amount: 1500 - deposit },
      { orderId: mergeB.id, amount: 2000 - deposit },
    ],
  });
  expect(merged.amount).toBe(3500 - deposit * 2);
  expect(merged.payableAmount).toBe(3500 - deposit * 2 - 111);
  evidence.push({
    case: "直接輸入尾款：無活動與逐單合併",
    noActivityOrder: noActivity.merchantTradeNo,
    mergedOrders: [mergeA.merchantTradeNo, mergeB.merchantTradeNo],
    mergedAmount: merged.payableAmount,
  });
});

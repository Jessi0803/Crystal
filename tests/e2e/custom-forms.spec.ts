import { expect, test } from "@playwright/test";
import {
  fillProfileCustomDepositForm,
  fillPureCustomDepositForm,
  fillTarotCustomDepositForm,
  login,
  proceedToCheckoutFromCart,
  submitAtmCustomDepositCheckout,
} from "./helpers";

async function getWristInput(
  page: import("@playwright/test").Page,
  path: string
) {
  await page.goto(path);
  if (path === "/custom/form-b") {
    await page.getByRole("button", { name: /財富密碼/ }).click();
  }
  return page.locator('input[type="number"]').first();
}

async function expectDepositCheckoutWithoutShipping(
  page: import("@playwright/test").Page
) {
  await expect(page.locator("body")).toContainText("購買人資訊");
  await expect(page.locator("body")).toContainText("付款方式");
  await expect(page.locator("body")).not.toContainText("配送地區");
  await expect(page.locator("body")).not.toContainText("配送方式");
  await expect(page.locator("body")).not.toContainText("收件地址");
  await expect(page.locator("body")).not.toContainText("運費");
}

test("custom service page links to every consultation form", async ({
  page,
}) => {
  await page.goto("/custom");

  for (const path of [
    "/custom/form",
    "/custom/form-b",
    "/custom/form-c",
    "/custom/form-d",
  ]) {
    await page.goto(path);
    await expect(page.locator("body")).toContainText(/報名表單|付完訂金/);
    await expect(page.locator("body")).toContainText("確認");
  }
});

test("all four custom forms constrain wrist size to 13 through 19 cm", async ({
  page,
}) => {
  for (const path of [
    "/custom/form",
    "/custom/form-b",
    "/custom/form-c",
    "/custom/form-d",
  ]) {
    const wristInput = await getWristInput(page, path);
    await expect(wristInput).toHaveAttribute("min", "13");
    await expect(wristInput).toHaveAttribute("max", "19");
    await expect(wristInput).toHaveAttribute("step", "0.5");
  }
});

test("custom forms offer add-ons for the other three custom services", async ({
  page,
}) => {
  const cases = [
    { path: "/custom/form", current: "純客製水晶手鍊" },
    {
      path: "/custom/form-b",
      current: "塔羅 × 水晶手鍊",
      setup: async () => page.getByRole("button", { name: /財富密碼/ }).click(),
    },
    { path: "/custom/form-c", current: "脈輪檢測 × 水晶手鍊" },
    { path: "/custom/form-d", current: "生命靈數 × 水晶手鍊" },
  ];

  for (const item of cases) {
    await page.goto(item.path);
    await item.setup?.();

    const addonSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "想一併選擇其他客製化嗎？" }),
    });

    await expect(addonSection).toBeVisible();
    await expect(addonSection).not.toContainText(item.current);

    for (const option of [
      "純客製水晶手鍊",
      "塔羅 × 水晶手鍊",
      "脈輪檢測 × 水晶手鍊",
      "生命靈數 × 水晶手鍊",
    ]) {
      if (option !== item.current) {
        await expect(addonSection).toContainText(option);
      }
    }

    await addonSection.getByRole("button").first().click();
    await expect(addonSection).toContainText(
      "已選擇 1 項其他客製服務，請填寫以下完整表單。"
    );
    for (const imageName of [
      "金飾",
      "銀飾",
      "珠框銀管參考1",
      "珠框銀管參考2",
      "龍蝦扣",
      "磁扣",
      "彈力繩",
      "吊飾加掛示意",
    ]) {
      await expect(
        addonSection.getByRole("img", { name: imageName })
      ).toBeVisible();
    }
  }
});

async function fillAddonBraceletFields(
  addonForm: import("@playwright/test").Locator,
  wristSize: string,
  lineId: string
) {
  await addonForm
    .getByPlaceholder("例如：招財、愛情、療癒、保護氣場……")
    .fill("E2E 一併方案功效");
  await addonForm.locator('input[type="number"]').fill(wristSize);
  await addonForm.getByRole("button", { name: "剛好" }).click();
  await addonForm.getByRole("button", { name: "都可以" }).click();
  await addonForm.getByRole("button", { name: "不要" }).first().click();
  await addonForm.getByRole("button", { name: "不要" }).nth(1).click();
  await addonForm.getByRole("button", { name: "彈力繩" }).click();
  await addonForm.getByRole("button", { name: "不要" }).nth(2).click();
  await addonForm
    .getByPlaceholder("例如：@your_ig_handle 或 LINE ID")
    .fill(lineId);
}

test("pure custom form adds selected custom option products in one submit", async ({
  page,
}) => {
  await page.goto("/custom/form");
  await page
    .locator("textarea")
    .first()
    .fill("E2E 測試：希望提升專注力與穩定情緒");
  await page.locator('input[type="number"]').fill("13");
  await page.getByRole("button", { name: /剛好/ }).click();
  await page.getByRole("button", { name: "都可以" }).click();
  await page
    .locator("section")
    .filter({ hasText: "銀管" })
    .getByRole("button", { name: "不要" })
    .first()
    .click();
  await page
    .locator("section")
    .filter({ hasText: "珠框" })
    .getByRole("button", { name: "不要" })
    .last()
    .click();
  await page.getByRole("button", { name: /彈力繩/ }).click();
  await page
    .locator("section")
    .filter({ hasText: "要加吊飾嗎" })
    .getByRole("button", { name: "不要" })
    .click();
  await page.getByLabel("Instagram 帳號 / LINE ID").fill("e2e_line_id");

  const addonSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "想一併選擇其他客製化嗎？" }),
  });
  await addonSection.getByRole("button", { name: /塔羅 × 水晶手鍊/ }).click();
  await addonSection
    .getByRole("button", { name: /脈輪檢測 × 水晶手鍊/ })
    .click();

  const tarotSupplement = page.getByTestId("custom-addon-full-form-tarot");
  await tarotSupplement.getByRole("button", { name: /財富密碼/ }).click();
  await expect(tarotSupplement).toContainText("財富密碼 ── 占卜內容");
  await expect(tarotSupplement).toContainText("求財面對的阻礙");
  await tarotSupplement
    .getByPlaceholder("請填寫真實姓名")
    .fill("E2E 塔羅一併客戶");
  await tarotSupplement.getByPlaceholder("例如：1995/08/22").fill("1995/08/22");
  await fillAddonBraceletFields(tarotSupplement, "15", "e2e_tarot_addon_line");

  const chakraSupplement = page.getByTestId("custom-addon-full-form-chakra");
  await chakraSupplement
    .getByPlaceholder("請填寫真實姓名")
    .fill("E2E 脈輪一併客戶");
  await chakraSupplement
    .getByPlaceholder("例如：1995/08/22")
    .fill("1994/06/18");
  await fillAddonBraceletFields(
    chakraSupplement,
    "16",
    "e2e_chakra_addon_line"
  );

  await page.getByRole("button", { name: /確認，加入購物車/ }).click();

  await expect(page.getByRole("heading", { name: /購物袋/ })).toBeVisible();
  await expect(page.locator("body")).toContainText("客製化商品");
  await expect(page.locator("body")).toContainText("塔羅 × 水晶手鍊客製化商品");
  await expect(page.locator("body")).toContainText(
    "脈輪檢測 × 水晶手鍊客製化商品"
  );
});

test("pure custom form blocks a legacy wrist size below 13 cm", async ({
  page,
}) => {
  await page.goto("/custom/form");
  await page.locator("textarea").first().fill("E2E 手圍邊界驗證");
  await page.locator('input[type="number"]').fill("12.5");
  await page.getByRole("button", { name: /確認，加入購物車/ }).click();

  await expect(page.locator("body")).toContainText(
    "手圍尺寸請輸入 13 至 19 cm"
  );
  await expect(page).toHaveURL(/\/custom\/form$/);
});

test("pure custom form adds consultation note to cart before checkout", async ({
  page,
}) => {
  await fillPureCustomDepositForm(page, { proceedToCheckout: false });
  await expect(page).toHaveURL(/\/custom\/form$/);
  await expect(page.getByRole("heading", { name: /購物袋/ })).toBeVisible();
  await expect(page.locator("body")).toContainText(
    "購買 2 件商品享國內免運，目前還差 1 件"
  );
  await proceedToCheckoutFromCart(page);
  await expect(page.locator("body")).toContainText("客製化商品");
  await expectDepositCheckoutWithoutShipping(page);
  await expect(page.locator("body")).toContainText("訂單摘要");
  await expect(page.locator("body")).toContainText("NT$ 500");
});

async function expectConsultationNoteInAdmin(
  page: import("@playwright/test").Page,
  orderNo: string,
  expectedText: string
) {
  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);
  await page.getByText(orderNo).click();
  await expect(page.locator("body")).toContainText("客製化諮詢內容");
  await expect(page.locator("body")).toContainText(expectedText);
}

test("tarot custom form creates an ATM deposit order with its consultation note", async ({
  page,
}) => {
  await fillTarotCustomDepositForm(page);
  await expectDepositCheckoutWithoutShipping(page);
  const orderNo = await submitAtmCustomDepositCheckout(
    page,
    `e2e-tarot-${Date.now()}@example.com`
  );

  await expectConsultationNoteInAdmin(page, orderNo, "占卜主題：財富密碼");
  await expect(page.locator("body")).toContainText("E2E 塔羅客戶");
});

test("chakra custom form creates an ATM deposit order with its consultation note", async ({
  page,
}) => {
  await fillProfileCustomDepositForm(
    page,
    "/custom/form-c",
    "脈輪檢測 × 水晶手鍊客製化商品",
    "E2E 脈輪客戶",
    "19"
  );
  await expectDepositCheckoutWithoutShipping(page);
  const orderNo = await submitAtmCustomDepositCheckout(
    page,
    `e2e-chakra-${Date.now()}@example.com`
  );

  await expectConsultationNoteInAdmin(
    page,
    orderNo,
    "【脈輪檢測 × 水晶手鍊諮詢表單】"
  );
  await expect(page.locator("body")).toContainText("E2E 脈輪客戶");
});

test("numerology custom form creates an ATM deposit order with its consultation note", async ({
  page,
}) => {
  await fillProfileCustomDepositForm(
    page,
    "/custom/form-d",
    "生命靈數 × 水晶手鍊客製化商品",
    "E2E 靈數客戶",
    "13"
  );
  await expectDepositCheckoutWithoutShipping(page);
  const orderNo = await submitAtmCustomDepositCheckout(
    page,
    `e2e-numerology-${Date.now()}@example.com`
  );

  await expectConsultationNoteInAdmin(
    page,
    orderNo,
    "【生命靈數 × 水晶手鍊諮詢表單】"
  );
  await expect(page.locator("body")).toContainText("E2E 靈數客戶");
});

test("multiple custom products in one order keep every consultation note", async ({
  page,
}) => {
  await fillPureCustomDepositForm(page, { proceedToCheckout: false });
  await fillProfileCustomDepositForm(
    page,
    "/custom/form-d",
    "生命靈數 × 水晶手鍊客製化商品",
    "E2E 多客製靈數客戶",
    "14",
    { proceedToCheckout: false }
  );
  await proceedToCheckoutFromCart(page);
  await expectDepositCheckoutWithoutShipping(page);
  await expect(page.locator("body")).toContainText("客製化商品");
  await expect(page.locator("body")).toContainText(
    "生命靈數 × 水晶手鍊客製化商品"
  );

  const orderNo = await submitAtmCustomDepositCheckout(
    page,
    `e2e-multi-custom-${Date.now()}@example.com`
  );

  await expectConsultationNoteInAdmin(
    page,
    orderNo,
    "【純客製水晶手鍊諮詢表單】"
  );
  await expect(page.locator("body")).toContainText(
    "E2E 測試：希望提升專注力與穩定情緒"
  );
  await expect(page.locator("body")).toContainText(
    "【生命靈數 × 水晶手鍊諮詢表單】"
  );
  await expect(page.locator("body")).toContainText("E2E 多客製靈數客戶");
});

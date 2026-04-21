/**
 * 綠界 ECPay 金流工具函式
 *
 * CheckMacValue 計算規則（依官方文件）：
 * 1. 所有參數依 key 字母順序排序（大小寫不敏感）
 * 2. 組合成 HashKey=xxx&param1=val1&...&HashIV=xxx
 * 3. 整串做 encodeURIComponent（.NET 規格）
 * 4. 依 urlencode 轉換表還原特定字元：%2d→- %5f→_ %2e→. %21→! %2a→* %28→( %29→)
 *    並將空格的 %20 改為 +
 * 5. 轉小寫
 * 6. SHA256 → 轉大寫
 */
import crypto from "crypto";
import { ENV } from "./_core/env";

// 正式環境憑證（從 ENV 讀取，確保正式環境正確注入）
// 沙盒 fallback 僅供本地開發測試用
const isProduction = ENV.isProduction;

export const ECPAY_CONFIG = {
  MerchantID: ENV.ecpayMerchantId || "3002607",
  HashKey: ENV.ecpayHashKey || "pwFHCqoQZGmho4w6",
  HashIV: ENV.ecpayHashIV || "EkRm7iFT261dpevs",
  // 永遠使用正式端點（憑證是正式帳號）
  PaymentURL: "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5",
  QueryURL: "https://payment.ecpay.com.tw/Cashier/QueryTradeInfo/V5",
};

/**
 * 綠界規格的 URL encode（模擬 .NET HttpUtility.UrlEncode）
 * encodeURIComponent 後，依官方轉換表還原特定字元，並將空格改為 +
 */
function ecpayUrlEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/%20/g, "+")   // 空格 → +
    .replace(/%2D/gi, "-")  // %2d → -
    .replace(/%5F/gi, "_")  // %5f → _
    .replace(/%2E/gi, ".")  // %2e → .
    .replace(/%21/gi, "!")  // %21 → !
    .replace(/%2A/gi, "*")  // %2a → *
    .replace(/%28/gi, "(")  // %28 → (
    .replace(/%29/gi, ")"); // %29 → )
}

/**
 * 產生綠界 CheckMacValue（SHA256）
 * 注意：傳入的 params 值不應預先 encode，此函式內部會統一處理
 */
export function generateCheckMacValue(params: Record<string, string>): string {
  // 1. 依 key 字母順序排序（大小寫不敏感，使用 localeCompare）
  const sortedKeys = Object.keys(params).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  // 2. 組合字串：HashKey=xxx&param1=val1&...&HashIV=xxx
  const raw =
    `HashKey=${ECPAY_CONFIG.HashKey}&` +
    sortedKeys.map((k) => `${k}=${params[k]}`).join("&") +
    `&HashIV=${ECPAY_CONFIG.HashIV}`;

  console.log("[ECPay] Raw string for CheckMacValue:", raw);

  // 3. 整串做 URL encode（綠界 .NET 規格）
  const encoded = ecpayUrlEncode(raw).toLowerCase();

  console.log("[ECPay] Encoded string:", encoded);

  // 4. SHA256 → 大寫
  const hash = crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();

  console.log("[ECPay] CheckMacValue:", hash);

  return hash;
}

/**
 * 驗證綠界回傳的 CheckMacValue
 */
export function verifyCheckMacValue(params: Record<string, string>): boolean {
  const { CheckMacValue, ...rest } = params;
  if (!CheckMacValue) return false;
  const expected = generateCheckMacValue(rest);
  console.log("[ECPay Verify] Expected:", expected, "Got:", CheckMacValue);
  return expected === CheckMacValue;
}

/**
 * 產生唯一的商店訂單編號（MerchantTradeNo）
 * 格式：CA + 時間戳 + 隨機4碼，最多20字元
 */
export function generateMerchantTradeNo(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CA${ts}${rand}`.substring(0, 20);
}

/**
 * 格式化綠界要求的日期時間格式：yyyy/MM/dd HH:mm:ss
 */
export function formatECPayDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * 建立信用卡付款的表單參數
 * 注意：TradeDesc 不應在此 encode，generateCheckMacValue 會統一處理
 */
export function buildCreditPaymentParams(opts: {
  merchantTradeNo: string;
  tradeDesc: string;
  itemName: string;
  totalAmount: number;
  returnURL: string;
  orderResultURL: string;
  clientBackURL: string;
}): Record<string, string> {
  const params: Record<string, string> = {
    MerchantID: ECPAY_CONFIG.MerchantID,
    MerchantTradeNo: opts.merchantTradeNo,
    MerchantTradeDate: formatECPayDate(new Date()),
    PaymentType: "aio",
    TotalAmount: String(opts.totalAmount),
    TradeDesc: opts.tradeDesc, // 不預先 encode！
    ItemName: opts.itemName,
    ReturnURL: opts.returnURL,
    OrderResultURL: opts.orderResultURL,
    ClientBackURL: opts.clientBackURL,
    ChoosePayment: "Credit",
    EncryptType: "1",
  };

  params.CheckMacValue = generateCheckMacValue(params);
  return params;
}

/**
 * 建立超商代碼付款的表單參數
 * 注意：TradeDesc 不應在此 encode，generateCheckMacValue 會統一處理
 */
export function buildCVSPaymentParams(opts: {
  merchantTradeNo: string;
  tradeDesc: string;
  itemName: string;
  totalAmount: number;
  returnURL: string;
  orderResultURL: string;
  clientBackURL: string;
  storeExpireDate?: number;
}): Record<string, string> {
  const params: Record<string, string> = {
    MerchantID: ECPAY_CONFIG.MerchantID,
    MerchantTradeNo: opts.merchantTradeNo,
    MerchantTradeDate: formatECPayDate(new Date()),
    PaymentType: "aio",
    TotalAmount: String(opts.totalAmount),
    TradeDesc: opts.tradeDesc, // 不預先 encode！
    ItemName: opts.itemName,
    ReturnURL: opts.returnURL,
    OrderResultURL: opts.orderResultURL,
    ClientBackURL: opts.clientBackURL,
    ChoosePayment: "CVS",
    EncryptType: "1",
    StoreExpireDate: String(opts.storeExpireDate ?? 10080), // 預設7天
  };

  params.CheckMacValue = generateCheckMacValue(params);
  return params;
}

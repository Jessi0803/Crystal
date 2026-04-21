/**
 * 綠界 ECPay 物流工具函式
 * 支援：超商取貨（7-11/全家）、宅配（黑貓）
 *
 * 官方文件：https://developers.ecpay.com.tw/?p=7298
 */
import crypto from "crypto";
import { ENV } from "./_core/env";

// 物流憑證（從 ENV 讀取，確保正式環境正確注入）
// 沙盒 fallback 僅供本地開發測試用
const isProduction = ENV.isProduction;
// 判斷是否使用沙盒：只有在明確設定 ECPAY_LOGISTICS_SANDBOX=true 時才用沙盒
// 預設使用正式環境（因為憑證是正式帳號）
const useLogisticsSandbox = process.env.ECPAY_LOGISTICS_SANDBOX === "true";

export const ECPAY_LOGISTICS_CONFIG = {
  MerchantID: ENV.ecpayLogisticsMerchantId || "2000132",
  HashKey: ENV.ecpayLogisticsHashKey || "5294y06JbISpM5x9",
  HashIV: ENV.ecpayLogisticsHashIV || "v77hoKGq4kWxNNIS",
  // 預設使用正式端點；只有明確設定 ECPAY_LOGISTICS_SANDBOX=true 才用沙盒
  BaseURL: useLogisticsSandbox
    ? "https://logistics-stage.ecpay.com.tw"
    : "https://logistics.ecpay.com.tw",
  MapURL: useLogisticsSandbox
    ? "https://logistics-stage.ecpay.com.tw/Express/map"
    : "https://logistics.ecpay.com.tw/Express/map",
  CreateURL: useLogisticsSandbox
    ? "https://logistics-stage.ecpay.com.tw/Express/Create"
    : "https://logistics.ecpay.com.tw/Express/Create",
  QueryURL: useLogisticsSandbox
    ? "https://logistics-stage.ecpay.com.tw/Helper/QueryLogisticsTradeInfo/V2"
    : "https://logistics.ecpay.com.tw/Helper/QueryLogisticsTradeInfo/V2",
};

/**
 * 綠界規格的 URL encode（模擬 .NET HttpUtility.UrlEncode）
 */
function ecpayUrlEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/%20/g, "+")
    .replace(/%2D/gi, "-")
    .replace(/%5F/gi, "_")
    .replace(/%2E/gi, ".")
    .replace(/%21/gi, "!")
    .replace(/%2A/gi, "*")
    .replace(/%28/gi, "(")
    .replace(/%29/gi, ")");
}

/**
 * 產生 CheckMacValue（MD5）
 * 物流 API 使用 MD5，與金流 API（SHA256）不同
 * 參考：https://developers.ecpay.com.tw/7424/
 */
export function generateLogisticsCheckMacValue(
  params: Record<string, string>,
  hashKey: string = ECPAY_LOGISTICS_CONFIG.HashKey,
  hashIV: string = ECPAY_LOGISTICS_CONFIG.HashIV
): string {
  const sortedKeys = Object.keys(params).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  const raw =
    `HashKey=${hashKey}&` +
    sortedKeys.map((k) => `${k}=${params[k]}`).join("&") +
    `&HashIV=${hashIV}`;

  const encoded = ecpayUrlEncode(raw).toLowerCase();
  return crypto.createHash("md5").update(encoded).digest("hex").toUpperCase();
}

/**
 * 驗證綠界物流回傳的 CheckMacValue
 */
export function verifyLogisticsCheckMacValue(params: Record<string, string>): boolean {
  const { CheckMacValue, ...rest } = params;
  if (!CheckMacValue) return false;
  const expected = generateLogisticsCheckMacValue(rest);
  return expected === CheckMacValue;
}

/**
 * 格式化綠界要求的日期時間格式：yyyy/MM/dd HH:mm:ss
 */
function formatECPayDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * 產生超商選店地圖的 POST 表單參數
 * 客戶選完門市後，綠界會 POST 到 serverReplyURL
 */
export function buildCVSMapParams(opts: {
  logisticsMerchantTradeNo: string;
  logisticsSubType: "UNIMARTC2C" | "FAMIC2C"; // 7-11 C2C or 全家 C2C（店到店）
  serverReplyURL: string; // 接收選店結果的後端 URL
  clientReplyURL?: string; // 選完後導回的前端 URL（可選）
  isCollection?: "N" | "Y"; // 是否代收貨款（超商取貨付款），預設 N
}): Record<string, string> {
  const params: Record<string, string> = {
    MerchantID: ECPAY_LOGISTICS_CONFIG.MerchantID,
    MerchantTradeNo: opts.logisticsMerchantTradeNo,
    LogisticsType: "CVS",
    LogisticsSubType: opts.logisticsSubType,
    IsCollection: opts.isCollection ?? "N",
    ServerReplyURL: opts.serverReplyURL,
    ...(opts.clientReplyURL ? { ClientReplyURL: opts.clientReplyURL } : {}),
  };

  params.CheckMacValue = generateLogisticsCheckMacValue(params);
  return params;
}

/**
 * 建立超商物流訂單（呼叫綠界 API）
 * 回傳：{ success, allPayLogisticsId, cvsPaymentNo, cvsValidationNo, rtnMsg }
 */
export async function createCVSLogisticsOrder(opts: {
  logisticsMerchantTradeNo: string;
  goodsName: string;
  goodsAmount: number;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  receiverStoreID: string;
  logisticsSubType: "UNIMARTC2C" | "FAMIC2C";
  serverReplyURL: string;
  isCollection?: "N" | "Y";
  collectionAmount?: number;
}) {
  const params: Record<string, string> = {
    MerchantID: ECPAY_LOGISTICS_CONFIG.MerchantID,
    MerchantTradeNo: opts.logisticsMerchantTradeNo,
    MerchantTradeDate: formatECPayDate(new Date()),
    LogisticsType: "CVS",
    LogisticsSubType: opts.logisticsSubType,
    GoodsAmount: String(opts.goodsAmount),
    GoodsName: opts.goodsName,
    SenderName: opts.senderName,
    SenderCellPhone: opts.senderPhone,
    ReceiverName: opts.receiverName,
    ReceiverCellPhone: opts.receiverPhone,
    ReceiverStoreID: opts.receiverStoreID,
    IsCollection: opts.isCollection ?? "N",
    ServerReplyURL: opts.serverReplyURL,
  };

  if (opts.isCollection === "Y" && opts.collectionAmount) {
    params.CollectionAmount = String(opts.collectionAmount);
  }

  params.CheckMacValue = generateLogisticsCheckMacValue(params);

  // 呼叫綠界 API
  const formBody = new URLSearchParams(params).toString();
  const response = await fetch(ECPAY_LOGISTICS_CONFIG.CreateURL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody,
  });

  const text = await response.text();
  console.log("[ECPay Logistics] Create CVS response:", text);

  // 解析回傳（格式：RtnCode|key=value|key=value|...）
  // 第一個元素是 RtnCode（純數字，沒有 key=value 格式）
  const result: Record<string, string> = {};
  const parts = text.split("|");
  // 第一個 part 可能是純 RtnCode 數字，也可能是 key=value
  const firstPart = parts[0]?.trim();
  let rtnCode: string;
  if (firstPart && !firstPart.includes("=")) {
    // 純數字 RtnCode
    rtnCode = firstPart;
    parts.slice(1).forEach((pair) => {
      const [k, ...v] = pair.split("=");
      if (k) result[k.trim()] = v.join("=").trim();
    });
  } else {
    // 全部都是 key=value 格式
    parts.forEach((pair) => {
      const [k, ...v] = pair.split("=");
      if (k) result[k.trim()] = v.join("=").trim();
    });
    rtnCode = result["RtnCode"] ?? "";
  }
  const success = rtnCode === "1" || result["RtnCode"] === "300" || rtnCode === "300";

  return {
    success,
    allPayLogisticsId: result["AllPayLogisticsID"] ?? "",
    cvsPaymentNo: result["CVSPaymentNo"] ?? "",
    cvsValidationNo: result["CVSValidationNo"] ?? "",
    rtnMsg: result["RtnMsg"] ?? text,
    raw: result,
  };
}

/**
 * 建立宅配物流訂單（黑貓 TCAT）
 */
export async function createHomeLogisticsOrder(opts: {
  logisticsMerchantTradeNo: string;
  goodsName: string;
  goodsAmount: number;
  senderName: string;
  senderPhone: string;
  senderZipCode?: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverZipCode?: string;
  receiverAddress: string;
  serverReplyURL: string;
  schedulePickupTime?: "1" | "2" | "3" | "4"; // 1=不限, 2=上午, 3=下午, 4=晚上
  temperature?: "0001" | "0002" | "0003"; // 0001=常溫, 0002=冷藏, 0003=冷凍
}) {
  const params: Record<string, string> = {
    MerchantID: ECPAY_LOGISTICS_CONFIG.MerchantID,
    MerchantTradeNo: opts.logisticsMerchantTradeNo,
    MerchantTradeDate: formatECPayDate(new Date()),
    LogisticsType: "HOME",
    LogisticsSubType: "TCAT",
    GoodsAmount: String(opts.goodsAmount),
    GoodsName: opts.goodsName,
    SenderName: opts.senderName,
    SenderPhone: opts.senderPhone,
    SenderZipCode: opts.senderZipCode ?? process.env.SENDER_ZIPCODE ?? "",
    SenderAddress: opts.senderAddress,
    ReceiverName: opts.receiverName,
    ReceiverPhone: opts.receiverPhone,
    ReceiverZipCode: opts.receiverZipCode ?? "",
    ReceiverAddress: opts.receiverAddress,
    Temperature: opts.temperature ?? "0001",
    Specification: "0001", // 60cm
    ScheduledPickupTime: opts.schedulePickupTime ?? "1",
    ScheduledDeliveryTime: "1",
    ServerReplyURL: opts.serverReplyURL,
  };

  // Debug: 印出傳送前的參數
  console.log("[ECPay Logistics] MerchantID:", ECPAY_LOGISTICS_CONFIG.MerchantID);
  console.log("[ECPay Logistics] HashKey:", ECPAY_LOGISTICS_CONFIG.HashKey);
  console.log("[ECPay Logistics] HashIV:", ECPAY_LOGISTICS_CONFIG.HashIV);
  console.log("[ECPay Logistics] CreateURL:", ECPAY_LOGISTICS_CONFIG.CreateURL);
  console.log("[ECPay Logistics] Params before CheckMacValue:", JSON.stringify(params, null, 2));

  // 計算 CheckMacValue 前先印出排序後的字串
  const sortedKeys = Object.keys(params).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const rawStr = `HashKey=${ECPAY_LOGISTICS_CONFIG.HashKey}&` +
    sortedKeys.map((k) => `${k}=${params[k]}`).join("&") +
    `&HashIV=${ECPAY_LOGISTICS_CONFIG.HashIV}`;
  console.log("[ECPay Logistics] Raw string for CheckMacValue:", rawStr);

  params.CheckMacValue = generateLogisticsCheckMacValue(params);
  console.log("[ECPay Logistics] CheckMacValue:", params.CheckMacValue);

  const formBody = new URLSearchParams(params).toString();
  console.log("[ECPay Logistics] FormBody:", formBody);
  const response = await fetch(ECPAY_LOGISTICS_CONFIG.CreateURL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody,
  });

  const text = await response.text();
  console.log("[ECPay Logistics] Create HOME response:", text);

  const result: Record<string, string> = {};
  text.split("|").forEach((pair) => {
    const [k, ...v] = pair.split("=");
    if (k) result[k.trim()] = v.join("=").trim();
  });

  const rtnCode = result["RtnCode"] ?? "";
  const success = rtnCode === "1";

  return {
    success,
    allPayLogisticsId: result["AllPayLogisticsID"] ?? "",
    bookingNote: result["BookingNote"] ?? "",
    rtnMsg: result["RtnMsg"] ?? text,
    raw: result,
  };
}

/**
 * 查詢物流訂單狀態
 */
export async function queryLogisticsStatus(opts: {
  logisticsMerchantTradeNo: string;
  allPayLogisticsId: string;
  logisticsType: "CVS" | "HOME";
}) {
  const params: Record<string, string> = {
    MerchantID: ECPAY_LOGISTICS_CONFIG.MerchantID,
    MerchantTradeNo: opts.logisticsMerchantTradeNo,
    TimeStamp: String(Math.floor(Date.now() / 1000)),
  };

  params.CheckMacValue = generateLogisticsCheckMacValue(params);

  const formBody = new URLSearchParams(params).toString();
  const response = await fetch(ECPAY_LOGISTICS_CONFIG.QueryURL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody,
  });

  const text = await response.text();
  const result: Record<string, string> = {};
  text.split("|").forEach((pair) => {
    const [k, ...v] = pair.split("=");
    if (k) result[k.trim()] = v.join("=").trim();
  });

  return result;
}

/**
 * 產生宅配託運單列印 URL（綠界 PrintTradeDoc）
 * 回傳可直接在瀏覽器開啟的 PDF URL
 */
export function buildPrintTradeDocURL(opts: {
  allPayLogisticsId: string;
  logisticsType?: "HOME";
}): string {
  const params: Record<string, string> = {
    MerchantID: ECPAY_LOGISTICS_CONFIG.MerchantID,
    AllPayLogisticsID: opts.allPayLogisticsId,
    LogisticsType: opts.logisticsType ?? "HOME",
  };

  params.CheckMacValue = generateLogisticsCheckMacValue(params);

  const query = new URLSearchParams(params).toString();
  return `${ECPAY_LOGISTICS_CONFIG.BaseURL}/Express/PrintTradeDoc?${query}`;
}

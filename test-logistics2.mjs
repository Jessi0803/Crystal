/**
 * 完整物流 API 測試腳本
 * 印出完整的 request body 和 CheckMac 計算過程
 */
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const HashKey = process.env.ECPAY_LOGISTICS_HASH_KEY || "psqhkzVUhRFuC02v";
const HashIV = process.env.ECPAY_LOGISTICS_HASH_IV || "kRSXuyUHx4Xpi89w";
const MerchantID = process.env.ECPAY_LOGISTICS_MERCHANT_ID || "3096116";

console.log("HashKey:", HashKey);
console.log("HashIV:", HashIV);
console.log("MerchantID:", MerchantID);

function ecpayUrlEncode(str) {
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

function generateCheckMac(params) {
  const sortedKeys = Object.keys(params).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  const raw =
    `HashKey=${HashKey}&` +
    sortedKeys.map((k) => `${k}=${params[k]}`).join("&") +
    `&HashIV=${HashIV}`;

  console.log("\n=== Raw string before encode ===");
  console.log(raw);

  const encoded = ecpayUrlEncode(raw).toLowerCase();
  console.log("\n=== After URL encode + lowercase ===");
  console.log(encoded);

  const mac = crypto.createHash("md5").update(encoded).digest("hex").toUpperCase();
  console.log("\n=== CheckMacValue (MD5) ===");
  console.log(mac);
  return mac;
}

// 使用真實訂單資料
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const merchantTradeDate = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

const params = {
  MerchantID,
  MerchantTradeNo: `L${Date.now()}`,
  MerchantTradeDate: merchantTradeDate,
  LogisticsType: "CVS",
  LogisticsSubType: "UNIMARTC2C",
  GoodsAmount: "16",
  GoodsName: "椛Crystal能量水晶",
  SenderName: "椛Crystal",
  SenderCellPhone: "0900000000",
  ReceiverName: "J先生",
  ReceiverCellPhone: "0981357255",
  ReceiverStoreID: "258135",
  IsCollection: "N",
  ServerReplyURL: "https://www.goodaytarot.com/api/ecpay/logistics-notify",
};

params.CheckMacValue = generateCheckMac(params);

console.log("\n=== Full params ===");
console.log(JSON.stringify(params, null, 2));

// 用 URLSearchParams 組成 request body
const formBody = new URLSearchParams(params).toString();
console.log("\n=== Request body (URLSearchParams) ===");
console.log(formBody);

// 送出請求
console.log("\n=== Sending request to ECPay ===");
const response = await fetch("https://logistics.ecpay.com.tw/Express/Create", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: formBody,
});

const text = await response.text();
console.log("\n=== ECPay Response ===");
console.log(text);

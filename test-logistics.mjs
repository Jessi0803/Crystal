import crypto from 'crypto';

const MERCHANT_ID = process.env.ECPAY_LOGISTICS_MERCHANT_ID || '3096116';
const HASH_KEY = process.env.ECPAY_LOGISTICS_HASH_KEY;
const HASH_IV = process.env.ECPAY_LOGISTICS_HASH_IV;

console.log('MerchantID:', MERCHANT_ID);
console.log('HashKey:', JSON.stringify(HASH_KEY));
console.log('HashIV:', JSON.stringify(HASH_IV));

function ecpayUrlEncode(str) {
  return encodeURIComponent(str)
    .replace(/%20/g, '+')
    .replace(/%2D/gi, '-')
    .replace(/%5F/gi, '_')
    .replace(/%2E/gi, '.')
    .replace(/%21/gi, '!')
    .replace(/%2A/gi, '*')
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')');
}

function generateCheckMac(params) {
  const sortedKeys = Object.keys(params).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const raw =
    `HashKey=${HASH_KEY}&` +
    sortedKeys.map(k => `${k}=${params[k]}`).join('&') +
    `&HashIV=${HASH_IV}`;
  const encoded = ecpayUrlEncode(raw).toLowerCase();
  return crypto.createHash('sha256').update(encoded).digest('hex').toUpperCase();
}

// 測試參數（用真實訂單資料）
const tradeNo = `L${Date.now()}`;
const now = new Date();
const pad = n => String(n).padStart(2, '0');
const tradeDate = `${now.getFullYear()}/${pad(now.getMonth()+1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

// 測試不同的 CheckMac 計算方式
function ecpayUrlEncode1(str) {
  // 原本的方式
  return encodeURIComponent(str)
    .replace(/%20/g, '+')
    .replace(/%2D/gi, '-')
    .replace(/%5F/gi, '_')
    .replace(/%2E/gi, '.')
    .replace(/%21/gi, '!')
    .replace(/%2A/gi, '*')
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')');
}

function generateCheckMac2(params) {
  // 方式2：不做特殊字元還原，純 encodeURIComponent
  const sortedKeys = Object.keys(params).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const raw =
    `HashKey=${HASH_KEY}&` +
    sortedKeys.map(k => `${k}=${params[k]}`).join('&') +
    `&HashIV=${HASH_IV}`;
  const encoded = encodeURIComponent(raw).toLowerCase();
  return { hash: crypto.createHash('sha256').update(encoded).digest('hex').toUpperCase(), raw, encoded };
}

function generateCheckMac3(params) {
  // 方式3：整串用 encodeURIComponent 後，空格改 +，其他不動
  const sortedKeys = Object.keys(params).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const raw =
    `HashKey=${HASH_KEY}&` +
    sortedKeys.map(k => `${k}=${params[k]}`).join('&') +
    `&HashIV=${HASH_IV}`;
  const encoded = encodeURIComponent(raw).replace(/%20/g, '+').toLowerCase();
  return { hash: crypto.createHash('sha256').update(encoded).digest('hex').toUpperCase(), raw, encoded };
}

const params = {
  MerchantID: MERCHANT_ID,
  MerchantTradeNo: tradeNo,
  MerchantTradeDate: tradeDate,
  LogisticsType: 'CVS',
  LogisticsSubType: 'UNIMARTC2C',
  GoodsAmount: '16',
  GoodsName: 'Crystal',
  SenderName: 'Crystal',
  SenderCellPhone: '0900000000',
  ReceiverName: 'John',
  ReceiverCellPhone: '0981357255',
  ReceiverStoreID: '258135',
  IsCollection: 'N',
  ServerReplyURL: 'https://www.goodaytarot.com/api/ecpay/logistics-notify',
};

params.CheckMacValue = generateCheckMac(params);

console.log('\n=== 送出參數 ===');
console.log(JSON.stringify(params, null, 2));

const formBody = new URLSearchParams(params).toString();
console.log('\n=== Form Body ===');
console.log(formBody);

const response = await fetch('https://logistics.ecpay.com.tw/Express/Create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: formBody,
});

const text = await response.text();
console.log('\n=== 綠界回應 ===');
console.log(text);

// 比較不同 CheckMac 方式
const { CheckMacValue: _, ...paramsWithoutMac } = params;
console.log('\n=== CheckMac 比較 ===');
console.log('方式1 (原本):', generateCheckMac(paramsWithoutMac));
console.log('方式2 (純 encodeURIComponent):', generateCheckMac2(paramsWithoutMac).hash);
console.log('方式3 (空格改+):', generateCheckMac3(paramsWithoutMac).hash);
console.log('\n=== Raw string (encoded) ===');
console.log(generateCheckMac3(paramsWithoutMac).encoded.substring(0, 200));

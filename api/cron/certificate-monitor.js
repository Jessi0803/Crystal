var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
      geminiApiKey: process.env.GEMINI_API_KEY ?? "",
      resendApiKey: process.env.RESEND_API_KEY ?? "",
      // 綠界金流
      ecpayMerchantId: process.env.ECPAY_MERCHANT_ID ?? "",
      ecpayHashKey: process.env.ECPAY_HASH_KEY ?? "",
      ecpayHashIV: process.env.ECPAY_HASH_IV ?? "",
      // 綠界物流
      ecpayLogisticsMerchantId: process.env.ECPAY_LOGISTICS_MERCHANT_ID ?? "",
      ecpayLogisticsHashKey: process.env.ECPAY_LOGISTICS_HASH_KEY ?? "",
      ecpayLogisticsHashIV: process.env.ECPAY_LOGISTICS_HASH_IV ?? ""
    };
  }
});

// shared/customConsultationNote.ts
function formatCustomConsultationNoteForDisplay(note) {
  return String(note ?? "").split(/\r?\n/).filter((line) => !CUSTOM_CONSULTATION_MARKER_RE.test(line.trim())).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
var CUSTOM_CONSULTATION_MARKER_RE;
var init_customConsultationNote = __esm({
  "shared/customConsultationNote.ts"() {
    "use strict";
    CUSTOM_CONSULTATION_MARKER_RE = /^【客製需求(?:開始|結束)：[^】]+】$/;
  }
});

// server/email.ts
var email_exports = {};
__export(email_exports, {
  renderEmailItemRows: () => renderEmailItemRows,
  sendAdminOrderNotificationEmail: () => sendAdminOrderNotificationEmail,
  sendCertificateExpiryAlertEmail: () => sendCertificateExpiryAlertEmail,
  sendCustomFormReminderEmail: () => sendCustomFormReminderEmail,
  sendOrderConfirmEmail: () => sendOrderConfirmEmail,
  sendOrderShippedEmail: () => sendOrderShippedEmail,
  sendPasswordResetEmail: () => sendPasswordResetEmail,
  sendVerificationEmail: () => sendVerificationEmail,
  toEmailImageUrl: () => toEmailImageUrl
});
import { Resend } from "resend";
function getSiteUrl() {
  return process.env.SITE_URL?.trim().replace(/\/$/, "") || "https://goodaytarot.com";
}
function getResend() {
  if (!ENV.resendApiKey) throw new Error("RESEND_API_KEY \u672A\u8A2D\u5B9A");
  return new Resend(ENV.resendApiKey);
}
async function sendVerificationEmail({
  to,
  name,
  verifyUrl
}) {
  const resend = getResend();
  const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e4df;">
        <!-- Header -->
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #f0ece7;text-align:center;">
            <p style="margin:0;font-size:11px;letter-spacing:0.2em;color:#999;text-transform:uppercase;">Crystal Energy</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:300;color:#1a1a1a;letter-spacing:0.08em;">${BRAND_NAME}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:13px;color:#555;">\u89AA\u611B\u7684 ${name}\uFF0C</p>
            <h2 style="margin:0 0 16px;font-size:18px;font-weight:500;color:#1a1a1a;">\u9A57\u8B49\u60A8\u7684 Email</h2>
            <p style="margin:0 0 24px;font-size:13px;color:#666;line-height:1.8;">
              \u611F\u8B1D\u60A8\u52A0\u5165 ${BRAND_NAME}\uFF01\u8ACB\u9EDE\u64CA\u4E0B\u65B9\u6309\u9215\u9A57\u8B49\u60A8\u7684 Email \u5730\u5740\uFF0C\u5B8C\u6210\u5E33\u865F\u555F\u7528\u3002<br>
              \u6B64\u9023\u7D50\u5C07\u65BC <strong>24 \u5C0F\u6642\u5F8C\u5931\u6548</strong>\u3002
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#1a1a1a;">
                  <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:12px;letter-spacing:0.15em;">
                    \u9A57\u8B49 Email
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:11px;color:#999;line-height:1.7;">
              \u82E5\u6309\u9215\u7121\u6CD5\u9EDE\u64CA\uFF0C\u8ACB\u8907\u88FD\u4EE5\u4E0B\u9023\u7D50\u8CBC\u5230\u700F\u89BD\u5668\uFF1A<br>
              <a href="${verifyUrl}" style="color:#b8936a;word-break:break-all;">${verifyUrl}</a>
            </p>
            <p style="margin:16px 0 0;font-size:11px;color:#bbb;">
              \u5982\u679C\u60A8\u6C92\u6709\u7533\u8ACB\u6B64\u5E33\u865F\uFF0C\u8ACB\u5FFD\u7565\u6B64\u5C01\u4FE1\u4EF6\u3002
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0ece7;text-align:center;">
            <p style="margin:0;font-size:10px;color:#bbb;letter-spacing:0.1em;">
              \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${BRAND_NAME} \xB7 \u5929\u7136\u6C34\u6676\u80FD\u91CF\u98FE\u54C1
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return resend.emails.send({
    from: `${BRAND_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: `\u3010${BRAND_NAME}\u3011\u8ACB\u9A57\u8B49\u60A8\u7684 Email`,
    html
  });
}
async function sendPasswordResetEmail({
  to,
  name,
  resetUrl
}) {
  const resend = getResend();
  const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e4df;">
        <!-- Header -->
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #f0ece7;text-align:center;">
            <p style="margin:0;font-size:11px;letter-spacing:0.2em;color:#999;text-transform:uppercase;">Crystal Energy</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:300;color:#1a1a1a;letter-spacing:0.08em;">${BRAND_NAME}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:13px;color:#555;">\u89AA\u611B\u7684 ${name}\uFF0C</p>
            <h2 style="margin:0 0 16px;font-size:18px;font-weight:500;color:#1a1a1a;">\u5BC6\u78BC\u91CD\u8A2D\u8ACB\u6C42</h2>
            <p style="margin:0 0 24px;font-size:13px;color:#666;line-height:1.8;">
              \u6211\u5011\u6536\u5230\u4E86\u60A8\u7684\u5BC6\u78BC\u91CD\u8A2D\u8ACB\u6C42\u3002\u8ACB\u9EDE\u64CA\u4E0B\u65B9\u6309\u9215\u91CD\u8A2D\u60A8\u7684\u5BC6\u78BC\u3002
              \u6B64\u9023\u7D50\u5C07\u65BC <strong>1 \u5C0F\u6642\u5F8C\u5931\u6548</strong>\u3002
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#1a1a1a;">
                  <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:12px;letter-spacing:0.15em;">
                    \u91CD\u8A2D\u5BC6\u78BC
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:11px;color:#999;line-height:1.7;">
              \u82E5\u6309\u9215\u7121\u6CD5\u9EDE\u64CA\uFF0C\u8ACB\u8907\u88FD\u4EE5\u4E0B\u9023\u7D50\u8CBC\u5230\u700F\u89BD\u5668\uFF1A<br>
              <a href="${resetUrl}" style="color:#b8936a;word-break:break-all;">${resetUrl}</a>
            </p>
            <p style="margin:16px 0 0;font-size:11px;color:#bbb;">
              \u5982\u679C\u60A8\u6C92\u6709\u7533\u8ACB\u91CD\u8A2D\u5BC6\u78BC\uFF0C\u8ACB\u5FFD\u7565\u6B64\u5C01\u4FE1\u4EF6\uFF0C\u60A8\u7684\u5E33\u865F\u4E0D\u6703\u6709\u4EFB\u4F55\u8B8A\u52D5\u3002
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0ece7;text-align:center;">
            <p style="margin:0;font-size:10px;color:#bbb;letter-spacing:0.1em;">
              \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${BRAND_NAME} \xB7 \u5929\u7136\u6C34\u6676\u80FD\u91CF\u98FE\u54C1
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return resend.emails.send({
    from: `${BRAND_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: `\u3010${BRAND_NAME}\u3011\u5BC6\u78BC\u91CD\u8A2D\u9023\u7D50`,
    html
  });
}
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function toEmailImageUrl(image) {
  const value = image?.trim();
  if (!value || value.startsWith("data:")) return null;
  if (/^https:\/\//i.test(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return `${getSiteUrl()}${value}`;
  return null;
}
function renderEmailItemRows(items, borderColor = "#f0ece7") {
  const cell = `padding:10px 0;border-bottom:1px solid ${borderColor};font-size:13px;`;
  return items.map((item) => {
    const name = escapeHtml(item.productName);
    const imageUrl = item.subtotal >= 0 ? toEmailImageUrl(item.productImage) : null;
    const thumb = item.subtotal < 0 ? "" : imageUrl ? `<img src="${escapeHtml(imageUrl)}" width="${EMAIL_THUMB_SIZE}" height="${EMAIL_THUMB_SIZE}" alt="${name}" style="display:block;width:${EMAIL_THUMB_SIZE}px;height:${EMAIL_THUMB_SIZE}px;object-fit:cover;border:0;border-radius:6px;background:#f2eae2;">` : `<div style="width:${EMAIL_THUMB_SIZE}px;height:${EMAIL_THUMB_SIZE}px;border-radius:6px;background:#f2eae2;"></div>`;
    const nameCell = thumb ? `<table cellpadding="0" cellspacing="0" role="presentation"><tr>
            <td width="${EMAIL_THUMB_SIZE}" style="padding-right:12px;vertical-align:middle;">${thumb}</td>
            <td style="vertical-align:middle;font-size:13px;color:#333;line-height:1.5;">${name}</td>
          </tr></table>` : name;
    return `
      <tr>
        <td style="${cell}color:#333;">${nameCell}</td>
        <td style="${cell}color:#666;text-align:center;white-space:nowrap;">\xD7 ${item.quantity}</td>
        <td style="${cell}color:#333;text-align:right;white-space:nowrap;">NT$ ${item.subtotal.toLocaleString()}</td>
      </tr>`;
  }).join("");
}
async function sendCertificateExpiryAlertEmail(payload) {
  const resend = getResend();
  const rows = payload.lines.map(
    (line) => `<tr><td style="font-size:13px;color:#1a1a1a;padding:6px 0;border-bottom:1px solid #eee;">${escapeHtml(line)}</td></tr>`
  ).join("");
  const html = `<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background:#faf8f6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;">
    <tr><td style="padding:24px;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;color:#b08968;">CERTIFICATE ALERT</p>
      <h1 style="margin:0 0 16px;font-size:18px;color:#1a1a1a;font-weight:500;">\u7DB2\u57DF\u6191\u8B49\u9700\u8981\u8655\u7406</h1>
      <table role="presentation" width="100%">${rows}</table>
      <p style="margin:16px 0 0;font-size:12px;color:#666;line-height:1.7;">
        \u6191\u8B49\u7531 Vercel \u81EA\u52D5\u7E8C\u671F\u3002\u82E5\u51FA\u73FE\u904E\u671F\u6216\u7121\u6CD5\u9023\u7DDA\uFF0C\u901A\u5E38\u662F\u8A72\u7DB2\u57DF\u6C92\u6709\u7D81\u5728
        Vercel \u5C08\u6848\u5E95\u4E0B\uFF0C\u8ACB\u5230\u5C08\u6848\u7684 Settings \u2192 Domains \u78BA\u8A8D\u3002
      </p>
      <p style="margin:8px 0 0;font-size:12px;color:#999;">\u5269\u9918\u5929\u6578\u4F4E\u65BC ${payload.warningDays} \u5929\u5C31\u6703\u6536\u5230\u9019\u5C01\u4FE1\u3002</p>
    </td></tr>
  </table>
</body></html>`;
  return resend.emails.send({
    from: `${BRAND_NAME} <${FROM_ADDRESS}>`,
    to: OPS_ALERT_EMAIL,
    subject: `\u3010${BRAND_NAME}\u3011\u7DB2\u57DF\u6191\u8B49\u544A\u8B66\uFF08${payload.lines.length} \u9805\uFF09`,
    html
  });
}
async function sendAdminOrderNotificationEmail(payload) {
  const resend = getResend();
  const {
    merchantTradeNo,
    statusLabel,
    statusReason,
    buyerName,
    buyerEmail,
    buyerPhone,
    totalAmount,
    shippingMethod,
    paymentMethod,
    isPreorder,
    isCustomOrder,
    cvsStoreName,
    receiverAddress,
    customerNote,
    items
  } = payload;
  const deliveryInfo = shippingMethod === "home" ? `\u914D\u9001\u5730\u5740\uFF1A${receiverAddress ?? "\u2014"}` : `\u53D6\u8CA8\u9580\u5E02\uFF1A${cvsStoreName ?? "\u2014"}`;
  const itemRows = renderEmailItemRows(items, "#eee");
  const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e4df;">
        <tr>
          <td style="padding:28px 36px 20px;border-bottom:1px solid #f0ece7;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;color:#999;text-transform:uppercase;">Admin Order Notice</p>
            <h1 style="margin:0;font-size:20px;font-weight:500;color:#1a1a1a;">${escapeHtml(statusLabel)}\u8A02\u55AE\u901A\u77E5</h1>
            <p style="margin:10px 0 0;font-size:13px;color:#666;">${escapeHtml(statusReason)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:16px 20px;margin-bottom:22px;">
              <tr><td style="font-size:13px;color:#555;padding:3px 0;">\u8A02\u55AE\u7DE8\u865F\uFF1A<strong style="color:#111;">${escapeHtml(merchantTradeNo)}</strong></td></tr>
              <tr><td style="font-size:13px;color:#555;padding:3px 0;">\u8A02\u55AE\u91D1\u984D\uFF1A<strong style="color:#111;">NT$ ${totalAmount.toLocaleString()}</strong></td></tr>
              <tr><td style="font-size:13px;color:#555;padding:3px 0;">\u4ED8\u6B3E\u65B9\u5F0F\uFF1A${escapeHtml(PAYMENT_LABEL[paymentMethod] ?? paymentMethod)}</td></tr>
              <tr><td style="font-size:13px;color:#555;padding:3px 0;">\u914D\u9001\u65B9\u5F0F\uFF1A${escapeHtml(SHIPPING_LABEL[shippingMethod] ?? shippingMethod)}</td></tr>
              <tr><td style="font-size:13px;color:#555;padding:3px 0;">${escapeHtml(deliveryInfo)}</td></tr>
              ${isPreorder ? `<tr><td style="font-size:13px;color:#9a6a2f;padding:3px 0;">\u5099\u8A3B\uFF1A\u9810\u8CFC\u5546\u54C1</td></tr>` : ""}
              ${isCustomOrder ? `<tr><td style="font-size:13px;color:#9a6a2f;padding:3px 0;">\u5099\u8A3B\uFF1A\u5BA2\u88FD\u5316\u8A02\u55AE</td></tr>` : ""}
            </table>

            <p style="margin:0 0 8px;font-size:12px;color:#999;letter-spacing:0.12em;">\u9867\u5BA2\u8CC7\u8A0A</p>
            <p style="margin:0 0 4px;font-size:13px;color:#555;">\u59D3\u540D\uFF1A${escapeHtml(buyerName)}</p>
            <p style="margin:0 0 4px;font-size:13px;color:#555;">Email\uFF1A${escapeHtml(buyerEmail)}</p>
            <p style="margin:0 0 20px;font-size:13px;color:#555;">\u624B\u6A5F\uFF1A${escapeHtml(buyerPhone)}</p>

            ${customerNote ? `<p style="margin:0 0 20px;font-size:13px;color:#555;line-height:1.7;">\u9867\u5BA2\u5099\u8A3B\uFF1A${escapeHtml(formatCustomConsultationNoteForDisplay(customerNote))}</p>` : ""}

            <p style="margin:0 0 8px;font-size:12px;color:#999;letter-spacing:0.12em;">\u5546\u54C1\u660E\u7D30</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${itemRows}
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return resend.emails.send({
    from: `${BRAND_NAME} <${FROM_ADDRESS}>`,
    to: ADMIN_ORDER_NOTIFICATION_EMAIL,
    subject: `\u3010${BRAND_NAME}\u3011${statusLabel}\u8A02\u55AE\u901A\u77E5 #${merchantTradeNo}`,
    html
  });
}
async function sendOrderConfirmEmail(payload) {
  const resend = getResend();
  const {
    to,
    buyerName,
    merchantTradeNo,
    totalAmount,
    shippingMethod,
    paymentMethod,
    cvsStoreName,
    receiverAddress,
    items
  } = payload;
  const itemRows = renderEmailItemRows(items, "#f0ece7");
  const deliveryInfo = shippingMethod === "home" ? `<p style="margin:4px 0;font-size:13px;color:#555;">\u914D\u9001\u5730\u5740\uFF1A${receiverAddress ?? "\u2014"}</p>` : `<p style="margin:4px 0;font-size:13px;color:#555;">\u53D6\u8CA8\u9580\u5E02\uFF1A${cvsStoreName ?? "\u2014"}</p>`;
  const orderUrl = `${getSiteUrl()}/order/${encodeURIComponent(merchantTradeNo)}`;
  const safeOrderUrl = escapeHtml(orderUrl);
  const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e4df;">
        <!-- Header -->
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #f0ece7;text-align:center;">
            <p style="margin:0;font-size:11px;letter-spacing:0.2em;color:#999;text-transform:uppercase;">Crystal Energy</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:300;color:#1a1a1a;letter-spacing:0.08em;">${BRAND_NAME}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 4px;font-size:13px;color:#555;">\u89AA\u611B\u7684 ${buyerName}\uFF0C</p>
            <h2 style="margin:0 0 20px;font-size:18px;font-weight:500;color:#1a1a1a;">\u611F\u8B1D\u60A8\u7684\u8A02\u8CFC\uFF01</h2>

            <!-- \u8A02\u55AE\u8CC7\u8A0A -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:16px 20px;margin-bottom:24px;">
              <tr>
                <td style="font-size:11px;letter-spacing:0.1em;color:#999;padding-bottom:10px;">\u8A02\u55AE\u8CC7\u8A0A</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#555;padding:2px 0;">\u8A02\u55AE\u7DE8\u865F\uFF1A<strong style="color:#1a1a1a;">${merchantTradeNo}</strong></td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#555;padding:2px 0;">\u4ED8\u6B3E\u65B9\u5F0F\uFF1A${PAYMENT_LABEL[paymentMethod] ?? paymentMethod}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#555;padding:2px 0;">\u914D\u9001\u65B9\u5F0F\uFF1A${SHIPPING_LABEL[shippingMethod] ?? shippingMethod}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#555;padding:2px 0;">${deliveryInfo}</td>
              </tr>
            </table>

            <!-- \u5546\u54C1\u660E\u7D30 -->
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.1em;color:#999;">\u5546\u54C1\u660E\u7D30</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${itemRows}
              <tr>
                <td colspan="2" style="padding:14px 0 0;font-size:13px;font-weight:600;color:#1a1a1a;">\u8A02\u55AE\u7E3D\u8A08</td>
                <td style="padding:14px 0 0;font-size:15px;font-weight:600;color:#1a1a1a;text-align:right;">NT$ ${totalAmount.toLocaleString()}</td>
              </tr>
            </table>

            <table cellpadding="0" cellspacing="0" style="margin:28px 0 18px;">
              <tr>
                <td style="background:#1a1a1a;">
                  <a href="${safeOrderUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:12px;letter-spacing:0.15em;">
                    \u67E5\u770B\u8A02\u55AE
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 20px;font-size:11px;color:#999;line-height:1.7;">
              \u82E5\u6309\u9215\u7121\u6CD5\u9EDE\u64CA\uFF0C\u8ACB\u8907\u88FD\u4EE5\u4E0B\u9023\u7D50\u8CBC\u5230\u700F\u89BD\u5668\uFF1A<br>
              <a href="${safeOrderUrl}" style="color:#b8936a;word-break:break-all;">${safeOrderUrl}</a><br>
              \u82E5\u60A8\u4F7F\u7528\u4E0D\u540C\u88DD\u7F6E\u958B\u555F\uFF0C\u7CFB\u7D71\u6703\u8ACB\u60A8\u8F38\u5165\u8A02\u8CFC\u6642\u4F7F\u7528\u7684 Email \u9032\u884C\u9A57\u8B49\u3002
            </p>

            <p style="margin:0;font-size:12px;color:#999;line-height:1.8;">
              \u82E5\u60A8\u6709\u4EFB\u4F55\u554F\u984C\uFF0C\u6B61\u8FCE\u900F\u904E\u5B98\u7DB2\u806F\u7D61\u6211\u5011\u3002<br>
              \u611F\u8B1D\u60A8\u9078\u64C7 ${BRAND_NAME}\uFF0C\u795D\u60A8\u80FD\u91CF\u6EFF\u6EFF \u2728
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0ece7;text-align:center;">
            <p style="margin:0;font-size:10px;color:#bbb;letter-spacing:0.1em;">
              \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${BRAND_NAME} \xB7 \u5929\u7136\u6C34\u6676\u80FD\u91CF\u98FE\u54C1
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return resend.emails.send({
    from: `${BRAND_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: `\u3010${BRAND_NAME}\u3011\u8A02\u55AE\u78BA\u8A8D #${merchantTradeNo}`,
    html
  });
}
async function sendCustomFormReminderEmail(payload) {
  const resend = getResend();
  const { to, buyerName, merchantTradeNo, reminderStage, formUrl } = payload;
  const secondReminder = reminderStage === "72h";
  const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e4df;">
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #f0ece7;text-align:center;">
            <p style="margin:0;font-size:11px;letter-spacing:0.2em;color:#999;text-transform:uppercase;">Custom Design</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:300;color:#1a1a1a;letter-spacing:0.08em;">LAFLEUR</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:13px;color:#555;">\u89AA\u611B\u7684 ${escapeHtml(buyerName)}\uFF0C</p>
            <h2 style="margin:0 0 16px;font-size:18px;font-weight:500;color:#1a1a1a;">\u4F60\u7684 LAFLEUR \u5BA2\u88FD\u8A2D\u8A08\u9084\u5728\u7B49\u4F60\u{1F90D}</h2>
            <p style="margin:0 0 24px;font-size:13px;color:#666;line-height:1.8;">
              \u6211\u5011\u9084\u6C92\u6709\u6536\u5230\u4F60\u7684\u5BA2\u88FD\u8CC7\u6599\uFF0C\u586B\u5BEB\u5B8C\u6210\u5F8C\u8A2D\u8A08\u5E2B\u624D\u80FD\u958B\u59CB\u70BA\u4F60\u9032\u884C\u8A2D\u8A08\u3002
              ${secondReminder ? "<br>\u9019\u662F\u6211\u5011\u518D\u4E00\u6B21\u6EAB\u67D4\u63D0\u9192\u4F60\u5B8C\u6210\u8868\u55AE\u3002" : ""}
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:16px 20px;margin-bottom:24px;">
              <tr>
                <td style="font-size:13px;color:#555;padding:2px 0;">\u8A02\u55AE\u7DE8\u865F\uFF1A<strong style="color:#1a1a1a;">${escapeHtml(merchantTradeNo)}</strong></td>
              </tr>
            </table>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#1a1a1a;">
                  <a href="${escapeHtml(formUrl)}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:12px;letter-spacing:0.15em;">
                    \u586B\u5BEB\u5BA2\u88FD\u8CC7\u6599
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:11px;color:#999;line-height:1.7;">
              \u82E5\u6309\u9215\u7121\u6CD5\u9EDE\u64CA\uFF0C\u8ACB\u8907\u88FD\u4EE5\u4E0B\u9023\u7D50\u8CBC\u5230\u700F\u89BD\u5668\uFF1A<br>
              <a href="${escapeHtml(formUrl)}" style="color:#b8936a;word-break:break-all;">${escapeHtml(formUrl)}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0ece7;text-align:center;">
            <p style="margin:0;font-size:10px;color:#bbb;letter-spacing:0.1em;">
              \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${BRAND_NAME} \xB7 \u5929\u7136\u6C34\u6676\u80FD\u91CF\u98FE\u54C1
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return resend.emails.send({
    from: `${BRAND_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: secondReminder ? "\u3010LAFLEUR\u3011\u518D\u6B21\u63D0\u9192\u4F60\u5B8C\u6210\u5BA2\u88FD\u8CC7\u6599" : "\u3010LAFLEUR\u3011\u4F60\u7684\u5BA2\u88FD\u8A2D\u8A08\u9084\u5728\u7B49\u4F60",
    html
  });
}
async function sendOrderShippedEmail(payload) {
  const resend = getResend();
  const {
    to,
    buyerName,
    merchantTradeNo,
    totalAmount,
    shippingMethod,
    paymentMethod,
    cvsStoreName,
    receiverAddress,
    items
  } = payload;
  const itemRows = renderEmailItemRows(items, "#f0ece7");
  const deliveryInfo = shippingMethod === "home" ? `<p style="margin:4px 0;font-size:13px;color:#555;">\u914D\u9001\u5730\u5740\uFF1A${escapeHtml(receiverAddress ?? "\u2014")}</p>` : `<p style="margin:4px 0;font-size:13px;color:#555;">\u53D6\u8CA8\u9580\u5E02\uFF1A${escapeHtml(cvsStoreName ?? "\u2014")}</p>`;
  const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e4df;">
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #f0ece7;text-align:center;">
            <p style="margin:0;font-size:11px;letter-spacing:0.2em;color:#999;text-transform:uppercase;">Crystal Energy</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:300;color:#1a1a1a;letter-spacing:0.08em;">${BRAND_NAME}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 4px;font-size:13px;color:#555;">\u89AA\u611B\u7684 ${escapeHtml(buyerName)}\uFF0C</p>
            <h2 style="margin:0 0 16px;font-size:18px;font-weight:500;color:#1a1a1a;">\u60A8\u7684\u8A02\u55AE\u5DF2\u51FA\u8CA8</h2>
            <p style="margin:0 0 24px;font-size:13px;color:#666;line-height:1.8;">
              \u60A8\u7684\u6C34\u6676\u5546\u54C1\u5DF2\u5B8C\u6210\u51FA\u8CA8\u5B89\u6392\uFF0C\u8ACB\u7559\u610F\u914D\u9001\u901A\u77E5\u8207\u53D6\u8CA8\u8A0A\u606F\u3002
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:16px 20px;margin-bottom:24px;">
              <tr><td style="font-size:11px;letter-spacing:0.1em;color:#999;padding-bottom:10px;">\u8A02\u55AE\u8CC7\u8A0A</td></tr>
              <tr><td style="font-size:13px;color:#555;padding:2px 0;">\u8A02\u55AE\u7DE8\u865F\uFF1A<strong style="color:#1a1a1a;">${escapeHtml(merchantTradeNo)}</strong></td></tr>
              <tr><td style="font-size:13px;color:#555;padding:2px 0;">\u4ED8\u6B3E\u65B9\u5F0F\uFF1A${escapeHtml(PAYMENT_LABEL[paymentMethod] ?? paymentMethod)}</td></tr>
              <tr><td style="font-size:13px;color:#555;padding:2px 0;">\u914D\u9001\u65B9\u5F0F\uFF1A${escapeHtml(SHIPPING_LABEL[shippingMethod] ?? shippingMethod)}</td></tr>
              <tr><td style="font-size:13px;color:#555;padding:2px 0;">${deliveryInfo}</td></tr>
            </table>

            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.1em;color:#999;">\u5546\u54C1\u660E\u7D30</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${itemRows}
              <tr>
                <td colspan="2" style="padding:14px 0 0;font-size:13px;font-weight:600;color:#1a1a1a;">\u8A02\u55AE\u7E3D\u8A08</td>
                <td style="padding:14px 0 0;font-size:15px;font-weight:600;color:#1a1a1a;text-align:right;">NT$ ${totalAmount.toLocaleString()}</td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:12px;color:#999;line-height:1.8;">
              \u82E5\u914D\u9001\u8CC7\u8A0A\u6709\u4EFB\u4F55\u554F\u984C\uFF0C\u6B61\u8FCE\u900F\u904E\u5B98\u7DB2\u6216 LINE \u806F\u7E6B\u6211\u5011\u3002
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0ece7;text-align:center;">
            <p style="margin:0;font-size:10px;color:#bbb;letter-spacing:0.1em;">
              \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${BRAND_NAME} \xB7 \u5929\u7136\u6C34\u6676\u80FD\u91CF\u98FE\u54C1
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return resend.emails.send({
    from: `${BRAND_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: `\u3010${BRAND_NAME}\u3011\u60A8\u7684\u8A02\u55AE\u5DF2\u51FA\u8CA8 #${merchantTradeNo}`,
    html
  });
}
var FROM_ADDRESS, BRAND_NAME, ADMIN_ORDER_NOTIFICATION_EMAIL, OPS_ALERT_EMAIL, SHIPPING_LABEL, PAYMENT_LABEL, EMAIL_THUMB_SIZE;
var init_email = __esm({
  "server/email.ts"() {
    "use strict";
    init_env();
    init_customConsultationNote();
    FROM_ADDRESS = "service@goodaytarot.com";
    BRAND_NAME = "\u691B \xB7 Crystal";
    ADMIN_ORDER_NOTIFICATION_EMAIL = process.env.ADMIN_ORDER_NOTIFICATION_EMAIL ?? "goodaytarot@gmail.com";
    OPS_ALERT_EMAIL = process.env.CERT_ALERT_EMAIL?.trim() || ADMIN_ORDER_NOTIFICATION_EMAIL;
    SHIPPING_LABEL = {
      cvs_711: "7-11 \u8D85\u5546\u53D6\u8CA8",
      cvs_family: "\u5168\u5BB6\u8D85\u5546\u53D6\u8CA8",
      home: "\u5B85\u914D\u5230\u5E9C"
    };
    PAYMENT_LABEL = {
      credit: "\u4FE1\u7528\u5361 / Apple Pay",
      credit_card: "\u4FE1\u7528\u5361 / Apple Pay",
      atm: "\u8F49\u5E33",
      bank_transfer: "\u8F49\u5E33",
      paypal: "PayPal"
    };
    EMAIL_THUMB_SIZE = 56;
  }
});

// server/certificateMonitor.ts
import tls from "node:tls";
var CERT_EXPIRY_WARNING_DAYS = 14;
var MONITORED_HOSTNAMES = ["goodaytarot.com", "www.goodaytarot.com"];
function fetchCertificate(hostname, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 1e4;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname, rejectUnauthorized: false, timeout: timeoutMs },
      () => {
        const cert = socket.getPeerCertificate();
        if (!cert || !cert.valid_to) {
          finish({ hostname, ok: false, error: "\u6C92\u6709\u53D6\u5F97\u6191\u8B49\u8CC7\u8A0A" });
          return;
        }
        const validTo = new Date(cert.valid_to);
        if (Number.isNaN(validTo.getTime())) {
          finish({ hostname, ok: false, error: `\u7121\u6CD5\u89E3\u6790\u5230\u671F\u65E5\uFF1A${cert.valid_to}` });
          return;
        }
        finish({
          hostname,
          ok: true,
          validTo,
          daysRemaining: daysUntil(validTo),
          issuer: typeof cert.issuer?.O === "string" ? cert.issuer.O : "\u672A\u77E5"
        });
      }
    );
    socket.on("timeout", () => finish({ hostname, ok: false, error: `\u9023\u7DDA\u903E\u6642\uFF08${timeoutMs}ms\uFF09` }));
    socket.on("error", (error) => finish({ hostname, ok: false, error: error.message }));
  });
}
function daysUntil(validTo, now = /* @__PURE__ */ new Date()) {
  return Math.floor((validTo.getTime() - now.getTime()) / 864e5);
}
function collectCertificateAlerts(checks, warningDays = CERT_EXPIRY_WARNING_DAYS) {
  const alerts = [];
  for (const check of checks) {
    if (!check.ok) {
      alerts.push({ level: "unreachable", check });
      continue;
    }
    if (check.daysRemaining < 0) alerts.push({ level: "expired", check });
    else if (check.daysRemaining <= warningDays) alerts.push({ level: "expiring", check });
  }
  return alerts;
}
function describeAlert(alert) {
  const { check } = alert;
  if (!check.ok) return `${check.hostname}\uFF1A\u7121\u6CD5\u9023\u7DDA\u53D6\u5F97\u6191\u8B49\uFF08${check.error}\uFF09`;
  const date = check.validTo.toISOString().slice(0, 10);
  if (alert.level === "expired") {
    return `${check.hostname}\uFF1A\u6191\u8B49\u5DF2\u65BC ${date} \u904E\u671F\uFF0C\u5DF2\u904E ${Math.abs(check.daysRemaining)} \u5929`;
  }
  return `${check.hostname}\uFF1A\u6191\u8B49\u5C07\u65BC ${date} \u5230\u671F\uFF0C\u5269 ${check.daysRemaining} \u5929`;
}
async function runCertificateExpiryJob(opts = {}) {
  const warningDays = opts.warningDays ?? CERT_EXPIRY_WARNING_DAYS;
  const checks = await Promise.all(MONITORED_HOSTNAMES.map((hostname) => fetchCertificate(hostname)));
  const alerts = collectCertificateAlerts(checks, warningDays);
  const summary = checks.map(
    (check) => check.ok ? `${check.hostname}=${check.daysRemaining}\u5929` : `${check.hostname}=\u7121\u6CD5\u9023\u7DDA`
  );
  console.log(`[certificate-monitor] ${summary.join(" ")}`);
  if (alerts.length === 0) return { checked: checks.length, alerts: 0, notified: false };
  const lines = alerts.map(describeAlert);
  for (const line of lines) console.warn(`[certificate-monitor] ${line}`);
  let notified = false;
  try {
    const { sendCertificateExpiryAlertEmail: sendCertificateExpiryAlertEmail2 } = await Promise.resolve().then(() => (init_email(), email_exports));
    await sendCertificateExpiryAlertEmail2({ lines, warningDays });
    notified = true;
  } catch (error) {
    console.error("[certificate-monitor] \u544A\u8B66\u4FE1\u5BC4\u9001\u5931\u6557\uFF08\u6AA2\u67E5\u7D50\u679C\u4ECD\u8A18\u5728\u4E0A\u9762\uFF09:", error);
  }
  return { checked: checks.length, alerts: alerts.length, notified, lines };
}

// server/_entry/certificateMonitorCronHandler.ts
function writeJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
function isAuthorized(req) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const auth = req.headers.authorization;
  const headerSecret = req.headers["x-cron-secret"];
  return auth === `Bearer ${secret}` || headerSecret === secret;
}
async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    writeJson(res, 405, { error: "method_not_allowed" });
    return;
  }
  if (!isAuthorized(req)) {
    writeJson(res, 401, { error: "unauthorized" });
    return;
  }
  try {
    const result = await runCertificateExpiryJob();
    writeJson(res, 200, { ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[certificate-monitor cron] failed", error);
    writeJson(res, 500, { ok: false, error: message });
  }
}
export {
  handler as default
};

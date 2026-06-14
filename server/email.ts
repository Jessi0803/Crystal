/**
 * email.ts — Resend 發信 helper
 * 包含：忘記密碼重設信、訂單確認信
 */
import { Resend } from "resend";
import { ENV } from "./_core/env";

const FROM_ADDRESS = "service@goodaytarot.com";
const BRAND_NAME = "椛 · Crystal";
const ADMIN_ORDER_NOTIFICATION_EMAIL = process.env.ADMIN_ORDER_NOTIFICATION_EMAIL ?? "goodaytarot@gmail.com";

function getResend() {
  if (!ENV.resendApiKey) throw new Error("RESEND_API_KEY 未設定");
  return new Resend(ENV.resendApiKey);
}

// ─── Email 驗證信 ────────────────────────────────────────────────────────────

export async function sendVerificationEmail({
  to,
  name,
  verifyUrl,
}: {
  to: string;
  name: string;
  verifyUrl: string;
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
            <p style="margin:0 0 8px;font-size:13px;color:#555;">親愛的 ${name}，</p>
            <h2 style="margin:0 0 16px;font-size:18px;font-weight:500;color:#1a1a1a;">驗證您的 Email</h2>
            <p style="margin:0 0 24px;font-size:13px;color:#666;line-height:1.8;">
              感謝您加入 ${BRAND_NAME}！請點擊下方按鈕驗證您的 Email 地址，完成帳號啟用。<br>
              此連結將於 <strong>24 小時後失效</strong>。
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#1a1a1a;">
                  <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:12px;letter-spacing:0.15em;">
                    驗證 Email
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:11px;color:#999;line-height:1.7;">
              若按鈕無法點擊，請複製以下連結貼到瀏覽器：<br>
              <a href="${verifyUrl}" style="color:#b8936a;word-break:break-all;">${verifyUrl}</a>
            </p>
            <p style="margin:16px 0 0;font-size:11px;color:#bbb;">
              如果您沒有申請此帳號，請忽略此封信件。
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0ece7;text-align:center;">
            <p style="margin:0;font-size:10px;color:#bbb;letter-spacing:0.1em;">
              © ${new Date().getFullYear()} ${BRAND_NAME} · 天然水晶能量飾品
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
    subject: `【${BRAND_NAME}】請驗證您的 Email`,
    html,
  });
}

// ─── 忘記密碼重設信 ───────────────────────────────────────────────────────────

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name: string;
  resetUrl: string;
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
            <p style="margin:0 0 8px;font-size:13px;color:#555;">親愛的 ${name}，</p>
            <h2 style="margin:0 0 16px;font-size:18px;font-weight:500;color:#1a1a1a;">密碼重設請求</h2>
            <p style="margin:0 0 24px;font-size:13px;color:#666;line-height:1.8;">
              我們收到了您的密碼重設請求。請點擊下方按鈕重設您的密碼。
              此連結將於 <strong>1 小時後失效</strong>。
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#1a1a1a;">
                  <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:12px;letter-spacing:0.15em;">
                    重設密碼
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:11px;color:#999;line-height:1.7;">
              若按鈕無法點擊，請複製以下連結貼到瀏覽器：<br>
              <a href="${resetUrl}" style="color:#b8936a;word-break:break-all;">${resetUrl}</a>
            </p>
            <p style="margin:16px 0 0;font-size:11px;color:#bbb;">
              如果您沒有申請重設密碼，請忽略此封信件，您的帳號不會有任何變動。
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0ece7;text-align:center;">
            <p style="margin:0;font-size:10px;color:#bbb;letter-spacing:0.1em;">
              © ${new Date().getFullYear()} ${BRAND_NAME} · 天然水晶能量飾品
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
    subject: `【${BRAND_NAME}】密碼重設連結`,
    html,
  });
}

// ─── 訂單確認信 ───────────────────────────────────────────────────────────────

type OrderItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type OrderConfirmPayload = {
  to: string;
  buyerName: string;
  merchantTradeNo: string;
  totalAmount: number;
  shippingMethod: string;
  paymentMethod: string;
  cvsStoreName?: string | null;
  receiverAddress?: string | null;
  items: OrderItem[];
};

type AdminOrderNotificationPayload = {
  merchantTradeNo: string;
  statusLabel: string;
  statusReason: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  totalAmount: number;
  shippingMethod: string;
  paymentMethod: string;
  isPreorder?: boolean | null;
  isCustomOrder?: boolean | null;
  cvsStoreName?: string | null;
  receiverAddress?: string | null;
  customerNote?: string | null;
  items: OrderItem[];
};

const SHIPPING_LABEL: Record<string, string> = {
  cvs_711: "7-11 超商取貨",
  cvs_family: "全家超商取貨",
  home: "宅配到府",
};

const PAYMENT_LABEL: Record<string, string> = {
  credit: "信用卡 / Apple Pay",
  credit_card: "信用卡 / Apple Pay",
  atm: "轉帳",
  bank_transfer: "轉帳",
  paypal: "PayPal",
};

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendAdminOrderNotificationEmail(payload: AdminOrderNotificationPayload) {
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
    items,
  } = payload;

  const deliveryInfo =
    shippingMethod === "home"
      ? `配送地址：${receiverAddress ?? "—"}`
      : `取貨門市：${cvsStoreName ?? "—"}`;

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px;color:#333;">${escapeHtml(item.productName)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px;color:#666;text-align:center;">× ${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px;color:#333;text-align:right;">NT$ ${item.subtotal.toLocaleString()}</td>
      </tr>`
    )
    .join("");

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
            <h1 style="margin:0;font-size:20px;font-weight:500;color:#1a1a1a;">${escapeHtml(statusLabel)}訂單通知</h1>
            <p style="margin:10px 0 0;font-size:13px;color:#666;">${escapeHtml(statusReason)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:16px 20px;margin-bottom:22px;">
              <tr><td style="font-size:13px;color:#555;padding:3px 0;">訂單編號：<strong style="color:#111;">${escapeHtml(merchantTradeNo)}</strong></td></tr>
              <tr><td style="font-size:13px;color:#555;padding:3px 0;">訂單金額：<strong style="color:#111;">NT$ ${totalAmount.toLocaleString()}</strong></td></tr>
              <tr><td style="font-size:13px;color:#555;padding:3px 0;">付款方式：${escapeHtml(PAYMENT_LABEL[paymentMethod] ?? paymentMethod)}</td></tr>
              <tr><td style="font-size:13px;color:#555;padding:3px 0;">配送方式：${escapeHtml(SHIPPING_LABEL[shippingMethod] ?? shippingMethod)}</td></tr>
              <tr><td style="font-size:13px;color:#555;padding:3px 0;">${escapeHtml(deliveryInfo)}</td></tr>
              ${isPreorder ? `<tr><td style="font-size:13px;color:#9a6a2f;padding:3px 0;">備註：預購商品</td></tr>` : ""}
              ${isCustomOrder ? `<tr><td style="font-size:13px;color:#9a6a2f;padding:3px 0;">備註：客製化訂單</td></tr>` : ""}
            </table>

            <p style="margin:0 0 8px;font-size:12px;color:#999;letter-spacing:0.12em;">顧客資訊</p>
            <p style="margin:0 0 4px;font-size:13px;color:#555;">姓名：${escapeHtml(buyerName)}</p>
            <p style="margin:0 0 4px;font-size:13px;color:#555;">Email：${escapeHtml(buyerEmail)}</p>
            <p style="margin:0 0 20px;font-size:13px;color:#555;">手機：${escapeHtml(buyerPhone)}</p>

            ${customerNote ? `<p style="margin:0 0 20px;font-size:13px;color:#555;line-height:1.7;">顧客備註：${escapeHtml(customerNote)}</p>` : ""}

            <p style="margin:0 0 8px;font-size:12px;color:#999;letter-spacing:0.12em;">商品明細</p>
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
    subject: `【${BRAND_NAME}】${statusLabel}訂單通知 #${merchantTradeNo}`,
    html,
  });
}

export async function sendOrderConfirmEmail(payload: OrderConfirmPayload) {
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
    items,
  } = payload;

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece7;font-size:13px;color:#333;">${item.productName}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece7;font-size:13px;color:#666;text-align:center;">× ${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece7;font-size:13px;color:#333;text-align:right;">NT$ ${item.subtotal.toLocaleString()}</td>
      </tr>`
    )
    .join("");

  const deliveryInfo =
    shippingMethod === "home"
      ? `<p style="margin:4px 0;font-size:13px;color:#555;">配送地址：${receiverAddress ?? "—"}</p>`
      : `<p style="margin:4px 0;font-size:13px;color:#555;">取貨門市：${cvsStoreName ?? "—"}</p>`;

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
            <p style="margin:0 0 4px;font-size:13px;color:#555;">親愛的 ${buyerName}，</p>
            <h2 style="margin:0 0 20px;font-size:18px;font-weight:500;color:#1a1a1a;">感謝您的訂購！</h2>

            <!-- 訂單資訊 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:16px 20px;margin-bottom:24px;">
              <tr>
                <td style="font-size:11px;letter-spacing:0.1em;color:#999;padding-bottom:10px;">訂單資訊</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#555;padding:2px 0;">訂單編號：<strong style="color:#1a1a1a;">${merchantTradeNo}</strong></td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#555;padding:2px 0;">付款方式：${PAYMENT_LABEL[paymentMethod] ?? paymentMethod}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#555;padding:2px 0;">配送方式：${SHIPPING_LABEL[shippingMethod] ?? shippingMethod}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#555;padding:2px 0;">${deliveryInfo}</td>
              </tr>
            </table>

            <!-- 商品明細 -->
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.1em;color:#999;">商品明細</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${itemRows}
              <tr>
                <td colspan="2" style="padding:14px 0 0;font-size:13px;font-weight:600;color:#1a1a1a;">訂單總計</td>
                <td style="padding:14px 0 0;font-size:15px;font-weight:600;color:#1a1a1a;text-align:right;">NT$ ${totalAmount.toLocaleString()}</td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:12px;color:#999;line-height:1.8;">
              若您有任何問題，歡迎透過官網聯絡我們。<br>
              感謝您選擇 ${BRAND_NAME}，祝您能量滿滿 ✨
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0ece7;text-align:center;">
            <p style="margin:0;font-size:10px;color:#bbb;letter-spacing:0.1em;">
              © ${new Date().getFullYear()} ${BRAND_NAME} · 天然水晶能量飾品
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
    subject: `【${BRAND_NAME}】訂單確認 #${merchantTradeNo}`,
    html,
  });
}

export async function sendOrderShippedEmail(payload: OrderConfirmPayload) {
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
    items,
  } = payload;

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece7;font-size:13px;color:#333;">${escapeHtml(item.productName)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece7;font-size:13px;color:#666;text-align:center;">× ${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece7;font-size:13px;color:#333;text-align:right;">NT$ ${item.subtotal.toLocaleString()}</td>
      </tr>`
    )
    .join("");

  const deliveryInfo =
    shippingMethod === "home"
      ? `<p style="margin:4px 0;font-size:13px;color:#555;">配送地址：${escapeHtml(receiverAddress ?? "—")}</p>`
      : `<p style="margin:4px 0;font-size:13px;color:#555;">取貨門市：${escapeHtml(cvsStoreName ?? "—")}</p>`;

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
            <p style="margin:0 0 4px;font-size:13px;color:#555;">親愛的 ${escapeHtml(buyerName)}，</p>
            <h2 style="margin:0 0 16px;font-size:18px;font-weight:500;color:#1a1a1a;">您的訂單已出貨</h2>
            <p style="margin:0 0 24px;font-size:13px;color:#666;line-height:1.8;">
              您的水晶商品已完成出貨安排，請留意配送通知與取貨訊息。
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:16px 20px;margin-bottom:24px;">
              <tr><td style="font-size:11px;letter-spacing:0.1em;color:#999;padding-bottom:10px;">訂單資訊</td></tr>
              <tr><td style="font-size:13px;color:#555;padding:2px 0;">訂單編號：<strong style="color:#1a1a1a;">${escapeHtml(merchantTradeNo)}</strong></td></tr>
              <tr><td style="font-size:13px;color:#555;padding:2px 0;">付款方式：${escapeHtml(PAYMENT_LABEL[paymentMethod] ?? paymentMethod)}</td></tr>
              <tr><td style="font-size:13px;color:#555;padding:2px 0;">配送方式：${escapeHtml(SHIPPING_LABEL[shippingMethod] ?? shippingMethod)}</td></tr>
              <tr><td style="font-size:13px;color:#555;padding:2px 0;">${deliveryInfo}</td></tr>
            </table>

            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.1em;color:#999;">商品明細</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${itemRows}
              <tr>
                <td colspan="2" style="padding:14px 0 0;font-size:13px;font-weight:600;color:#1a1a1a;">訂單總計</td>
                <td style="padding:14px 0 0;font-size:15px;font-weight:600;color:#1a1a1a;text-align:right;">NT$ ${totalAmount.toLocaleString()}</td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:12px;color:#999;line-height:1.8;">
              若配送資訊有任何問題，歡迎透過官網或 LINE 聯繫我們。
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0ece7;text-align:center;">
            <p style="margin:0;font-size:10px;color:#bbb;letter-spacing:0.1em;">
              © ${new Date().getFullYear()} ${BRAND_NAME} · 天然水晶能量飾品
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
    subject: `【${BRAND_NAME}】您的訂單已出貨 #${merchantTradeNo}`,
    html,
  });
}

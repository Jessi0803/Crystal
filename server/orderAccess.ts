import crypto from "node:crypto";
import { ENV } from "./_core/env";
import { normalizeOrderEmail } from "./_core/emailNormalize";

function accessPayload(merchantTradeNo: string, buyerEmail: string) {
  return `order-access:v1:${merchantTradeNo}:${normalizeOrderEmail(buyerEmail)}`;
}

export function createOrderAccessToken(merchantTradeNo: string, buyerEmail: string) {
  if (!ENV.cookieSecret) return null;
  return crypto
    .createHmac("sha256", ENV.cookieSecret)
    .update(accessPayload(merchantTradeNo, buyerEmail))
    .digest("base64url");
}

export function verifyOrderAccessToken(
  merchantTradeNo: string,
  buyerEmail: string,
  token?: string | null
) {
  const expected = createOrderAccessToken(merchantTradeNo, buyerEmail);
  if (!expected || !token) return false;
  const expectedBuffer = Buffer.from(expected);
  const tokenBuffer = Buffer.from(token);
  return (
    expectedBuffer.length === tokenBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, tokenBuffer)
  );
}

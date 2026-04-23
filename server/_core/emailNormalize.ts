/** 訂單／會員 Email：統一格式，避免結帳與帳號比對不到 */
export function normalizeOrderEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * 顧客評價的顯示名稱
 *
 * 顧客不能自己輸入名稱（避免冒用「某某設計師」之類的身分），一律由伺服器產生。
 *
 * 取用順序：
 * 1. anonymous → 「匿名顧客」
 * 2. lineDisplayName → 直接使用。這是 LINE 的公開暱稱，本來就是拿來給人看的，
 *    不是真實姓名，所以不做遮罩（硬套姓名規則反而會把「小兔子🐰」變成「小○子」）。
 * 3. users.name → 這是註冊時填的姓名，要遮罩
 * 4. 都沒有 → 「會員」
 */

export const ANONYMOUS_DISPLAY_NAME = "匿名顧客";
export const FALLBACK_DISPLAY_NAME = "會員";
/** 對齊 productReviews.displayName 的欄位長度 */
export const DISPLAY_NAME_MAX_LENGTH = 50;

const CJK = /^[㐀-䶿一-鿿豈-﫿]+$/;

function tidy(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

/**
 * 姓名遮罩：
 * - 中文 2 字：王大 → 王○
 * - 中文 3 字以上：王小明 → 王○明、歐陽小明 → 歐○○明
 * - 其他（英文、混合、暱稱）：只留第一段，John Smith → John、Yuki → Yuki
 * - 看起來像 Email：只留第一個字，alice@x.com → a***
 */
export function maskPersonalName(rawName: string | null | undefined) {
  const name = tidy(rawName);
  if (!name) return "";

  if (name.includes("@")) {
    const local = name.split("@")[0];
    return local ? `${Array.from(local)[0]}***` : "";
  }

  if (CJK.test(name)) {
    const chars = Array.from(name);
    if (chars.length === 1) return chars[0];
    if (chars.length === 2) return `${chars[0]}○`;
    return `${chars[0]}${"○".repeat(chars.length - 2)}${chars[chars.length - 1]}`;
  }

  // 英文或混合：第一段通常是名字或暱稱，姓氏不顯示
  const first = name.split(" ")[0];
  return first || name;
}

export function resolveReviewDisplayName(
  user: { name?: string | null; lineDisplayName?: string | null },
  options: { anonymous: boolean }
) {
  if (options.anonymous) return ANONYMOUS_DISPLAY_NAME;

  const lineName = tidy(user.lineDisplayName);
  if (lineName) return lineName.slice(0, DISPLAY_NAME_MAX_LENGTH);

  const masked = maskPersonalName(user.name);
  if (masked) return masked.slice(0, DISPLAY_NAME_MAX_LENGTH);

  return FALLBACK_DISPLAY_NAME;
}

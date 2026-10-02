/**
 * 顧客評價的顯示名稱
 *
 * 顧客不能自己輸入名稱（避免冒用「某某設計師」之類的身分），一律由伺服器產生。
 *
 * 取用順序：
 * 1. anonymous → 「匿名顧客」
 * 2. lineDisplayName → name → 「會員」
 *
 * 遮罩不看名稱來自哪個欄位，只看「這串字像不像中文姓名」：
 * LINE 暱稱裡其實有不少是真實姓名（正式站 46 個暱稱中有 19 個是 2～4 個純中文字），
 * 把整欄當暱稱放行會直接露出全名；反過來把暱稱套姓名規則，
 * 又會讓「小兔子🐰」變成奇怪的遮罩。所以改成依內容判斷。
 */

export const ANONYMOUS_DISPLAY_NAME = "匿名顧客";
export const FALLBACK_DISPLAY_NAME = "會員";
/** 對齊 productReviews.displayName 的欄位長度 */
export const DISPLAY_NAME_MAX_LENGTH = 50;

/** 2～4 個純中文字：視為真實姓名，需要遮罩 */
const CJK_PERSONAL_NAME = /^[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]{2,4}$/;

function tidy(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

/**
 * 像中文姓名就只留姓氏，其餘以 * 取代：
 * - 葉小明 → 葉**
 * - 葉大   → 葉*
 * - 歐陽小明 → 歐***（複姓會多遮一字，寧可保守）
 *
 * 其他一律完整顯示：英文姓名、暱稱、含 emoji 的名稱本來就是拿來給人看的。
 * 誤填成 Email 時只留第一個字，避免把信箱公開到商品頁。
 */
export function maskPersonalName(rawName: string | null | undefined) {
  const name = tidy(rawName);
  if (!name) return "";

  if (name.includes("@")) {
    const local = name.split("@")[0];
    return local ? `${Array.from(local)[0]}***` : "";
  }

  if (CJK_PERSONAL_NAME.test(name)) {
    const chars = Array.from(name);
    return `${chars[0]}${"*".repeat(chars.length - 1)}`;
  }

  return name;
}

export function resolveReviewDisplayName(
  user: { name?: string | null; lineDisplayName?: string | null },
  options: { anonymous: boolean }
) {
  if (options.anonymous) return ANONYMOUS_DISPLAY_NAME;

  const source = tidy(user.lineDisplayName) || tidy(user.name);
  const masked = maskPersonalName(source);
  if (masked) return masked.slice(0, DISPLAY_NAME_MAX_LENGTH);

  return FALLBACK_DISPLAY_NAME;
}

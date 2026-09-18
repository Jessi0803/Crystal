/**
 * 功效說明富文字（Tiptap 產生的 HTML）共用設定與轉換。
 *
 * - 樣式一律以 rt-* class 表示，實際視覺由前台 .rich-content 樣式決定，不存 inline style
 * - 前後端的 HTML 清理都以這裡的 allowlist 為準
 * - 舊資料是純文字，讀取時才轉成 HTML，不需要批次轉換
 */

export const RICH_TEXT_FONT_SIZES = [14, 16, 18, 20, 24, 28] as const;
export type RichTextFontSize = (typeof RICH_TEXT_FONT_SIZES)[number];

/** 文字顏色只開放品牌色，實際色碼在 index.css 的 --brand-* 變數 */
export const RICH_TEXT_COLORS = [
  { id: "umber", label: "Deep Umber 深棕" },
  { id: "taupe", label: "Rose Taupe 玫瑰棕" },
  { id: "blush", label: "Rosy Blush 玫瑰粉" },
  { id: "greige", label: "灰棕色" },
] as const;
export type RichTextColor = (typeof RICH_TEXT_COLORS)[number]["id"];

export const RICH_TEXT_ALIGNMENTS = ["left", "center", "right"] as const;
export type RichTextAlignment = (typeof RICH_TEXT_ALIGNMENTS)[number];

export const RICH_TEXT_IMAGE_SIZES = [
  { id: "sm", label: "小" },
  { id: "md", label: "中" },
  { id: "lg", label: "大" },
  { id: "full", label: "100%" },
] as const;
export type RichTextImageSize = (typeof RICH_TEXT_IMAGE_SIZES)[number]["id"];

export const RICH_TEXT_MAX_LENGTH = 60_000;

export const RICH_TEXT_ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "s", "h2", "h3", "ul", "ol", "li", "a", "img", "span"];

/** 各標籤可使用的 class（與 Tiptap 擴充輸出的 class 一致） */
const alignClasses = RICH_TEXT_ALIGNMENTS.map((align) => `rt-align-${align}`);
export const RICH_TEXT_ALLOWED_CLASSES: Record<string, string[]> = {
  p: alignClasses,
  h2: alignClasses,
  h3: alignClasses,
  span: [
    ...RICH_TEXT_FONT_SIZES.map((size) => `rt-size-${size}`),
    ...RICH_TEXT_COLORS.map((color) => `rt-color-${color.id}`),
  ],
  img: [
    ...RICH_TEXT_ALIGNMENTS.map((align) => `rt-img-${align}`),
    ...RICH_TEXT_IMAGE_SIZES.map((size) => `rt-img-${size.id}`),
  ],
};

/** 連結只允許 http / https / mailto；圖片只允許 https 或站內路徑 */
export function isSafeLinkHref(href: string) {
  return /^(https?:\/\/|mailto:)/i.test(href.trim());
}

export function isSafeImageSrc(src: string) {
  const value = src.trim();
  return /^https:\/\//i.test(value) || /^\/(?!\/)/.test(value);
}

export function isRichTextHtml(value: string) {
  return /^\s*<(p|h2|h3|ul|ol|img)[\s>/]/i.test(value);
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 舊的純文字：空行分段，單一換行保留為 <br> */
export function plainTextToRichTextHtml(text: string) {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/^\n+|\n+$/g, ""))
    .filter((paragraph) => paragraph.trim().length > 0);
  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("");
}

/** 不論新舊資料，一律轉成 HTML（尚未清理） */
export function toRichTextHtml(value: string) {
  return isRichTextHtml(value) ? value : plainTextToRichTextHtml(value);
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };

/** 轉成純文字，給 AI 客服、分類判斷、是否有內容等用途 */
export function richTextToPlainText(value: string) {
  if (!isRichTextHtml(value)) return value.trim();
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h2|h3|li)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name: string) => ENTITIES[name])
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 沒有文字也沒有圖片，視為空白（例如 Editor 清空後的 <p></p>） */
export function isRichTextEmpty(value: string) {
  return richTextToPlainText(value).length === 0 && !/<img\s/i.test(value);
}

import sanitizeHtml from "sanitize-html";
import {
  RICH_TEXT_ALLOWED_CLASSES,
  RICH_TEXT_ALLOWED_TAGS,
  isRichTextEmpty,
  isRichTextHtml,
  isSafeImageSrc,
  isSafeLinkHref,
} from "@shared/richText";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: RICH_TEXT_ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt"],
  },
  allowedClasses: RICH_TEXT_ALLOWED_CLASSES,
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
  // script、style 等標籤連同內容一起移除
  disallowedTagsMode: "discard",
  exclusiveFilter: (frame) => frame.tag === "img" && !isSafeImageSrc(frame.attribs.src ?? ""),
  transformTags: {
    // 不安全的連結保留文字、移除連結
    a: (tagName, attribs): sanitizeHtml.Tag => {
      const href = attribs.href ?? "";
      if (!isSafeLinkHref(href)) return { tagName: "span", attribs: {} };
      return {
        tagName,
        attribs: { href, target: "_blank", rel: "noopener noreferrer nofollow" },
      };
    },
  },
};

/** 存檔前清理富文字 HTML；純文字（舊資料格式）原樣保留，前台會跳脫後顯示 */
export function sanitizeRichText(value: string) {
  if (!isRichTextHtml(value)) return value;
  return sanitizeHtml(value, SANITIZE_OPTIONS);
}

/** 功效說明：清理並去掉空白內容 */
export function sanitizeBenefits(values: string[]) {
  return values.map(sanitizeRichText).filter((value) => !isRichTextEmpty(value));
}

import { useMemo } from "react";
import DOMPurify from "dompurify";
import {
  RICH_TEXT_ALLOWED_CLASSES,
  RICH_TEXT_ALLOWED_TAGS,
  isSafeImageSrc,
  isSafeLinkHref,
  toRichTextHtml,
} from "@shared/richText";

// 使用獨立的 DOMPurify 實例，hook 不影響其他套件
const purifier = typeof window === "undefined" ? null : DOMPurify(window);

purifier?.addHook("afterSanitizeAttributes", (node) => {
  const tag = node.tagName.toLowerCase();
  const allowedClasses = RICH_TEXT_ALLOWED_CLASSES[tag] ?? [];
  const classes = Array.from(node.classList).filter((name) => allowedClasses.includes(name));
  if (classes.length > 0) node.setAttribute("class", classes.join(" "));
  else node.removeAttribute("class");

  if (tag === "a") {
    if (!isSafeLinkHref(node.getAttribute("href") ?? "")) node.removeAttribute("href");
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer nofollow");
  }
  if (tag === "img" && !isSafeImageSrc(node.getAttribute("src") ?? "")) {
    node.remove();
  }
});

/** 前台顯示功效說明：舊的純文字會先轉成段落，HTML 一律再清理一次 */
export function sanitizeRichTextForDisplay(value: string) {
  const html = toRichTextHtml(value);
  if (!purifier) return "";
  return purifier.sanitize(html, {
    ALLOWED_TAGS: RICH_TEXT_ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "class"],
    ALLOW_DATA_ATTR: false,
  });
}

export function RichTextContent({ value, className = "" }: { value: string; className?: string }) {
  const html = useMemo(() => sanitizeRichTextForDisplay(value), [value]);
  return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

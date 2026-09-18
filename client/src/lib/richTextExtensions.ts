/**
 * 功效說明 Editor 的 Tiptap 設定。
 * 字級、顏色、對齊、圖片位置與大小都輸出 rt-* class（不輸出 inline style），
 * 視覺由 index.css 的 .rich-content 統一控制；class 清單需與 shared/richText.ts 的 allowlist 一致。
 */
import { Mark, mergeAttributes, type Extensions } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import {
  RICH_TEXT_ALIGNMENTS,
  RICH_TEXT_COLORS,
  RICH_TEXT_FONT_SIZES,
  RICH_TEXT_IMAGE_SIZES,
  isSafeImageSrc,
  isSafeLinkHref,
  type RichTextAlignment,
  type RichTextImageSize,
} from "@shared/richText";

function classValue<T extends string | number>(element: HTMLElement, prefix: string, allowed: readonly T[]): T | null {
  for (const name of Array.from(element.classList)) {
    if (!name.startsWith(prefix)) continue;
    const raw = name.slice(prefix.length);
    const match = allowed.find((value) => String(value) === raw);
    if (match !== undefined) return match;
  }
  return null;
}

const COLOR_IDS = RICH_TEXT_COLORS.map((color) => color.id);
const IMAGE_SIZE_IDS = RICH_TEXT_IMAGE_SIZES.map((size) => size.id);

/** 固定字級：<span class="rt-size-18"> */
export const FontSizeMark = Mark.create({
  name: "rtFontSize",
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (element) => classValue(element, "rt-size-", RICH_TEXT_FONT_SIZES),
        renderHTML: (attributes) => (attributes.size ? { class: `rt-size-${attributes.size}` } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span", getAttrs: (element) => (classValue(element, "rt-size-", RICH_TEXT_FONT_SIZES) ? null : false) }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
});

/** 品牌色：<span class="rt-color-taupe"> */
export const BrandColorMark = Mark.create({
  name: "rtColor",
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => classValue(element, "rt-color-", COLOR_IDS),
        renderHTML: (attributes) => (attributes.color ? { class: `rt-color-${attributes.color}` } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span", getAttrs: (element) => (classValue(element, "rt-color-", COLOR_IDS) ? null : false) }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
});

/** 段落／標題對齊：預設靠左不輸出 class，置中與靠右輸出 rt-align-* */
const ClassTextAlign = TextAlign.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element) => classValue(element, "rt-align-", RICH_TEXT_ALIGNMENTS),
            renderHTML: (attributes) =>
              attributes.textAlign && attributes.textAlign !== "left" ? { class: `rt-align-${attributes.textAlign}` } : {},
          },
        },
      },
    ];
  },
}).configure({ types: ["heading", "paragraph"], alignments: [...RICH_TEXT_ALIGNMENTS] });

/** 圖片：只保留 src、alt，位置與大小以 class 表示 */
export const RichTextImage = Image.extend({
  // 貼上的圖片只接受 https 或站內路徑
  parseHTML() {
    return [{ tag: "img[src]", getAttrs: (element) => (isSafeImageSrc(element.getAttribute("src") ?? "") ? null : false) }];
  },
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      align: {
        default: "center" satisfies RichTextAlignment,
        parseHTML: (element) => classValue(element, "rt-img-", RICH_TEXT_ALIGNMENTS) ?? "center",
        renderHTML: (attributes) => ({ class: `rt-img-${attributes.align}` }),
      },
      size: {
        default: "md" satisfies RichTextImageSize,
        parseHTML: (element) => classValue(element, "rt-img-", IMAGE_SIZE_IDS) ?? "md",
        renderHTML: (attributes) => ({ class: `rt-img-${attributes.size}` }),
      },
    };
  },
}).configure({ inline: false, allowBase64: false });

export const benefitsEditorExtensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    link: {
      openOnClick: false,
      autolink: false,
      defaultProtocol: "https",
      isAllowedUri: (url) => isSafeLinkHref(url),
      HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
    },
  }),
  ClassTextAlign,
  FontSizeMark,
  BrandColorMark,
  RichTextImage,
];

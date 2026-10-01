import { describe, expect, it } from "vitest";
import {
  isRichTextEmpty,
  plainTextToRichTextHtml,
  richTextToPlainText,
  toRichTextHtml,
} from "@shared/richText";
import { sanitizeBenefits, sanitizeRichText } from "./richTextSanitize";

describe("legacy plain text", () => {
  it("turns blank lines into paragraphs and keeps single line breaks", () => {
    expect(plainTextToRichTextHtml("提升桃花運\n增強直覺\n\n帶來平靜")).toBe("<p>提升桃花運<br>增強直覺</p><p>帶來平靜</p>");
  });

  it("escapes HTML in plain text", () => {
    expect(toRichTextHtml("a <img src=x onerror=alert(1)> & b")).toBe("<p>a &lt;img src=x onerror=alert(1)&gt; &amp; b</p>");
  });

  it("leaves rich text HTML unchanged", () => {
    expect(toRichTextHtml("<p>已是 HTML</p>")).toBe("<p>已是 HTML</p>");
  });
});

describe("richTextToPlainText", () => {
  it("keeps block breaks and decodes entities", () => {
    expect(richTextToPlainText('<h2>水晶寓意</h2><p>愛情 &amp; <span class="rt-size-18">財運</span></p><ul><li>月光石</li><li>白水晶</li></ul>'))
      .toBe("水晶寓意\n愛情 & 財運\n月光石\n白水晶");
  });

  it("treats an empty editor or image-only content correctly", () => {
    expect(isRichTextEmpty("<p></p>")).toBe(true);
    expect(isRichTextEmpty("   ")).toBe(true);
    expect(isRichTextEmpty('<p></p><img src="https://x.public.blob.vercel-storage.com/a.jpg">')).toBe(false);
  });
});

describe("sanitizeRichText", () => {
  it("keeps editor output", () => {
    const html =
      '<h2 class="rt-align-center">水晶寓意</h2><p><strong>粗</strong><em>斜</em><u>底</u><s>刪</s><span class="rt-size-20 rt-color-taupe">字</span></p>' +
      '<ol><li><p>一</p></li></ol><img src="https://x.public.blob.vercel-storage.com/a.jpg" alt="月光石" class="rt-img-center rt-img-md">';
    expect(sanitizeRichText(html)).toBe(
      '<h2 class="rt-align-center">水晶寓意</h2><p><strong>粗</strong><em>斜</em><u>底</u><s>刪</s><span class="rt-size-20 rt-color-taupe">字</span></p>' +
        '<ol><li><p>一</p></li></ol><img src="https://x.public.blob.vercel-storage.com/a.jpg" alt="月光石" class="rt-img-center rt-img-md" />'
    );
  });

  it("removes scripts, iframes, event handlers and inline styles", () => {
    const result = sanitizeRichText(
      '<p style="color:red" onclick="alert(1)">文字<script>alert(1)</script></p><iframe src="https://evil.test"></iframe><img src="https://a.test/x.jpg" onerror="alert(1)">'
    );
    expect(result).toBe('<p>文字</p><img src="https://a.test/x.jpg" />');
  });

  it("drops unknown classes", () => {
    expect(sanitizeRichText('<p class="rt-align-center evil">a</p><span class="rt-size-99">b</span>')).toBe('<p class="rt-align-center">a</p><span>b</span>');
  });

  it("forces safe link attributes and unwraps javascript links", () => {
    expect(sanitizeRichText('<p><a href="https://goodaytarot.com" target="_self">官網</a><a href="javascript:alert(1)">壞</a></p>')).toBe(
      '<p><a href="https://goodaytarot.com" target="_blank" rel="noopener noreferrer nofollow">官網</a><span>壞</span></p>'
    );
  });

  it("removes images with unsafe sources", () => {
    expect(sanitizeRichText('<p>a</p><img src="data:image/png;base64,AAAA"><img src="javascript:alert(1)"><img src="//evil.test/x.jpg">')).toBe("<p>a</p>");
  });

  it("keeps legacy plain text as is", () => {
    expect(sanitizeRichText("提升桃花運\n帶來平靜")).toBe("提升桃花運\n帶來平靜");
  });
});

describe("sanitizeBenefits", () => {
  it("drops empty editor content", () => {
    expect(sanitizeBenefits(["<p></p>"])).toEqual([]);
    expect(sanitizeBenefits(["<p><script>x</script></p>"])).toEqual([]);
    expect(sanitizeBenefits(["<p>有內容</p>"])).toEqual(["<p>有內容</p>"]);
  });
});

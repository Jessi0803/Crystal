import { afterEach, describe, expect, it } from "vitest";
import { renderEmailItemRows, toEmailImageUrl } from "./email";

const originalSiteUrl = process.env.SITE_URL;

afterEach(() => {
  process.env.SITE_URL = originalSiteUrl;
});

describe("toEmailImageUrl", () => {
  it("keeps absolute https URLs", () => {
    expect(toEmailImageUrl("https://drive.google.com/thumbnail?id=abc")).toBe("https://drive.google.com/thumbnail?id=abc");
  });

  it("prefixes site paths with the site URL", () => {
    process.env.SITE_URL = "https://goodaytarot.com/";
    expect(toEmailImageUrl("/images/d-design/d001.jpg")).toBe("https://goodaytarot.com/images/d-design/d001.jpg");
  });

  it("drops empty, base64, protocol-relative and plain http images", () => {
    for (const value of [null, "", "  ", "data:image/jpeg;base64,AAAA", "//evil.test/a.jpg", "http://a.test/a.jpg"]) {
      expect(toEmailImageUrl(value)).toBeNull();
    }
  });
});

describe("renderEmailItemRows", () => {
  it("shows a thumbnail next to each product", () => {
    process.env.SITE_URL = "https://goodaytarot.com";
    const html = renderEmailItemRows([
      { productName: "蜜光之境手鍊", quantity: 1, unitPrice: 1580, subtotal: 1580, productImage: "/images/a.jpg" },
    ]);
    expect(html).toContain('src="https://goodaytarot.com/images/a.jpg"');
    expect(html).toContain('width="56" height="56"');
    expect(html).toContain("NT$ 1,580");
  });

  it("uses a placeholder when there is no image and no thumbnail for discounts", () => {
    const html = renderEmailItemRows([
      { productName: "月光手鍊", quantity: 1, unitPrice: 1400, subtotal: 1400, productImage: null },
      { productName: "優惠券折抵", quantity: 1, unitPrice: -50, subtotal: -50, productImage: "/images/a.jpg" },
    ]);
    expect(html).toContain("background:#f2eae2;\"></div>");
    expect(html.match(/<img /g) ?? []).toHaveLength(0);
    expect(html).toContain("NT$ -50");
  });

  it("escapes product names", () => {
    const html = renderEmailItemRows([
      { productName: '<b>手鍊</b>"', quantity: 1, unitPrice: 100, subtotal: 100, productImage: null },
    ]);
    expect(html).toContain("&lt;b&gt;手鍊&lt;/b&gt;&quot;");
    expect(html).not.toContain("<b>手鍊</b>");
  });
});

import { describe, expect, it } from "vitest";
import {
  extractCustomConsultationNote,
  upsertCustomConsultationNote,
} from "../shared/customFormNote";

const PRODUCT = "tarot-crystal-deposit-product";

/** 照 server/routers/order.ts 的 upsertCustomConsultationNote 格式組一個區塊 */
function block(key: string, content: string) {
  return [`【客製需求開始：${key}】`, content, `【客製需求結束：${key}】`].join("\n");
}

describe("extractCustomConsultationNote", () => {
  it("沒有備註時回 null", () => {
    expect(extractCustomConsultationNote(null, { productId: PRODUCT })).toBeNull();
    expect(extractCustomConsultationNote("", { productId: PRODUCT })).toBeNull();
  });

  it("取出指定件次的內容", () => {
    const note = block(`${PRODUCT}:900:1`, "第一件的需求");
    expect(
      extractCustomConsultationNote(note, { productId: PRODUCT, orderItemId: 900, itemIndex: 1 })
    ).toBe("第一件的需求");
  });

  it("多件併存時只取自己那一件，不會吃到別件", () => {
    const note = [
      block(`${PRODUCT}:900:1`, "第一件的需求"),
      block(`${PRODUCT}:900:2`, "第二件的需求"),
    ].join("\n\n");

    expect(
      extractCustomConsultationNote(note, { productId: PRODUCT, orderItemId: 900, itemIndex: 1 })
    ).toBe("第一件的需求");
    expect(
      extractCustomConsultationNote(note, { productId: PRODUCT, orderItemId: 900, itemIndex: 2 })
    ).toBe("第二件的需求");
  });

  it("沒填過的件次回 null，不會退回別件的內容", () => {
    const note = block(`${PRODUCT}:900:1`, "第一件的需求");
    expect(
      extractCustomConsultationNote(note, { productId: PRODUCT, orderItemId: 900, itemIndex: 2 })
    ).toBeNull();
  });

  it("舊訂單只有 productId 標記時，第 1 件仍讀得到", () => {
    const note = block(PRODUCT, "舊格式的需求");
    expect(
      extractCustomConsultationNote(note, { productId: PRODUCT, orderItemId: 900, itemIndex: 1 })
    ).toBe("舊格式的需求");
  });

  it("舊格式不會被第 2 件以後誤用", () => {
    const note = block(PRODUCT, "舊格式的需求");
    expect(
      extractCustomConsultationNote(note, { productId: PRODUCT, orderItemId: 900, itemIndex: 2 })
    ).toBeNull();
  });

  it("新格式存在時優先於舊格式", () => {
    const note = [block(PRODUCT, "舊格式的需求"), block(`${PRODUCT}:900:1`, "新格式的需求")].join("\n\n");
    expect(
      extractCustomConsultationNote(note, { productId: PRODUCT, orderItemId: 900, itemIndex: 1 })
    ).toBe("新格式的需求");
  });

  it("缺少結束標記時切到下一個區塊為止", () => {
    const note = [
      `【客製需求開始：${PRODUCT}:900:1】`,
      "沒有結束標記的內容",
      block(`${PRODUCT}:900:2`, "第二件的需求"),
    ].join("\n");

    expect(
      extractCustomConsultationNote(note, { productId: PRODUCT, orderItemId: 900, itemIndex: 1 })
    ).toBe("沒有結束標記的內容");
  });

  it("不同商品的區塊不會互相干擾", () => {
    const other = "chakra-crystal-deposit-product";
    const note = [block(`${other}:900:1`, "脈輪的需求"), block(`${PRODUCT}:901:1`, "塔羅的需求")].join("\n\n");

    expect(
      extractCustomConsultationNote(note, { productId: PRODUCT, orderItemId: 901, itemIndex: 1 })
    ).toBe("塔羅的需求");
  });

  it("內容是空白時視為沒填", () => {
    const note = block(`${PRODUCT}:900:1`, "   ");
    expect(
      extractCustomConsultationNote(note, { productId: PRODUCT, orderItemId: 900, itemIndex: 1 })
    ).toBeNull();
  });
});

describe("upsertCustomConsultationNote", () => {
  const upsert = (
    existing: string | null,
    customerNote: string,
    orderItemId?: number,
    itemIndex?: number
  ) =>
    upsertCustomConsultationNote(existing, {
      productId: PRODUCT,
      customerNote,
      orderItemId,
      itemIndex,
    });

  it("第一次填寫產生一個區塊", () => {
    const note = upsert(null, "第一次的需求", 900, 1);
    expect(extractCustomConsultationNote(note, { productId: PRODUCT, orderItemId: 900, itemIndex: 1 }))
      .toBe("第一次的需求");
  });

  it("同一件重複送出是覆蓋，不會變成兩塊", () => {
    const first = upsert(null, "舊的需求", 900, 1);
    const second = upsert(first, "新的需求", 900, 1);

    expect(second.match(/【客製需求開始：/g)).toHaveLength(1);
    expect(extractCustomConsultationNote(second, { productId: PRODUCT, orderItemId: 900, itemIndex: 1 }))
      .toBe("新的需求");
    expect(second).not.toContain("舊的需求");
  });

  it("不同件各自獨立，不會覆蓋彼此", () => {
    const first = upsert(null, "第一件的需求", 900, 1);
    const both = upsert(first, "第二件的需求", 900, 2);

    expect(both.match(/【客製需求開始：/g)).toHaveLength(2);
    expect(extractCustomConsultationNote(both, { productId: PRODUCT, orderItemId: 900, itemIndex: 1 }))
      .toBe("第一件的需求");
    expect(extractCustomConsultationNote(both, { productId: PRODUCT, orderItemId: 900, itemIndex: 2 }))
      .toBe("第二件的需求");
  });

  it("舊訂單改寫舊區塊，不會同一件出現兩份", () => {
    const legacy = block(PRODUCT, "舊格式的需求");
    const updated = upsert(legacy, "重新填寫的需求", 900, 1);

    expect(updated.match(/【客製需求開始：/g)).toHaveLength(1);
    expect(updated).not.toContain("舊格式的需求");
    expect(extractCustomConsultationNote(updated, { productId: PRODUCT, orderItemId: 900, itemIndex: 1 }))
      .toBe("重新填寫的需求");
  });

  it("舊訂單的第 2 件另外新增，不會蓋掉第 1 件的舊區塊", () => {
    const legacy = block(PRODUCT, "舊格式的需求");
    const updated = upsert(legacy, "第二件的需求", 900, 2);

    expect(updated.match(/【客製需求開始：/g)).toHaveLength(2);
    expect(updated).toContain("舊格式的需求");
    expect(extractCustomConsultationNote(updated, { productId: PRODUCT, orderItemId: 900, itemIndex: 2 }))
      .toBe("第二件的需求");
  });

  it("不會動到其他商品的區塊", () => {
    const other = "chakra-crystal-deposit-product";
    const existing = block(`${other}:900:1`, "脈輪的需求");
    const updated = upsert(existing, "塔羅的需求", 901, 1);

    expect(extractCustomConsultationNote(updated, { productId: other, orderItemId: 900, itemIndex: 1 }))
      .toBe("脈輪的需求");
    expect(extractCustomConsultationNote(updated, { productId: PRODUCT, orderItemId: 901, itemIndex: 1 }))
      .toBe("塔羅的需求");
  });

  it("送出完全相同的內容時結果不變（呼叫端才能據此略過寫入）", () => {
    const first = upsert(null, "一樣的需求", 900, 1);
    expect(upsert(first, "一樣的需求", 900, 1)).toBe(first);
  });
});

/**
 * 客製需求在 `orders.customerNote` 裡的存放格式，以及讀回來的工具。
 *
 * 一筆訂單可能有多件客製商品，各自佔一個區塊串在同一個欄位裡：
 *   【客製需求開始：key】\n 內容 \n【客製需求結束：key】
 *
 * key 的規則見 `customConsultationKey`。寫入端是 server/routers/order.ts 的
 * upsertCustomConsultationNote，這裡負責讀回來，兩邊格式必須一致。
 */

/** 早期資料只有 productId；有件次資訊時才用完整 key */
export function customConsultationKey(productId: string, orderItemId?: number, itemIndex?: number) {
  if (orderItemId && itemIndex) return `${productId}:${orderItemId}:${itemIndex}`;
  return productId;
}

export function customConsultationStartMarker(
  productId: string,
  orderItemId?: number,
  itemIndex?: number
) {
  return `【客製需求開始：${customConsultationKey(productId, orderItemId, itemIndex)}】`;
}

type BlockRange = {
  /** 整個區塊（含頭尾標記）在字串中的起訖 */
  blockStart: number;
  blockEnd: number;
  /** 標記之間的內容 */
  contentStart: number;
  contentEnd: number;
};

function findBlockRange(customerNote: string, key: string): BlockRange | null {
  const startMarker = `【客製需求開始：${key}】`;
  const endMarker = `【客製需求結束：${key}】`;
  const blockStart = customerNote.indexOf(startMarker);
  if (blockStart < 0) return null;

  const contentStart = blockStart + startMarker.length;
  const endIndex = customerNote.indexOf(endMarker, contentStart);
  if (endIndex >= 0) {
    return {
      blockStart,
      blockEnd: endIndex + endMarker.length,
      contentStart,
      contentEnd: endIndex,
    };
  }

  // 沒有結束標記時（早期資料）切到下一個區塊為止，避免把別件的內容一起吃進來
  const nextBlockIndex = customerNote.indexOf("【客製需求開始：", contentStart);
  const contentEnd = nextBlockIndex >= 0 ? nextBlockIndex : customerNote.length;
  return { blockStart, blockEnd: contentEnd, contentStart, contentEnd };
}

function extractNoteBlock(customerNote: string | null | undefined, key: string) {
  if (!customerNote) return null;
  const range = findBlockRange(customerNote, key);
  if (!range) return null;
  return customerNote.slice(range.contentStart, range.contentEnd).trim() || null;
}

function buildNoteBlock(key: string, customerNote: string) {
  return [`【客製需求開始：${key}】`, customerNote.trim(), `【客製需求結束：${key}】`].join("\n");
}

function replaceBlock(customerNote: string, key: string, noteBlock: string) {
  const range = findBlockRange(customerNote, key);
  if (!range) return null;
  return [
    customerNote.slice(0, range.blockStart).trimEnd(),
    noteBlock,
    customerNote.slice(range.blockEnd).trimStart(),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * 寫入／更新某一件客製商品的需求內容。
 *
 * 同一件重複送出是覆蓋，不是累加。舊訂單只有 productId 標記時，第 1 件會改寫
 * 那一塊舊區塊，而不是另外附加一塊——否則後台會看到同一件有兩份需求。
 */
export function upsertCustomConsultationNote(
  existingNote: string | null | undefined,
  {
    productId,
    customerNote,
    orderItemId,
    itemIndex,
  }: { productId: string; customerNote: string; orderItemId?: number; itemIndex?: number }
) {
  const key = customConsultationKey(productId, orderItemId, itemIndex);
  const noteBlock = buildNoteBlock(key, customerNote);
  const current = existingNote?.trim() ?? "";
  if (!current) return noteBlock;

  const replaced = replaceBlock(current, key, noteBlock);
  if (replaced !== null) return replaced;

  // 新格式還沒有，但舊格式有：改寫舊區塊，避免同一件出現兩份
  if (orderItemId && itemIndex === 1) {
    const legacyReplaced = replaceBlock(current, productId, noteBlock);
    if (legacyReplaced !== null) return legacyReplaced;
  }

  return [current, noteBlock].join("\n\n");
}

/**
 * 取出某一件客製商品已送出的需求內容；沒填過回 null。
 * 找不到新格式時，第 1 件會回頭相容只有 productId 的舊標記。
 */
export function extractCustomConsultationNote(
  customerNote: string | null | undefined,
  {
    productId,
    orderItemId,
    itemIndex,
  }: { productId: string; orderItemId?: number; itemIndex?: number }
) {
  if (orderItemId && itemIndex) {
    return (
      extractNoteBlock(customerNote, customConsultationKey(productId, orderItemId, itemIndex)) ??
      (itemIndex === 1 ? extractNoteBlock(customerNote, productId) : null)
    );
  }
  return extractNoteBlock(customerNote, productId);
}

/** 後台可管理的 AI 客服問答分類（商品推薦由商品資料自動產生，不在此列） */
export const FAQ_CATEGORIES = ["常見問題", "客製化", "課程", "選購需求"] as const;
export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

/** AI 產生回答時，每則知識只會讀取答案的前 N 個字 */
export const KNOWLEDGE_ANSWER_READ_LIMIT = 240;

export const FAQ_QUESTION_MAX = 200;
export const FAQ_ANSWER_MAX = 2000;
export const FAQ_KEYWORD_MAX = 30;
export const FAQ_KEYWORD_LENGTH_MAX = 30;

/** 以空白、逗號、頓號分隔，去除重複與空白 */
export function parseKeywords(input: string | string[]) {
  const parts = Array.isArray(input) ? input : input.split(/[\s,，、;；\n]+/);
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const part of parts) {
    const keyword = part.trim();
    if (!keyword) continue;
    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    keywords.push(keyword);
  }
  return keywords;
}

/** 產生向量用的文字：問題 + 關鍵字（與原本固定問答的寫法一致） */
export function buildFaqEmbedText(question: string, keywords: string[]) {
  return [question.trim(), ...keywords].join(" ");
}

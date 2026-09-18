import { eq, sql } from "drizzle-orm";
import { chatbotKnowledge, dbProducts } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { richTextToPlainText } from "@shared/richText";

export interface KnowledgeChunk {
  id: string;
  question: string;
  answer: string;
  embedText: string; // 用於 embedding：問題 + 關鍵字
  keywords: string[];
  category: string;
  relatedProductIds?: string[];
}

type DynamicKnowledgeChunk = KnowledgeChunk & { vector?: number[] | null };

type ProductKnowledgeSource = {
  id: string;
  name: string;
  subtitle?: string | null;
  category: string;
  categoryLabel: string;
  categories?: string[] | null;
  categoryLabels?: string[] | null;
  price: number;
  priceRange?: string | null;
  tags?: string[] | null;
  description?: string | null;
  story?: string | null;
  benefits?: string[] | null;
  suitableFor?: string[] | null;
  crystalType?: string | null;
  active: boolean;
  isMonthlyLimited: boolean;
};

const PUBLIC_SITE = "https://goodaytarot.com";
let chatbotKnowledgeTableEnsured = false;

function asStringArray(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value.filter((item) => item.trim().length > 0) : [];
}

function splitTerms(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/[・、，,／/｜|;；\n\r\t]+/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function uniqueTerms(values: Array<string | null | undefined>, max = 36): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const term = value?.trim();
    if (!term) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(term);
    if (result.length >= max) break;
  }
  return result;
}

function productPriceText(product: ProductKnowledgeSource): string {
  return product.priceRange?.trim() || `NT$${product.price.toLocaleString("zh-TW")}`;
}

export function buildProductKnowledgeChunk(product: ProductKnowledgeSource): KnowledgeChunk {
  const crystalTerms = splitTerms(product.crystalType);
  // 功效說明可能是富文字 HTML，給 AI 前先轉成純文字
  const benefits = asStringArray(product.benefits).map(richTextToPlainText).filter(Boolean);
  const tags = asStringArray(product.tags);
  const suitableFor = asStringArray(product.suitableFor);
  const categoryLabels = asStringArray(product.categoryLabels);
  const categoryTerms = categoryLabels.length > 0 ? categoryLabels : [product.categoryLabel, product.category];
  const limitedTerms = product.isMonthlyLimited ? ["限定款", "每月限量", "限量手鍊"] : [];
  const keywords = uniqueTerms([
    product.name,
    product.id,
    ...limitedTerms,
    ...crystalTerms,
    ...benefits,
    ...suitableFor,
    ...tags,
    ...categoryTerms,
  ]);
  const crystalText = crystalTerms.length > 0 ? `水晶包含${crystalTerms.join("、")}。` : "";
  const benefitText = benefits.length > 0
    ? `適合${benefits.join("、")}的人。`
    : product.description?.trim() || product.subtitle?.trim() || "適合想依照商品能量方向挑選水晶飾品的人。";
  const answer = `「${product.name}」${product.isMonthlyLimited ? "是每月限量商品，" : ""}${crystalText}${benefitText}價格 ${productPriceText(product)}，商品連結：${PUBLIC_SITE}/products/${product.id}`;
  const embedText = uniqueTerms([
    product.name,
    product.id,
    product.subtitle,
    product.description,
    product.story,
    ...limitedTerms,
    ...crystalTerms,
    ...benefits,
    ...suitableFor,
    ...tags,
    ...categoryTerms,
  ], 80).join(" ");

  return {
    id: `product-${product.id}`,
    question: `${product.name}適合什麼需求？`,
    answer,
    embedText,
    keywords,
    category: "商品推薦",
    relatedProductIds: [product.id],
  };
}

export async function ensureChatbotKnowledgeTable() {
  if (chatbotKnowledgeTableEnsured) return;
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`chatbotKnowledge\` (
      \`id\` varchar(128) NOT NULL,
      \`sourceType\` varchar(32) NOT NULL,
      \`sourceId\` varchar(64) NOT NULL,
      \`question\` text NOT NULL,
      \`answer\` text NOT NULL,
      \`embedText\` text NOT NULL,
      \`keywords\` json,
      \`category\` varchar(64) NOT NULL,
      \`relatedProductIds\` json,
      \`vector\` json,
      \`active\` boolean NOT NULL DEFAULT true,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    )
  `);
  try {
    await db.execute(sql`CREATE INDEX \`chatbot_knowledge_source_idx\` ON \`chatbotKnowledge\` (\`sourceType\`, \`sourceId\`)`);
  } catch { /* index already exists */ }
  try {
    await db.execute(sql`CREATE INDEX \`chatbot_knowledge_active_idx\` ON \`chatbotKnowledge\` (\`active\`)`);
  } catch { /* index already exists */ }
  chatbotKnowledgeTableEnsured = true;
}

export async function embedKnowledgeText(text: string): Promise<number[] | null> {
  if (!ENV.geminiApiKey) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${ENV.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] },
        }),
      }
    );
    if (!res.ok) {
      console.warn("[chatbotKnowledge] embedding failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json() as { embedding?: { values?: number[] } };
    return data.embedding?.values ?? null;
  } catch (error) {
    console.warn("[chatbotKnowledge] embedding request failed:", error);
    return null;
  }
}

export async function syncProductKnowledge(product: ProductKnowledgeSource) {
  const db = await getDb();
  if (!db) return;
  await ensureChatbotKnowledgeTable();

  if (product.category === "test") {
    await removeProductKnowledge(product.id);
    return;
  }

  const chunk = buildProductKnowledgeChunk(product);
  const vector = await embedKnowledgeText(chunk.embedText);
  const existing = vector
    ? []
    : await db
        .select({ embedText: chatbotKnowledge.embedText, vector: chatbotKnowledge.vector })
        .from(chatbotKnowledge)
        .where(eq(chatbotKnowledge.id, chunk.id))
        .limit(1);
  const vectorToStore = vector ?? (existing[0]?.embedText === chunk.embedText ? existing[0]?.vector : null);

  await db.insert(chatbotKnowledge).values({
    id: chunk.id,
    sourceType: "product",
    sourceId: product.id,
    question: chunk.question,
    answer: chunk.answer,
    embedText: chunk.embedText,
    keywords: chunk.keywords,
    category: chunk.category,
    relatedProductIds: chunk.relatedProductIds,
    vector: vectorToStore,
    active: product.active,
  }).onDuplicateKeyUpdate({
    set: {
      question: chunk.question,
      answer: chunk.answer,
      embedText: chunk.embedText,
      keywords: chunk.keywords,
      category: chunk.category,
      relatedProductIds: chunk.relatedProductIds,
      vector: vectorToStore,
      active: product.active,
    },
  });
}

export async function syncProductKnowledgeById(productId: string) {
  const db = await getDb();
  if (!db) return;
  const rows = await db
    .select()
    .from(dbProducts)
    .where(eq(dbProducts.id, productId))
    .limit(1);
  if (rows[0]) await syncProductKnowledge(rows[0]);
}

export async function removeProductKnowledge(productId: string) {
  const db = await getDb();
  if (!db) return;
  await ensureChatbotKnowledgeTable();
  await db.delete(chatbotKnowledge).where(eq(chatbotKnowledge.id, `product-${productId}`));
}

async function loadDynamicKnowledgeChunks(): Promise<DynamicKnowledgeChunk[]> {
  const db = await getDb();
  if (!db) return [];
  await ensureChatbotKnowledgeTable();
  const rows = await db
    .select()
    .from(chatbotKnowledge)
    .where(eq(chatbotKnowledge.active, true));

  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    embedText: row.embedText,
    keywords: row.keywords ?? [],
    category: row.category,
    relatedProductIds: row.relatedProductIds ?? undefined,
    vector: row.vector,
  }));
}

// ─── Embedding 向量搜尋 ──────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function keywordHitCount(query: string, chunk: KnowledgeChunk): number {
  const q = query.toLowerCase();
  return chunk.keywords.filter(
    (k) => q.includes(k.toLowerCase()) || k.toLowerCase().includes(q)
  ).length;
}

/** 關鍵字命中的加權分數，讓「商品推薦」在顧客直接打出水晶名時能進入排序並觸發商品卡 */
function keywordBoostScore(chunk: KnowledgeChunk, hits: number): number {
  if (hits <= 0) return 0;
  if (chunk.category === "商品推薦") {
    return Math.min(0.78, 0.73 + 0.02 * Math.min(hits - 1, 3));
  }
  return Math.min(0.92, 0.6 + 0.12 * Math.min(hits, 3));
}

export type ScoredChunk = KnowledgeChunk & { score: number };

export async function searchKnowledge(
  query: string,
  queryVector: number[],
  topK = 3,
  threshold = 0.45
): Promise<ScoredChunk[]> {
  // 問答與商品知識都存在資料庫（chatbotKnowledge），由後台與商品資料維護
  const chunks = await loadDynamicKnowledgeChunks();

  const scoreChunk = (chunk: DynamicKnowledgeChunk): ScoredChunk => {
    const { vector, ...rest } = chunk;
    const vecScore = vector ? cosineSimilarity(queryVector, vector) : 0;
    const hits = keywordHitCount(query, chunk);
    const kwScore = keywordBoostScore(chunk, hits);
    return { ...rest, score: Math.max(vecScore, kwScore) };
  };

  return chunks
    .map(scoreChunk)
    .filter((c) => c.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

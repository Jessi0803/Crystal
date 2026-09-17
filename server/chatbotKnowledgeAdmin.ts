/**
 * AI 客服知識庫後台管理
 * - 問答（sourceType = "faq"）：管理員新增、編輯、停用、刪除，儲存時自動產生向量
 * - 商品知識（sourceType = "product"）：由商品資料自動產生，後台只能查看與重新同步
 */
import crypto from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { chatbotKnowledge } from "../drizzle/schema";
import { buildFaqEmbedText, type FaqCategory } from "@shared/chatbotKnowledge";
import { getDb } from "./db";
import {
  embedKnowledgeText,
  ensureChatbotKnowledgeTable,
  syncProductKnowledgeById,
} from "./crystalKnowledge";

export class KnowledgeAdminError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "READ_ONLY",
    message: string
  ) {
    super(message);
    this.name = "KnowledgeAdminError";
  }
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureChatbotKnowledgeTable();
  return db;
}

export type FaqInput = {
  question: string;
  answer: string;
  keywords: string[];
  category: FaqCategory;
  active: boolean;
};

export type KnowledgeEntry = {
  id: string;
  sourceType: string;
  sourceId: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
  active: boolean;
  hasVector: boolean;
  updatedAt: Date;
};

/** 列表不回傳向量本身（每筆數萬字元），只回傳是否已產生 */
export async function listKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  const db = await requireDb();
  const rows = await db
    .select({
      id: chatbotKnowledge.id,
      sourceType: chatbotKnowledge.sourceType,
      sourceId: chatbotKnowledge.sourceId,
      question: chatbotKnowledge.question,
      answer: chatbotKnowledge.answer,
      keywords: chatbotKnowledge.keywords,
      category: chatbotKnowledge.category,
      active: chatbotKnowledge.active,
      hasVector: sql<number>`${chatbotKnowledge.vector} IS NOT NULL`,
      updatedAt: chatbotKnowledge.updatedAt,
    })
    .from(chatbotKnowledge)
    .orderBy(asc(chatbotKnowledge.sourceType), asc(chatbotKnowledge.category), asc(chatbotKnowledge.createdAt));
  return rows.map(({ hasVector, keywords, ...row }) => ({
    ...row,
    keywords: keywords ?? [],
    hasVector: Number(hasVector) === 1,
  }));
}

async function getFaq(id: string) {
  const db = await requireDb();
  const [row] = await db.select().from(chatbotKnowledge).where(eq(chatbotKnowledge.id, id)).limit(1);
  if (!row) throw new KnowledgeAdminError("NOT_FOUND", "找不到這則問答");
  if (row.sourceType !== "faq") {
    throw new KnowledgeAdminError("READ_ONLY", "商品知識由商品資料自動產生，請到商品管理修改");
  }
  return row;
}

export function newFaqId() {
  return `faq-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}

/**
 * 新增或更新問答。向量產生失敗時仍會儲存（僅能靠關鍵字被找到），並回傳 vectorReady=false 讓後台提示。
 */
export async function saveFaq(input: FaqInput & { id?: string }) {
  const db = await requireDb();
  const embedText = buildFaqEmbedText(input.question, input.keywords);
  const existing = input.id ? await getFaq(input.id) : null;

  let vector = existing && existing.embedText === embedText ? existing.vector : null;
  if (!vector) vector = await embedKnowledgeText(embedText);

  const values = {
    question: input.question,
    answer: input.answer,
    embedText,
    keywords: input.keywords,
    category: input.category,
    relatedProductIds: null,
    vector,
    active: input.active,
  };

  const id = existing?.id ?? newFaqId();
  if (existing) {
    await db.update(chatbotKnowledge).set(values).where(and(eq(chatbotKnowledge.id, id), eq(chatbotKnowledge.sourceType, "faq")));
  } else {
    await db.insert(chatbotKnowledge).values({ id, sourceType: "faq", sourceId: id, ...values });
  }
  return { id, vectorReady: Array.isArray(vector) && vector.length > 0 };
}

export async function setFaqActive(id: string, active: boolean) {
  const db = await requireDb();
  await getFaq(id);
  await db.update(chatbotKnowledge).set({ active }).where(and(eq(chatbotKnowledge.id, id), eq(chatbotKnowledge.sourceType, "faq")));
}

export async function deleteFaq(id: string) {
  const db = await requireDb();
  await getFaq(id);
  await db.delete(chatbotKnowledge).where(and(eq(chatbotKnowledge.id, id), eq(chatbotKnowledge.sourceType, "faq")));
}

/** 重新產生向量：問答直接重算；商品知識改由商品資料重新同步 */
export async function refreshKnowledgeVector(id: string) {
  const db = await requireDb();
  const [row] = await db.select().from(chatbotKnowledge).where(eq(chatbotKnowledge.id, id)).limit(1);
  if (!row) throw new KnowledgeAdminError("NOT_FOUND", "找不到這則知識");

  if (row.sourceType === "product") {
    await syncProductKnowledgeById(row.sourceId);
  } else {
    const vector = await embedKnowledgeText(row.embedText);
    if (vector) await db.update(chatbotKnowledge).set({ vector }).where(eq(chatbotKnowledge.id, id));
  }

  const [updated] = await db
    .select({ vector: chatbotKnowledge.vector })
    .from(chatbotKnowledge)
    .where(eq(chatbotKnowledge.id, id))
    .limit(1);
  return { vectorReady: Array.isArray(updated?.vector) && updated.vector.length > 0 };
}

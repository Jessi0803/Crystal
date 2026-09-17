/**
 * 一次性把程式內建的固定問答（server/crystalKnowledge.ts）搬進 chatbotKnowledge，改由後台管理。
 *
 * - 以目前的問題與關鍵字重新產生向量（順便補上缺少向量、向量過期的問答）
 * - 所有向量都成功後才在同一個 transaction 內寫入；資料庫一出現問答，內建固定問答就不再使用，
 *   分批寫入會讓 AI 暫時只剩部分問答
 * - 已存在相同 id 的問答不會被覆蓋
 *
 * 預覽：npx tsx scripts/migrate-static-faq.ts
 * 寫入：npx tsx scripts/migrate-static-faq.ts --apply
 * 使用 .env 的 DATABASE_URL 與 GEMINI_API_KEY。
 */
import "dotenv/config";
import { inArray } from "drizzle-orm";
import { chatbotKnowledge } from "../drizzle/schema";
import { buildFaqEmbedText, FAQ_CATEGORIES, parseKeywords, type FaqCategory } from "../shared/chatbotKnowledge";
import { embedKnowledgeText, ensureChatbotKnowledgeTable, knowledgeChunks } from "../server/crystalKnowledge";
import { getDb } from "../server/db";

const apply = process.argv.includes("--apply");

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is required");
  await ensureChatbotKnowledgeTable();

  const invalid = knowledgeChunks.filter(
    (chunk) => !FAQ_CATEGORIES.includes(chunk.category as FaqCategory) || chunk.relatedProductIds?.length
  );
  if (invalid.length > 0) {
    throw new Error(`內建問答含有無法搬移的資料：${invalid.map((chunk) => chunk.id).join(", ")}`);
  }

  const existing = await db
    .select({ id: chatbotKnowledge.id })
    .from(chatbotKnowledge)
    .where(inArray(chatbotKnowledge.id, knowledgeChunks.map((chunk) => chunk.id)));
  const existingIds = new Set(existing.map((row) => row.id));
  const pending = knowledgeChunks.filter((chunk) => !existingIds.has(chunk.id));

  console.log(`mode: ${apply ? "APPLY" : "dry-run"}`);
  console.log({ bundled: knowledgeChunks.length, alreadyInDatabase: existingIds.size, toInsert: pending.length });
  const byCategory: Record<string, number> = {};
  for (const chunk of pending) byCategory[chunk.category] = (byCategory[chunk.category] ?? 0) + 1;
  console.log("by category:", byCategory);
  if (!apply || pending.length === 0) {
    if (!apply) console.log("dry-run only; re-run with --apply to write");
    return;
  }

  const rows = [];
  for (const chunk of pending) {
    const keywords = parseKeywords(chunk.keywords);
    // 沿用原本較完整的 embedText；缺少時才以問題與關鍵字組成
    const embedText = chunk.embedText?.trim() || buildFaqEmbedText(chunk.question, keywords);
    const vector = await embedKnowledgeText(embedText);
    if (!vector) throw new Error(`產生向量失敗：${chunk.id}，未寫入任何資料`);
    rows.push({
      id: chunk.id,
      sourceType: "faq",
      sourceId: chunk.id,
      question: chunk.question,
      answer: chunk.answer,
      embedText,
      keywords,
      category: chunk.category,
      relatedProductIds: null,
      vector,
      active: true,
    });
    process.stdout.write(".");
  }
  console.log("");

  await db.transaction(async (tx) => {
    for (const row of rows) await tx.insert(chatbotKnowledge).values(row);
  });
  console.log(`inserted ${rows.length} FAQ entries`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });

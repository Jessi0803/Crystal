import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { searchKnowledge, type ScoredChunk } from "../crystalKnowledge";
import { ENV } from "../_core/env";
import { products } from "../../client/src/lib/data";
import { chatbotLogs, dbProducts } from "../../drizzle/schema";

const SYSTEM_PROMPT = `你是「椛˙Crystal」水晶店的 AI 顧問助理，名叫「椛小助」。

你的角色：
- 以溫柔、專業、有親和力的口吻回答問題
- 根據提供的知識庫內容回答，不要編造不在知識庫中的資訊
- 當顧客描述能量需求（如招桃花、提升人緣、改善健康、化解小人等），若知識庫中沒有完全符合的現貨商品，可推薦客製化手鍊服務，說明可以依功效需求量身設計，並附上連結 https://goodaytarot.com/custom
- 當顧客指定想找的水晶種類，但知識庫或現貨清單沒有該晶石時，必須誠實說「目前現貨沒有這款晶石」；可以提供功效相近或能量方向相近的現貨替代款。不可說客製化方案一定會有、一定能做、可指定取得該晶石；若提到客製化，只能說可與店家討論需求與可用材料
- 如果知識庫中沒有相關資訊且不屬於能量需求類問題，誠實告知並建議聯繫 LINE 客服：https://line.me/R/ti/p/@011tymeh
- 當顧客描述需求（如想提升自信、財運、愛情等），或指定想找的水晶種類（如粉晶、草莓晶、月光石等），根據知識庫推薦適合的現貨款式並附上商品連結
- 使用繁體中文回答
- 字數：整則回答請控制在 200 字以內；以讀者看到的字元為準，每一行完整貼上的 https 商品連結不計入 200 字，其餘說明、品名、標點、換行皆須計入
- 語意完整：每句話須寫到自然結尾（句號、驚嘆號或問號皆可），禁止停在半句、破折、或未寫完的詞（例如「椛小」）
- 開頭精簡：不要「您好」「感謝您的詢問」等冗長客套；第一句就切入重點（也無須再次自稱椛小助）

回答格式：
- 直接回答問題，不需要自我介紹
- 推薦商品時列出商品名稱、簡短說明適合原因、商品連結
- 當語境中出現【可推薦的相關商品】且註明與下方商品卡一致時，推薦現貨僅能使用該清單上的款式；款數、品名、連結須與清單完全一致，須逐款寫出並附上清單中的完整 https 連結，不可只介紹其中幾款，也不可新增清單外的現貨品名；說明適合原因時仍可依顧客問題自由發揮
- 若須介紹【可推薦的相關商品】清單，請先逐款寫出「品名＋該款的完整 https 商品連結」（可每款一行），再寫簡短適合原因，避免因篇幅或截斷停在「推薦」「如下」等未接品名、未貼連結的半句
- 若已有【可推薦的相關商品】清單，勿寫「沒有推薦商品」「沒有現貨可推薦」「沒有符合的現貨」等概括否定（彷彿店內完全無現貨可參考）。若顧客點名的主石或款式不在該清單內，請先用一兩句說明落差（例如現貨無該主石為主的款式）；若你接著要介紹清單上的款式作為替代參考，須依清單逐款寫出品名與清單內的完整 https 連結，與上文說明銜接自然即可。不可補充「客製化就會有該指定晶石」
- 若有列出連結，必須逐字複製該完整 https 網址到回答中，不可省略、改寫，也不可使用「請插入連結」「知識庫未提供」等占位文字
- 使用適當的換行讓回答易讀
- 不使用 markdown 格式，不使用 **粗體**、*斜體*、# 標題等符號`;

const PUBLIC_SITE = "https://goodaytarot.com";
export const CHATBOT_MAX_MESSAGE_LENGTH = 500;

/** RAG 注入時截斷過長答案，降低輸入過長造成輸出被截斷或語意異常的機率 */
function clipKnowledgeAnswer(text: string, maxChars = 240): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}…（後略）`;
}

/** 對話中可能寫全名或省略「手鍊」後綴，皆視為有引用該品 */
function productCitationAliases(name: string): string[] {
  const n = name.trim();
  const aliases = new Set<string>();
  if (n.length >= 2) aliases.add(n);
  if (n.endsWith("手鍊") && n.length > "手鍊".length + 1) {
    const base = n.slice(0, -2).trim();
    if (base.length >= 2) aliases.add(base);
  }
  return Array.from(aliases);
}

/**
 * 僅保留回覆中實際寫出連結或品名的款式，使商品卡與文字一致（避免截斷在「推薦」卻仍出現卡片）。
 */
function filterRelatedProductsCitedInReply<T extends { id: string; name: string }>(
  reply: string,
  related: T[]
): T[] {
  return related.filter((p) => {
    const abs = `${PUBLIC_SITE}/products/${p.id}`;
    if (reply.includes(abs) || reply.includes(`/products/${p.id}`)) return true;
    for (const alias of productCitationAliases(p.name)) {
      if (reply.includes(alias)) return true;
    }
    return false;
  });
}

async function generateAnswer(
  systemPrompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
  maxTokens = 2048
): Promise<string> {
  const contents = [
    ...history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${ENV.geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    console.error("[chatbot] generateContent error:", res.status, err);
    throw new Error(`Gemini generateContent failed: ${res.status} – ${err}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
  };
  if (data.promptFeedback?.blockReason) {
    console.warn("[chatbot] promptFeedback blockReason:", data.promptFeedback.blockReason);
  }
  const candidate = data.candidates?.[0];
  if (!candidate) {
    console.warn("[chatbot] empty candidates");
    return "抱歉，目前無法完成回覆，請稍後再試，或透過 LINE 聯繫客服：https://line.me/R/ti/p/@011tymeh";
  }
  const text =
    candidate.content?.parts
      ?.map((part) => part.text ?? "")
      .join("") ?? "";
  if (candidate.finishReason === "MAX_TOKENS" && text.length > 0) {
    console.warn("[chatbot] reply hit maxOutputTokens (truncated):", text.length, "chars");
  }
  return text.trim() || "抱歉，我現在無法回答，請稍後再試。";
}

async function embedQuery(text: string): Promise<number[]> {
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
  if (!res.ok) throw new Error(`Gemini embed failed: ${res.status}`);
  const data = await res.json() as { embedding: { values: number[] } };
  return data.embedding.values;
}

type ChatbotRelatedProduct = {
  id: string;
  name: string;
  price: number;
  image?: string;
  href: string;
};

type RelatedProductForChat = {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  image: string;
};

export function selectRelatedProductIds(
  relevantChunks: ScoredChunk[],
  scoreMin = 0.55,
  maxProducts = 6
): string[] {
  const matchingChunks = relevantChunks
    .filter(
      (chunk) =>
        chunk.category === "商品推薦" &&
        (chunk.relatedProductIds?.length ?? 0) > 0 &&
        chunk.score >= scoreMin
    )
    .sort((a, b) => b.score - a.score);

  const standaloneProductChunks = matchingChunks.filter((chunk) => chunk.id.startsWith("product-"));
  const fallbackRecommendationChunks = matchingChunks.filter((chunk) => !chunk.id.startsWith("product-"));
  const chunksToUse =
    standaloneProductChunks.length >= 2
      ? standaloneProductChunks
      : [...standaloneProductChunks, ...fallbackRecommendationChunks.slice(0, 2)];

  return Array.from(new Set(chunksToUse.flatMap((chunk) => chunk.relatedProductIds ?? []))).slice(0, maxProducts);
}

function normalizeProductImageUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed.includes("drive.google.com")) return trimmed;
  const fileMatch = trimmed.match(/\/file\/d\/([^/?#]+)/);
  const idMatch = trimmed.match(/[?&]id=([^&#]+)/);
  const id = fileMatch?.[1] ?? idMatch?.[1];
  return id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600` : trimmed;
}

export async function loadRelatedProducts(productIds: string[]): Promise<RelatedProductForChat[]> {
  if (productIds.length === 0) return [];

  const byId = new Map<string, RelatedProductForChat>();
  const db = await getDb();

  if (db) {
    try {
      const rows = await db
        .select({
          id: dbProducts.id,
          name: dbProducts.name,
          subtitle: dbProducts.subtitle,
          price: dbProducts.price,
          image: dbProducts.image,
        })
        .from(dbProducts)
        .where(and(
          inArray(dbProducts.id, productIds),
          eq(dbProducts.active, true),
          sql`${dbProducts.category} != 'test'`
        ));

      for (const row of rows) {
        byId.set(row.id, {
          id: row.id,
          name: row.name,
          subtitle: row.subtitle ?? "",
          price: row.price,
          image: normalizeProductImageUrl(row.image),
        });
      }
    } catch (error) {
      console.warn("[chatbot] failed to load related products from DB:", error);
    }
  }

  for (const id of productIds) {
    if (byId.has(id)) continue;
    const product = products.find((p) => p.id === id && p.category !== "test");
    if (!product) continue;
    byId.set(id, {
      id: product.id,
      name: product.name,
      subtitle: product.subtitle,
      price: product.price,
      image: normalizeProductImageUrl(product.image),
    });
  }

  return productIds.map((id) => byId.get(id)).filter((p): p is RelatedProductForChat => Boolean(p));
}

async function saveChatbotLog(params: {
  sessionId: string;
  userId?: number | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerQuestion: string;
  botReply: string;
  relatedProducts: ChatbotRelatedProduct[];
  retrievedQuestions: string[];
  pagePath?: string | null;
}) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(chatbotLogs).values({
      sessionId: params.sessionId.slice(0, 64),
      userId: params.userId ?? null,
      customerName: params.customerName?.slice(0, 100) ?? null,
      customerEmail: params.customerEmail?.slice(0, 320) ?? null,
      customerQuestion: params.customerQuestion,
      botReply: params.botReply,
      relatedProducts: params.relatedProducts,
      retrievedQuestions: params.retrievedQuestions,
      pagePath: params.pagePath?.slice(0, 255) ?? null,
    });
  } catch (error) {
    console.warn("[chatbot] failed to save log:", error);
  }
}

export const chatbotRouter = router({
  chat: publicProcedure
    .input(
      z.object({
        message: z.string().min(1).max(CHATBOT_MAX_MESSAGE_LENGTH),
        sessionId: z.string().min(1).max(64).optional(),
        pagePath: z.string().max(255).optional(),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().max(CHATBOT_MAX_MESSAGE_LENGTH * 2),
            })
          )
          .max(10)
          .default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const sessionId = input.sessionId || `server-${Date.now()}`;
      const baseLog = {
        sessionId,
        userId: ctx.user?.id ?? null,
        customerName: ctx.user?.name ?? null,
        customerEmail: ctx.user?.email ?? null,
        customerQuestion: input.message,
        pagePath: input.pagePath ?? null,
      };

      // 1. embed 用戶問題（加入最近一輪對話提升語意準確度）
      const lastTurn = input.history.slice(-2).map((h) => h.content).join(" ");
      const queryText = lastTurn ? `${lastTurn} ${input.message}` : input.message;
      let queryVector: number[];
      try {
        queryVector = await embedQuery(queryText);
      } catch (e) {
        console.error("[chatbot] embed error:", e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Embed failed: ${e instanceof Error ? e.message : String(e)}` });
      }

      // 2. RAG 檢索
      const relevantChunks = await searchKnowledge(queryText, queryVector, 10, 0.45);
      const hasUnavailableCrystalMatch = relevantChunks.some(
        (chunk) => chunk.id.endsWith("-unavailable") && chunk.score >= 0.55
      );
      const chunksForAnswer = hasUnavailableCrystalMatch
        ? relevantChunks.filter((chunk) => chunk.id.endsWith("-unavailable") || chunk.category !== "商品推薦")
        : relevantChunks;

      // 3. 關聯商品：合併最高分的相關推薦，讓複合需求可看到更多但仍精準的選項。
      const PRODUCT_SCORE_MIN = 0.55;
      const relatedProductIds = hasUnavailableCrystalMatch
        ? []
        : selectRelatedProductIds(
            relevantChunks,
            PRODUCT_SCORE_MIN
          );
      const relatedProducts = await loadRelatedProducts(relatedProductIds);

      // 4. 組建 RAG 上下文
      let ragContext = "";
      if (chunksForAnswer.length > 0) {
        ragContext =
          "\n\n【相關常見問題】\n" +
          chunksForAnswer
            .map((c) => `Q: ${c.question}\nA: ${clipKnowledgeAnswer(c.answer)}`)
            .join("\n\n");
      }

      if (relatedProducts.length > 0) {
        const n = relatedProducts.length;
        ragContext +=
          `\n\n【可推薦的相關商品（以下 ${n} 款；僅當你在回答中寫出該款的品名或完整商品 https 連結時，聊天室才會顯示對應商品卡；推薦的現貨必須與此清單完全一致）】\n` +
          relatedProducts
            .map(
              (p, i) =>
                `${i + 1}. ${p.name}（NT$${p.price}）\n   簡述：${p.subtitle}\n   連結（請於回答中逐字使用）：${PUBLIC_SITE}/products/${p.id}`
            )
            .join("\n\n");
      }

      // 當沒有撈到任何相關結果時，補入客製化服務資訊作為備援
      const hasGoodMatch = relevantChunks.some((c) => c.score >= 0.5);
      if (!hasGoodMatch) {
        ragContext +=
          "\n\n【備援資訊】\n" +
          "若顧客的功效需求在現有商品中找不到完全符合的款式，可推薦「客製化水晶手鍊」服務。" +
          "老闆會根據功效需求（如招桃花、改善健康、化解小人、提升某種特定運勢等）量身設計專屬手鍊。" +
          "若顧客指定某種晶石但知識庫或現貨沒有，請誠實說明目前現貨沒有，優先提供功效或能量方向相近的替代現貨；不可承諾客製化一定會有該指定晶石，只能說可與店家討論需求與可用材料。" +
          "客製化方案頁面：https://goodaytarot.com/custom\n" +
          "也歡迎透過 LINE 詢問：https://line.me/R/ti/p/@011tymeh";
      }

      // 5. 呼叫 Gemini 生成回答
      const reply = await generateAnswer(
        SYSTEM_PROMPT + ragContext,
        input.history.slice(-10),
        input.message,
        2048
      );

      const productsForClient = filterRelatedProductsCitedInReply(reply, relatedProducts);
      if (relatedProducts.length > 0 && productsForClient.length < relatedProducts.length) {
        console.warn(
          "[chatbot] relatedProducts filtered to reply citations:",
          productsForClient.length,
          "/",
          relatedProducts.length
        );
      }

      const responseProducts = productsForClient.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        href: `/products/${p.id}`,
      }));
      const retrievedQuestions = chunksForAnswer.map((c) => c.question);

      await saveChatbotLog({
        ...baseLog,
        botReply: reply,
        relatedProducts: responseProducts,
        retrievedQuestions,
      });

      return {
        reply,
        relatedProducts: productsForClient.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          image: p.image,
          href: `/products/${p.id}`,
        })),
        retrievedChunks: retrievedQuestions,
      };
    }),

  listLogs: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
        search: z.string().max(100).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const conditions = [];
      const search = input.search?.trim();
      if (search) {
        const term = `%${search}%`;
        conditions.push(
          or(
            sql`${chatbotLogs.customerQuestion} LIKE ${term}`,
            sql`${chatbotLogs.botReply} LIKE ${term}`,
            sql`${chatbotLogs.customerEmail} LIKE ${term}`,
            sql`${chatbotLogs.customerName} LIKE ${term}`,
            sql`CAST(${chatbotLogs.relatedProducts} AS CHAR) LIKE ${term}`,
            sql`CAST(${chatbotLogs.retrievedQuestions} AS CHAR) LIKE ${term}`
          )
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const rowsQuery = db
        .select()
        .from(chatbotLogs)
        .orderBy(desc(chatbotLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      const countQuery = db
        .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
        .from(chatbotLogs);

      const [items, countRows] = await Promise.all([
        where ? rowsQuery.where(where) : rowsQuery,
        where ? countQuery.where(where) : countQuery,
      ]);

      return {
        items,
        total: Number(countRows[0]?.count ?? 0),
      };
    }),

  deleteLogs: adminProcedure
    .input(
      z.object({
        ids: z.array(z.number().int().positive()).min(1).max(100),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const ids = Array.from(new Set(input.ids));
      await db.delete(chatbotLogs).where(inArray(chatbotLogs.id, ids));
      return { success: true, deletedCount: ids.length };
    }),
});

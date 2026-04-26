import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { searchKnowledge } from "../crystalKnowledge";
import { ENV } from "../_core/env";
import { products } from "../../client/src/lib/data";

const PRODUCTS_INFO = `
【在售手鍊商品與功效】
1. 月下密語手鍊（NT$1,480）商品連結：/products/d001-moon-secret
   功效：淨化負能量與過去不好記憶、釋放壓力焦慮、增強直覺靈感與創造力、提升自信勇氣與表達力、招人緣並防護外在負能量
   適合：壓力大、情緒不穩、希望穩定情緒並提升魅力溝通力者

2. 蜜光之境手鍊（NT$1,580）商品連結：/products/d002-honey-realm
   功效：招財聚能並提升行動力、吸引愛情與好人緣、淨化並放大個人能量、強化保護力與穩定氣場、帶來活力與內在穩定、增強自信
   適合：想提升財運與人緣、正在衝刺工作目標、需要穩定情緒與防護力者

3. 維納斯 Venus（NT$950）商品連結：/products/d003-venus
   功效：提升自信與行動力、招財聚能並放大正向能量、穩定情緒與提升直覺力、柔化氣質並帶來內在平衡
   適合：想建立自信氣場、需要兼顧事業與情緒平衡、偏好輕量日常配戴者

4. 晨光輕語手鍊（NT$1,800）商品連結：/products/d004-morning-whisper
   功效：淨化負能量並穩定氣場、提升愛情運與好人緣、柔化情緒並增加安全感、增強直覺與感受力
   適合：希望穩定關係能量、容易受外界情緒影響、想提升人緣與溫柔魅力者

5. 月映淨心手鍊（NT$1,500）商品連結：/products/d005-moon-clear-heart
   功效：吸引愛情與好人緣、柔化心性並安撫情緒、淨化並放大正向能量、提升直覺與內在感受力、帶來溫柔且穩定的安全感
   適合：想穩定內在節奏、希望修復情緒與關係、偏好柔和月光系設計者`;

const SYSTEM_PROMPT = `你是「椛˙Crystal」水晶店的 AI 顧問助理，名叫「椛小助」。

你的角色：
- 以溫柔、專業、有親和力的口吻回答問題
- 根據提供的知識庫內容與商品功效資訊回答，不要編造資訊
- 如果知識庫中沒有相關資訊，誠實告知並建議聯繫 LINE 客服
- 當顧客描述自己的需求（如想提升自信、財運、愛情等），主動根據商品功效推薦最適合的款式，並附上商品連結
- 使用繁體中文回答
- 推薦商品時說明原因，但不過度推銷；一般問題回答不超過200字

回答格式：
- 直接回答問題，不需要自我介紹
- 推薦商品時列出商品名稱、簡短說明適合原因、商品連結
- 使用適當的換行讓回答易讀
- 不使用 markdown 格式，不使用 **粗體**、*斜體*、# 標題等符號

${PRODUCTS_INFO}`;

async function generateAnswer(
  systemPrompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
  maxTokens = 500
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
  const data = await res.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return data.candidates[0]?.content.parts[0]?.text ?? "抱歉，我現在無法回答，請稍後再試。";
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

export const chatbotRouter = router({
  chat: publicProcedure
    .input(
      z.object({
        message: z.string().min(1).max(500),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          )
          .max(10)
          .default([]),
      })
    )
    .mutation(async ({ input }) => {
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
      const relevantChunks = await searchKnowledge(queryText, queryVector, 3, 0.45);

      // 3. 找出關聯商品
      const relatedProductIds = new Set(
        relevantChunks.flatMap((c) => c.relatedProductIds ?? [])
      );
      const relatedProducts = products.filter((p) => relatedProductIds.has(p.id));

      // 4. 組建 RAG 上下文
      let ragContext = "";
      if (relevantChunks.length > 0) {
        ragContext =
          "\n\n【相關常見問題】\n" +
          relevantChunks
            .map((c) => `Q: ${c.question}\nA: ${c.answer}`)
            .join("\n\n");
      }

      if (relatedProducts.length > 0) {
        ragContext +=
          "\n\n【可推薦的相關商品】\n" +
          relatedProducts
            .map((p) => `- ${p.name}（NT$${p.price}）：${p.subtitle} 商品連結：/products/${p.id}`)
            .join("\n");
      }

      // 5. 呼叫 Gemini 生成回答
      const reply = await generateAnswer(
        SYSTEM_PROMPT + ragContext,
        input.history.slice(-10),
        input.message,
        1024
      );

      return {
        reply,
        relatedProducts: relatedProducts.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          image: p.image,
          href: `/products/${p.id}`,
        })),
        retrievedChunks: relevantChunks.map((c) => c.question),
      };
    }),
});

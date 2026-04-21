import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { searchKnowledge } from "../crystalKnowledge";
import { products } from "../../client/src/lib/data";

const SYSTEM_PROMPT = `你是「椛˙Crystal」水晶店的 AI 顧問助理，名叫「椛小助」。

你的角色：
- 以溫柔、專業、有親和力的口吻回答問題
- 根據提供的知識庫內容回答，不要編造不在知識庫中的資訊
- 如果知識庫中沒有相關資訊，誠實告知並建議聯繫 LINE 客服
- 適時推薦相關商品，但不要過度推銷
- 使用繁體中文回答
- 回答簡潔有力，不超過200字，重點清晰

回答格式：
- 直接回答問題，不需要自我介紹
- 如有相關商品，在回答末尾自然地提及
- 使用適當的換行讓回答易讀`;

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
      // 1. RAG 檢索：找出最相關的知識片段
      const relevantChunks = searchKnowledge(input.message, 3);

      // 2. 找出關聯商品
      const relatedProductIds = new Set(
        relevantChunks.flatMap((c) => c.relatedProductIds ?? [])
      );
      const relatedProducts = products.filter((p) =>
        relatedProductIds.has(p.id)
      );

      // 3. 組建 RAG 上下文
      let ragContext = "";
      if (relevantChunks.length > 0) {
        ragContext =
          "\n\n【相關知識庫資料】\n" +
          relevantChunks
            .map((c) => `## ${c.title}\n${c.content}`)
            .join("\n\n");
      }

      if (relatedProducts.length > 0) {
        ragContext +=
          "\n\n【可推薦的相關商品】\n" +
          relatedProducts
            .map(
              (p) =>
                `- ${p.name}（NT$${p.price}）：${p.subtitle} 商品連結：/products/${p.id}`
            )
            .join("\n");
      }

      // 4. 組建對話歷史
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        {
          role: "system",
          content: SYSTEM_PROMPT + ragContext,
        },
        // 加入最近的對話歷史（最多5輪）
        ...input.history.slice(-10).map((h) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
        {
          role: "user",
          content: input.message,
        },
      ];

      // 5. 呼叫 LLM 生成回答
      const result = await invokeLLM({ model: "gpt-4o-mini", messages, max_tokens: 1000 });
      const reply =
        result.choices[0]?.message?.content ?? "抱歉，我現在無法回答，請稍後再試。";

      return {
        reply: typeof reply === "string" ? reply : JSON.stringify(reply),
        relatedProducts: relatedProducts.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          image: p.image,
          href: `/products/${p.id}`,
        })),
        retrievedChunks: relevantChunks.map((c) => c.title), // 用於 debug
      };
    }),
});

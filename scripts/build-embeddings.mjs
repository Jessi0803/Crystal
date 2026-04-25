// 預計算 FAQ embedding，輸出到 server/faqEmbeddings.json
// 執行：node scripts/build-embeddings.mjs

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import * as dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY 未設定");
  process.exit(1);
}

const OUTPUT_PATH = join(__dirname, "../server/faqEmbeddings.json");

const knowledgeChunks = [
  {
    id: "faq-warranty",
    embedText: "手鍊有保固嗎 保固 維修 壞掉 換線 五金 損壞 免費 尺寸 設計費",
  },
  {
    id: "faq-care",
    embedText: "手鍊怎麼照顧 保養 注意事項 拉扯 洗澡 消磁 淨化 日常 戴著",
  },
  {
    id: "faq-cleanse",
    embedText: "手鍊怎麼淨化 淨化方法 水晶碎石 水晶洞 鼠尾草 月光 音叉 消磁",
  },
  {
    id: "faq-activate",
    embedText: "如何開啟水晶能量 許願 啟動 連結 願望 能量 開光",
  },
  {
    id: "faq-cleanse-frequency",
    embedText: "多久淨化一次 淨化頻率 幾次 暗沉 霧霧 消磁",
  },
  {
    id: "faq-reconnect",
    embedText: "淨化後重新連結 淨化完 重新許願 連結 紙 願望",
  },
  {
    id: "faq-custom-bcd-wish",
    embedText: "客製化BCD許願功效 客製化方案 指定功效 運勢 能量解析 塔羅 脈輪 生命靈數",
  },
  {
    id: "faq-custom-b-multi",
    embedText: "客製化B方案多題組 塔羅 多個題組 9折 優惠 搭配",
  },
  {
    id: "faq-wrist-size",
    embedText: "手圍怎麼量 尺寸 測量 皮尺 淨手圍 鬆緊",
  },
];

async function embed(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
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
    const err = await res.text();
    throw new Error(`Gemini embedding failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.embedding.values;
}

async function main() {
  let existing = [];
  if (existsSync(OUTPUT_PATH)) {
    existing = JSON.parse(readFileSync(OUTPUT_PATH, "utf-8"));
    console.log(`已有 ${existing.length} 筆 embedding`);
  }

  const existingIds = new Set(existing.map((e) => e.id));
  const newChunks = knowledgeChunks.filter((c) => !existingIds.has(c.id));

  if (newChunks.length === 0) {
    console.log("✅ 沒有新資料，無需更新");
    return;
  }

  console.log(`需要 embed ${newChunks.length} 筆新資料...`);

  const results = [...existing];
  for (const chunk of newChunks) {
    process.stdout.write(`  embedding: ${chunk.id} ... `);
    const vector = await embed(chunk.embedText);
    results.push({ id: chunk.id, vector });
    console.log("✓");
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\n✅ 完成！輸出至 server/faqEmbeddings.json（共 ${results.length} 筆）`);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});

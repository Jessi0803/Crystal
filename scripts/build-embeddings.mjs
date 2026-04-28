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
  {
    id: "faq-what-is-custom",
    embedText: "什麼是客製化手鍊 客製化 量身設計 專屬 獨一無二 功效 塔羅 脈輪 生命靈數",
  },
  {
    id: "faq-what-is-numerology",
    embedText: "什麼是生命靈數 生命靈數 數字學 出生年月日 天賦數 生命數 先天數 星座數 缺數",
  },
  {
    id: "faq-what-is-chakra",
    embedText: "什麼是脈輪 脈輪 七脈輪 海底輪 頂輪 能量中心 靈擺 能量平衡",
  },
  {
    id: "faq-how-to-order-custom",
    embedText: "客製化手鍊怎麼下單 下單 訂購 填寫表單 訂金 付款 LINE",
  },
  {
    id: "faq-custom-plans-diff",
    embedText: "客製化方案差別 四個方案 純客製 塔羅方案 脈輪方案 生命靈數方案 ABCD 比較",
  },
  {
    id: "faq-deposit-price",
    embedText: "訂金多少 訂金 尾款 費用 付款 多少錢 價格 方案費用",
  },
  {
    id: "faq-production-time",
    embedText: "製作多久 製作時間 等多久 完成時間 交貨 出貨時間 需要多久",
  },
  {
    id: "faq-free-revision",
    embedText: "可以免費修改嗎 修改 免費修改 改設計 不滿意 修改幾次",
  },
  {
    id: "faq-dislike-design",
    embedText: "不喜歡成品圖 成品圖 不滿意設計 修改 改款 設計不好看",
  },
  {
    id: "faq-refund",
    embedText: "可以退款嗎 退款 退貨 換貨 退換貨 不能退 瑕疵 損壞",
  },
  {
    id: "faq-fit-preference",
    embedText: "手鍊鬆緊 尺寸鬆緊 剛好 微鬆 鬆緊偏好 寬鬆 緊",
  },
  {
    id: "faq-default-clasp",
    embedText: "手鍊預設扣具 彈力繩 龍蝦扣 磁扣 扣具 預設 免費",
  },
  {
    id: "faq-clasp-diff",
    embedText: "龍蝦扣磁扣差別 龍蝦扣 磁扣 彈力繩 差別 比較 魚線 耐用",
  },
  {
    id: "faq-silver-tube-bead",
    embedText: "銀管 珠框 加銀管 加珠框 配件 裝飾",
  },
  {
    id: "faq-payment-methods",
    embedText: "付款方式 支付 信用卡 轉帳 ATM Apple Pay Paypal 海外付款",
  },
  {
    id: "faq-contact",
    embedText: "有問題怎麼聯絡 聯絡 客服 LINE 私訊 詢問 問題 聯繫",
  },
  {
    id: "faq-experience-course",
    embedText: "體驗課 生命靈數體驗課 課程內容 費用 報名 小班制 桃園 手作",
  },
  {
    id: "faq-workshop-who",
    embedText: "水晶創業班 適合誰 創業 手作 水晶事業 創業思維 SOP",
  },
  {
    id: "faq-workshop-price",
    embedText: "水晶創業全能班費用 創業班費用 課程內容 大綱 12888 桃園 報名",
  },
  {
    id: "faq-crystal-energy-real",
    embedText: "水晶能量真實嗎 水晶能量 是否有效 有用嗎 頻率 礦石 真的有效",
  },
  {
    id: "faq-wear-always",
    embedText: "一直戴著 睡覺戴 24小時 一直戴 睡眠時 配戴時間 可以一直戴嗎",
  },
  {
    id: "faq-broken-crystal",
    embedText: "水晶斷掉 水晶斷了 脫落 掉了 斷裂 代表什麼 不好的預兆",
  },
  {
    id: "faq-natural-crystal",
    embedText: "天然水晶嗎 是否天然 真的水晶 假的 合成 天然礦石 品質",
  },
  {
    id: "faq-see-design-first",
    embedText: "先看成品圖 成品圖確認 先看設計 看圖再付款 設計確認",
  },
  {
    id: "faq-ready-stock",
    embedText: "現貨 直接購買 馬上買 不用等 現成 有現貨嗎",
  },
  {
    id: "faq-shipping-methods",
    embedText: "配送方式 運送 黑貓 7-11 店到店 宅配 免運 寄送",
  },
  {
    id: "faq-shipping-fee",
    embedText: "運費多少 運費 宅配費 免運 運費計算",
  },
  {
    id: "faq-overseas-shipping",
    embedText: "海外寄送 寄到國外 海外配送 馬來西亞 香港 新加坡 美國 英國 澳洲 國際",
  },
  {
    id: "faq-dispatch-time",
    embedText: "出貨多久 出貨時間 何時出貨 幾天到 幾天出貨 快速出貨",
  },
  {
    id: "faq-tarot-topics",
    embedText: "塔羅可以問什麼 塔羅主題 占卜 感情 財運 職涯 療癒 前世今生 守護神 流年",
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

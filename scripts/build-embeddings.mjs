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
    id: "faq-production-time",
    embedText: "製作多久 製作時間 等多久 完成時間 交貨 出貨時間 需要多久",
  },
  {
    id: "faq-free-revision",
    embedText:
      "可以免費修改嗎 免費修改 初版 維修 改幾次 修改幾次 改手圍 手圍 新增條件 銀管 珠框 顏色 紫色 磁扣 龍蝦扣 第二次修改 再改一次 加收 200 重新設計 改設計 不滿意",
  },
  {
    id: "faq-dislike-design",
    embedText: "不喜歡成品圖 成品圖 不滿意設計 修改 改款 設計不好看 初版 免費修改 配飾 順序",
  },
  {
    id: "faq-revision-extra-conditions",
    embedText:
      "改手圍 換手圍 加銀管 加珠框 要銀管 要珠框 不要紫色 換磁扣 改磁扣 龍蝦扣 加價 加錢 200 重新設計 新增條件 客製修改",
  },
  {
    id: "faq-second-revision-fee",
    embedText: "第二次修改 再改一次 改第二次 修改費用 加收 200 幾次免費",
  },
  {
    id: "faq-refund",
    embedText: "可以退款嗎 退款 退貨 換貨 退換貨 不能退 瑕疵 損壞",
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
    id: "faq-tarot-topics",
    embedText: "塔羅可以問什麼 塔羅主題 占卜 感情 財運 職涯 療癒 前世今生 守護神 流年",
  },
  {
    id: "rec-confidence",
    embedText: "提升自信 自信心 魅力 吸引力 氣場 行動力 增強自信 建立自信 想變自信 自我提升",
  },
  {
    id: "rec-wealth",
    embedText: "招財 財運 財富 錢財 事業 工作 升遷 行動力 提升財運 招財手鍊 賺錢",
  },
  {
    id: "rec-love",
    embedText: "愛情 桃花 人緣 感情 戀愛 交友 吸引異性 提升桃花 正緣 好人緣 脫單",
  },
  {
    id: "rec-healing",
    embedText: "療癒 壓力 焦慮 情緒 安撫 紓壓 放鬆 不安 釋放壓力 情緒穩定 心情不好 負面情緒",
  },
  {
    id: "rec-protection",
    embedText: "防護 負能量 保護 氣場 淨化 穩定 防小人 避邪 保護能量 驅邪",
  },
  {
    id: "rec-crystal-rose-quartz",
    embedText:
      "粉晶 粉水晶 玫瑰石英 薔薇石英 rose quartz 想要粉晶 粉晶手鍊 粉晶推薦 有粉晶的手鍊嗎 粉晶款式 招桃花粉晶 人緣粉晶 愛情粉晶 推薦手鍊",
  },
  {
    id: "rec-crystal-strawberry",
    embedText: "草莓晶 草莓水晶 想要草莓晶 草莓晶手鍊 草莓晶推薦 有草莓晶的手鍊嗎 桃花草莓晶",
  },
  {
    id: "rec-crystal-moonstone",
    embedText:
      "月光石 月光石手鍊 藍月光 白月光 灰月光 月亮石 moonstone 想要月光石 有月光石的手鍊嗎 月光石推薦",
  },
  {
    id: "rec-crystal-citrine-rutilated",
    embedText: "黃水晶 銅髮晶 髮晶 招財水晶 財運水晶 想要黃水晶 黃水晶手鍊 銅髮晶手鍊 有黃水晶的手鍊嗎",
  },
  {
    id: "rec-crystal-green-phantom-unavailable",
    embedText: "綠幽靈 綠幽靈手鍊 綠幽靈推薦 有綠幽靈嗎 綠幽靈水晶 財運 事業 招財 替代款",
  },
  {
    id: "rec-crystal-obsidian",
    embedText: "黑曜石 黑曜石手鍊 想要黑曜石 黑曜石推薦 有黑曜石的手鍊嗎 避邪黑曜石",
  },
  {
    id: "rec-crystal-white-phantom-tourmaline",
    embedText:
      "白幽靈 白幽靈手鍊 紅兔毛 白兔毛 兔毛水晶 粉碧璽 想要白幽靈 有白幽靈的手鍊嗎 粉碧璽手鍊",
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

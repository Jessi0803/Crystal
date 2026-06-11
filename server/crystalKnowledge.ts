import { eq, sql } from "drizzle-orm";
import { chatbotKnowledge, dbProducts } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";

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
  const benefits = asStringArray(product.benefits);
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

async function ensureChatbotKnowledgeTable() {
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

async function embedKnowledgeText(text: string): Promise<number[] | null> {
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

export const knowledgeChunks: KnowledgeChunk[] = [
  {
    id: "faq-warranty",
    question: "手鍊有保固嗎？",
    answer:
      "我們3個月內有免費1次的保固，項目有：換線、五金汰換、損壞維修；水晶不見要補差額；如需改尺寸、改設計屬於重新設計，不包含在免費保固的範圍內，如有需要，需酌收200$重新設計費。",
    embedText: "手鍊有保固嗎 保固 維修 壞掉 換線 五金 損壞 免費 尺寸 設計費 水晶不見 補差額",
    keywords: ["保固", "維修", "換線", "五金", "損壞", "壞掉", "免費", "尺寸", "設計費", "水晶不見", "補差額"],
    category: "常見問題",
  },
  {
    id: "faq-care",
    question: "手鍊要怎麼照顧？",
    answer:
      "建議最少每月淨化與消磁1次、請勿以緊繃狀態拉扯水晶手鍊許久、飾品不適合佩戴洗澡，但如果非常想要24小時戴著，請選擇金飾。",
    embedText: "手鍊怎麼照顧 保養 注意事項 拉扯 洗澡 消磁 淨化 日常 戴著",
    keywords: ["照顧", "保養", "拉扯", "洗澡", "消磁", "注意事項", "24小時"],
    category: "常見問題",
  },
  {
    id: "faq-metal-material",
    question: "金屬是什麼材質呢？",
    answer:
      "銀飾：保色處理的鍍銀，如果沒有碰水的話，比純銀還不容易變色，目前也沒有客人反應說有過敏問題～\n\n金飾：14K包金\n\n如果想要碰水怕褪色的話，建議可以選擇金飾～",
    embedText: "金屬是什麼材質 金屬材質 銀飾 金飾 鍍銀 保色處理 純銀 不容易變色 過敏 14K包金 碰水 褪色",
    keywords: ["金屬", "材質", "銀飾", "金飾", "鍍銀", "保色", "純銀", "變色", "過敏", "14K", "包金", "碰水", "褪色"],
    category: "常見問題",
  },
  {
    id: "faq-cleanse",
    question: "手鍊怎麼淨化？",
    answer:
      "水晶碎石或水晶洞的話，就是單純放在上面就可以了！鼠尾草精油的話就是用水氧機把精油蒸出來，那個煙去過手鍊。月光的話就是可以放在照得到月光的地方放置一個晚上，要注意白天太陽出來的時候不要曬太久。天使音叉就是買來敲敲敲就可以了。另外，水晶碎石我們也有販售，80$一包是一條手鍊的量。",
    embedText: "手鍊怎麼淨化 淨化方法 水晶碎石 水晶洞 鼠尾草 月光 音叉 消磁",
    keywords: ["淨化", "消磁", "水晶碎石", "水晶洞", "鼠尾草", "月光", "音叉", "淨化方法"],
    category: "常見問題",
    relatedProductIds: ["crystal-chips"],
  },
  {
    id: "faq-activate",
    question: "如何開啟水晶能量？",
    answer:
      "雙手捧著手環，放在胸口，告訴水晶你的名字、你的願望。洗完澡後許願最佳。許願請使用正面訊息，不可詛咒。許願時不要三心二意。一條水晶手鍊只能附載一個願望。",
    embedText: "如何開啟水晶能量 許願 啟動 連結 願望 能量 開光",
    keywords: ["開啟", "許願", "能量", "願望", "啟動", "連結", "開光"],
    category: "常見問題",
  },
  {
    id: "faq-cleanse-frequency",
    question: "多久要淨化一次手鍊？",
    answer:
      "當你覺得水晶看起來比較暗沉、霧霧的就代表需要進行淨化囉～平時若有想到也可以隨時淨化。",
    embedText: "多久淨化一次 淨化頻率 幾次 暗沉 霧霧 消磁",
    keywords: ["多久", "頻率", "幾次", "暗沉", "霧霧", "淨化"],
    category: "常見問題",
  },
  {
    id: "faq-reconnect",
    question: "淨化後要重新和水晶連結嗎？",
    answer:
      "只要把你想說的話或願望寫在紙上，壓在淨化的容器下面就可以了。",
    embedText: "淨化後重新連結 淨化完 重新許願 連結 紙 願望",
    keywords: ["淨化後", "重新連結", "連結", "許願", "紙"],
    category: "常見問題",
  },
  {
    id: "faq-wrist-size",
    question: "手圍怎麼量？",
    answer:
      "拿皮尺平貼在想戴手鍊的位置上，計算出「淨手圍」，請不要自行+0.5cm、+1cm，如果需要微鬆、很鬆，可以跟我們說！我們會幫你調整。",
    embedText: "手圍怎麼量 尺寸 測量 皮尺 淨手圍 鬆緊",
    keywords: ["手圍", "尺寸", "測量", "皮尺", "淨手圍", "鬆緊", "怎麼量"],
    category: "常見問題",
  },
  // ── 新增 FAQ 35 題 ──────────────────────────────────────────────────────────
  {
    id: "faq-what-is-custom",
    question: "什麼是客製化手鍊？",
    answer: "客製化手鍊是由老闆根據您的個人需求（功效、色系、款式），或透過塔羅、脈輪、生命靈數分析後，為您量身設計的專屬水晶手鍊，每一條都是獨一無二的。詳細方案請見：https://goodaytarot.com/custom",
    embedText: "什麼是客製化手鍊 客製化 量身設計 專屬 獨一無二 功效 塔羅 脈輪 生命靈數",
    keywords: ["客製化", "量身設計", "專屬", "獨一無二", "客製化手鍊", "什麼是客製化"],
    category: "客製化",
  },
  {
    id: "faq-what-is-numerology",
    question: "什麼是生命靈數？",
    answer: "生命靈數是透過西元出生年月日，計算天賦數、生命數、先天數、星座數，找出能量缺數，再以對應水晶補足不足之處的數字學系統。",
    embedText: "什麼是生命靈數 生命靈數 數字學 出生年月日 天賦數 生命數 先天數 星座數 缺數",
    keywords: ["生命靈數", "數字學", "出生年月日", "天賦數", "生命數", "缺數"],
    category: "客製化",
  },
  {
    id: "faq-what-is-chakra",
    question: "什麼是脈輪？",
    answer: "脈輪是人體七個主要能量中心（從海底輪到頂輪），各自對應不同身心層面。老闆以靈擺與塔羅測出您的脈輪能量狀況，再利用水晶能量補足缺失，提升整體能量平衡。",
    embedText: "什麼是脈輪 脈輪 七脈輪 海底輪 頂輪 能量中心 靈擺 能量平衡",
    keywords: ["脈輪", "七脈輪", "海底輪", "頂輪", "能量中心", "靈擺"],
    category: "客製化",
  },
  {
    id: "faq-how-to-order-custom",
    question: "客製化手鍊怎麼下單？",
    answer: "請至 https://goodaytarot.com/custom 選擇方案，填寫諮詢表單後系統自動導入訂金付款頁面，付完訂金後加入官方 LINE 留下訂單編號與姓名即可。LINE：https://line.me/R/ti/p/@011tymeh",
    embedText: "客製化手鍊怎麼下單 下單 訂購 填寫表單 訂金 付款 LINE",
    keywords: ["怎麼下單", "下單", "訂購", "填表單", "表單", "訂金付款"],
    category: "客製化",
  },
  {
    id: "faq-custom-plans-diff",
    question: "四個客製化方案有什麼差別？",
    answer: "A 純客製：您提供功效需求，老闆量身設計。B 塔羅方案：透過塔羅牌解析能量缺口再設計。C 脈輪方案：以靈擺測出七脈輪狀態補足能量缺口。D 生命靈數：從出生年月日找出缺數，以水晶精準補足天賦。詳細說明：https://goodaytarot.com/custom",
    embedText: "客製化方案差別 四個方案 純客製 塔羅方案 脈輪方案 生命靈數方案 ABCD 比較",
    keywords: ["方案差別", "純客製", "塔羅方案", "脈輪方案", "生命靈數方案", "ABCD", "選擇方案"],
    category: "客製化",
  },
  {
    id: "faq-production-time",
    question: "製作需要多久時間？",
    answer: "製作時間依當前訂單量而定，請直接私訊官方 LINE 確認實際製作時間：https://line.me/R/ti/p/@011tymeh",
    embedText: "製作多久 製作時間 等多久 完成時間 交貨 出貨時間 需要多久",
    keywords: ["製作時間", "多久", "等多久", "完成時間", "交貨"],
    category: "客製化",
  },
  {
    id: "faq-free-revision",
    question: "可以免費修改嗎？初版或維修能改什麼？",
    answer:
      "我們提供免費一次改初版與維修可調整範圍內的修改；但不接受改手圍、新增條件（例如要銀管、要珠框、不要紫色、要磁扣等），因為這些屬於重新打掉設計，需加收 200 元，請在預約時直接透過官方 LINE 跟店家說明🤍 初版與維修在免費範圍內可調整的部分：有不喜歡的配飾可以更換、水晶／配飾擺放順序可調整，有不清楚的也歡迎詢問。若想再改第二次（含超出免費範圍的變更），需加收 200 元。LINE：https://line.me/R/ti/p/@011tymeh",
    embedText:
      "可以免費修改嗎 免費修改 初版 維修 改幾次 修改幾次 改手圍 手圍 新增條件 銀管 珠框 顏色 紫色 磁扣 龍蝦扣 第二次修改 再改一次 加收 200 重新設計 改設計 不滿意",
    keywords: [
      "免費修改",
      "初版",
      "維修",
      "改手圍",
      "銀管",
      "珠框",
      "磁扣",
      "第二次",
      "再改",
      "200",
      "新增條件",
      "重新設計",
    ],
    category: "客製化",
  },
  {
    id: "faq-dislike-design",
    question: "如果我不喜歡成品圖怎麼辦？",
    answer:
      "可在免費一次範圍內更換不喜歡的配飾、調整水晶與配飾的擺放順序；不清楚能否改的部分歡迎先問老闆🤍 若需要改手圍、新增材質或色系條件、更換扣具等，屬重新設計需加收 200 元，建議預約時就先透過官方 LINE 說明。第二次修改起每次加收 200 元。LINE：https://line.me/R/ti/p/@011tymeh",
    embedText: "不喜歡成品圖 成品圖 不滿意設計 修改 改款 設計不好看 初版 免費修改 配飾 順序",
    keywords: ["成品圖", "不喜歡", "不滿意", "修改設計", "改款", "配飾", "順序"],
    category: "客製化",
  },
  {
    id: "faq-revision-extra-conditions",
    question: "想改手圍、加銀管或珠框、換磁扣、不要某個顏色，要加錢嗎？",
    answer:
      "可以，但這類屬於「新增條件」或改手圍，等於重新打掉設計，不在免費一次範圍內，需加收 200 元。請在預約或討論設計時就先透過官方 LINE 跟店家說明。LINE：https://line.me/R/ti/p/@011tymeh",
    embedText:
      "改手圍 換手圍 加銀管 加珠框 要銀管 要珠框 不要紫色 換磁扣 改磁扣 龍蝦扣 加價 加錢 200 重新設計 新增條件 客製修改",
    keywords: ["改手圍", "銀管", "珠框", "磁扣", "顏色", "加價", "200", "新增條件"],
    category: "客製化",
  },
  {
    id: "faq-second-revision-fee",
    question: "第二次修改設計要多少錢？",
    answer: "第二次起每次修改需加收 200 元。第一次仍享有免費一次（僅限可調整範圍內，不含改手圍與新增條件等重新設計項目）。詳情可私訊官方 LINE：https://line.me/R/ti/p/@011tymeh",
    embedText: "第二次修改 再改一次 改第二次 修改費用 加收 200 幾次免費",
    keywords: ["第二次", "再改", "修改費", "200", "幾次"],
    category: "客製化",
  },
  {
    id: "faq-refund",
    question: "可以退款嗎？",
    answer: "每一條手鍊出貨前皆經過細心檢查，出貨後恕不提供退換貨服務。若收到商品有瑕疵，或手圍尺寸有任何疑慮，歡迎透過官方 LINE 與我們聯繫，我們將盡力為您協助處理：https://line.me/R/ti/p/@011tymeh",
    embedText: "可以退款嗎 退款 退貨 換貨 退換貨 不能退 瑕疵 損壞",
    keywords: ["退款", "退貨", "換貨", "退換貨", "不能退", "瑕疵"],
    category: "常見問題",
  },
  {
    id: "faq-default-clasp",
    question: "手鍊預設是什麼扣具？",
    answer: "預設為彈力繩（免費）。若想升級為龍蝦扣或磁扣，需額外加收 200 元。",
    embedText: "手鍊預設扣具 彈力繩 龍蝦扣 磁扣 扣具 預設 免費",
    keywords: ["預設扣具", "彈力繩", "龍蝦扣", "磁扣", "扣具", "免費"],
    category: "常見問題",
  },
  {
    id: "faq-clasp-diff",
    question: "龍蝦扣和磁扣有什麼差別？",
    answer: "龍蝦扣及磁扣是以沒有彈性的魚線製作，較容易因拉扯或勾到而損壞。想要穿戴方便且耐用的話，可選擇彈力繩款（彈力繩款無需加價）。",
    embedText: "龍蝦扣磁扣差別 龍蝦扣 磁扣 彈力繩 差別 比較 魚線 耐用",
    keywords: ["龍蝦扣", "磁扣", "彈力繩", "差別", "比較", "魚線", "耐用"],
    category: "常見問題",
  },
  {
    id: "faq-payment-methods",
    question: "支援哪些付款方式？",
    answer: "台灣地區（含離島）：轉帳、信用卡、Apple Pay。台灣以外地區：僅支援 PayPal。",
    embedText: "付款方式 支付 信用卡 轉帳 ATM Apple Pay Paypal 海外付款",
    keywords: ["付款方式", "信用卡", "轉帳", "ATM", "Apple Pay", "Paypal", "海外"],
    category: "常見問題",
  },
  {
    id: "faq-contact",
    question: "有問題要怎麼聯絡？",
    answer: "請私訊官方 LINE：https://line.me/R/ti/p/@011tymeh，老闆會盡快回覆。",
    embedText: "有問題怎麼聯絡 聯絡 客服 LINE 私訊 詢問 問題 聯繫",
    keywords: ["聯絡", "客服", "LINE", "私訊", "詢問", "聯繫"],
    category: "常見問題",
  },
  {
    id: "faq-experience-course",
    question: "生命靈數水晶手鍊體驗課的內容和費用是什麼？",
    answer: "體驗課為 1.5–2 小時小班制（1–4 人），內容包含：完整生命靈數計算、缺數/連線解析、手鍊配色設計、獨門綁法、水晶保養淨化與能量知識。費用 2,500 元（含所有材料費），2 人同行 -100 元/人，3 人同行 -150 元/人。地點在桃園火車站車程約 7 分鐘。報名請私訊 LINE：https://line.me/R/ti/p/@011tymeh",
    embedText: "體驗課 生命靈數體驗課 課程內容 費用 報名 小班制 桃園 手作",
    keywords: ["體驗課", "生命靈數體驗", "課程費用", "報名", "小班", "桃園"],
    category: "課程",
  },
  {
    id: "faq-workshop-who",
    question: "水晶創業全能班適合什麼人？",
    answer: "適合想將水晶手鍊興趣轉化為事業的人。課程不只有手作技法，更含完整創業思維，從水晶理論、基礎美學到小資創業 SOP 一次傳授。詳見：https://goodaytarot.com/crystal-workshop",
    embedText: "水晶創業班 適合誰 創業 手作 水晶事業 創業思維 SOP",
    keywords: ["水晶創業班", "適合誰", "創業", "手作", "創業思維"],
    category: "課程",
  },
  {
    id: "faq-workshop-price",
    question: "水晶創業全能班的費用和課程內容是什麼？",
    answer: "早鳥優惠價 12,888 元（共 6 小時），兩人同行再減 888 元/人。地點：桃園小檜溪區（預約制）。課程分三段：①理論/創業基礎（2hr）②手作 3 件作品（3hr）③淨化保養與連結（0.5hr）。6 種核心製作技法包含彈力繩獨家不易鬆脫綁法、磁扣、龍蝦扣、U 型扣、項鍊、吊飾，IG 分享可獲許願蠟燭＋淨化水晶一包。報名請私訊 LINE：https://line.me/R/ti/p/@011tymeh",
    embedText: "水晶創業全能班費用 創業班費用 課程內容 大綱 12888 桃園 報名 彈力繩 磁扣 龍蝦扣 U型扣 項鍊 吊飾",
    keywords: ["創業全能班", "費用", "課程內容", "12888", "桃園", "報名"],
    category: "課程",
  },
  {
    id: "faq-crystal-energy-real",
    question: "水晶的能量是真實的嗎？",
    answer: "水晶具有天然礦石的獨特頻率，許多人在配戴後感受到情緒或能量的轉變。老闆會根據您的需求挑選最適合的水晶，並協助您與手鍊建立連結。",
    embedText: "水晶能量真實嗎 水晶能量 是否有效 有用嗎 頻率 礦石 真的有效",
    keywords: ["水晶能量", "有效", "真實", "頻率", "礦石", "有用嗎"],
    category: "常見問題",
  },
  {
    id: "faq-natural-crystal",
    question: "手鍊是天然水晶嗎？",
    answer: "是的，所有水晶手鍊皆使用天然礦石製作，老闆會嚴格把關水晶品質。",
    embedText: "天然水晶嗎 是否天然 真的水晶 假的 合成 天然礦石 品質",
    keywords: ["天然水晶", "天然", "礦石", "真的", "品質", "真假"],
    category: "常見問題",
  },
  {
    id: "faq-see-design-first",
    question: "可以看到成品圖再決定要不要購買嗎？客製化什麼時候付尾款？",
    answer:
      "客製化流程為先付訂金，老闆設計完成品圖後給您確認，滿意再支付尾款。初版享有免費修改一次，範圍為更換不喜歡的配飾與調整水晶／配飾擺放順序；改手圍、新增條件（如銀管、珠框、色系、扣具等）屬重新設計需另收 200 元，第二次修改起每次亦加收 200 元。預約時請先透過官方 LINE 說明：https://line.me/R/ti/p/@011tymeh",
    embedText: "先看成品圖 成品圖確認 先看設計 看圖再付款 設計確認 訂金 尾款 什麼時候付尾款 客製化尾款",
    keywords: ["成品圖", "先看設計", "設計確認", "看圖", "確認後付款", "尾款", "付尾款", "訂金", "客製化尾款"],
    category: "客製化",
  },
  {
    id: "faq-ready-stock",
    question: "手鍊有沒有現貨可以直接購買？",
    answer: "有的，除客製化方案外，網站上也有現貨手鍊可直接選購：https://goodaytarot.com/products",
    embedText: "現貨 直接購買 馬上買 不用等 現成 有現貨嗎",
    keywords: ["現貨", "直接購買", "馬上買", "不用等", "現成"],
    category: "常見問題",
  },
  {
    id: "faq-shipping-methods",
    question: "有哪些配送方式？",
    answer: "台灣地區（含離島）提供黑貓宅急便（$100）及 7-11 店到店（$60），單次購買兩件商品以上免運。海外可寄送至馬來西亞、香港、新加坡、美國、英國、澳洲。詳見：https://goodaytarot.com/shopping-guide",
    embedText: "配送方式 運送 黑貓 7-11 店到店 宅配 免運 寄送",
    keywords: ["配送方式", "運送", "黑貓", "7-11", "店到店", "宅配", "免運"],
    category: "常見問題",
  },
  {
    id: "faq-shipping-fee",
    question: "運費是多少？",
    answer: "黑貓宅急便 $100、7-11 店到店 $60，單次購買兩件商品以上免運。",
    embedText: "運費多少 運費 宅配費 免運 運費計算",
    keywords: ["運費", "多少", "宅配費", "免運"],
    category: "常見問題",
  },
  {
    id: "faq-overseas-shipping",
    question: "可以寄送到海外嗎？",
    answer: "可以，支援寄送至馬來西亞、香港、新加坡、美國、英國、澳洲，付款方式為 PayPal。",
    embedText: "海外寄送 寄到國外 海外配送 馬來西亞 香港 新加坡 美國 英國 澳洲 國際",
    keywords: ["海外", "國外", "馬來西亞", "香港", "新加坡", "美國", "英國", "澳洲", "國際"],
    category: "常見問題",
  },
  {
    id: "faq-tarot-topics",
    question: "塔羅占卜可以問什麼問題？",
    answer: "涵蓋感情、財運、職涯、療癒、前世今生等多種主題，包含：戀愛指南、感情復合、旺桃花運、財富密碼、流年運勢、守護神、職涯探索、心靈療癒等。詳細主題可至報名表單查看：https://goodaytarot.com/custom/form-b",
    embedText: "塔羅可以問什麼 塔羅主題 占卜 感情 財運 職涯 療癒 前世今生 守護神 流年",
    keywords: ["塔羅", "占卜", "感情", "財運", "職涯", "療癒", "前世今生", "守護神", "流年"],
    category: "客製化",
  },

  {
    id: "rec-confidence",
    question: "哪款手鍊適合提升自信、魅力或吸引力？",
    answer:
      "提升自信、魅力或吸引力時，請優先從現貨商品知識中挑選功效包含自信、魅力、吸引力、氣場、行動力或表達力的款式。",
    embedText: "提升自信 自信心 魅力 吸引力 氣場 行動力 增強自信 建立自信 想變自信 自我提升",
    keywords: ["自信", "魅力", "吸引力", "氣場", "行動力", "提升自信"],
    category: "選購需求",
  },
  {
    id: "rec-wealth",
    question: "哪款手鍊適合招財、提升財運或事業運？",
    answer:
      "招財、財運或事業需求，請優先從現貨商品知識中挑選功效包含招財、財運、事業、貴人、行動力、目標或自信的款式。",
    embedText: "招財 財運 財富 錢財 事業 工作 升遷 行動力 提升財運 招財手鍊 賺錢",
    keywords: ["招財", "財運", "財富", "事業", "工作", "升遷", "賺錢"],
    category: "選購需求",
  },
  {
    id: "rec-love",
    question: "哪款手鍊適合提升愛情、桃花或人緣？",
    answer:
      "愛情、桃花或人緣需求，請優先從現貨商品知識中挑選功效包含愛情、桃花、人緣、正緣、關係修復、溫柔魅力或安全感的款式。",
    embedText: "愛情 桃花 人緣 感情 戀愛 交友 吸引異性 提升桃花 正緣 好人緣 脫單",
    keywords: ["愛情", "桃花", "人緣", "感情", "戀愛", "正緣", "交友", "脫單"],
    category: "選購需求",
  },
  {
    id: "rec-healing",
    question: "哪款手鍊適合療癒、釋放壓力或安撫情緒？",
    answer:
      "療癒、釋放壓力或安撫情緒時，請優先從現貨商品知識中挑選功效包含療癒、安撫、情緒穩定、釋放壓力、焦慮、不安或安全感的款式。",
    embedText: "療癒 壓力 焦慮 情緒 安撫 紓壓 放鬆 不安 釋放壓力 情緒穩定 心情不好 負面情緒",
    keywords: ["療癒", "壓力", "焦慮", "情緒", "安撫", "紓壓", "放鬆", "心情不好"],
    category: "選購需求",
  },
  {
    id: "rec-protection",
    question: "哪款手鍊適合防護負能量、保護氣場？",
    answer:
      "防護負能量、保護氣場或防小人需求，請優先從現貨商品知識中挑選功效包含防護、保護、負能量、氣場、淨化、穩定或避邪的款式。",
    embedText: "防護 負能量 保護 氣場 淨化 穩定 防小人 避邪 保護能量 驅邪",
    keywords: ["防護", "負能量", "保護", "氣場", "淨化", "防小人", "驅邪"],
    category: "選購需求",
  },
  {
    id: "rec-crystal-rose-quartz",
    question: "想要粉晶／粉水晶手鍊，有推薦的款式嗎？",
    answer:
      "顧客想找粉晶或粉水晶時，請優先從現貨商品知識中挑選 crystalType 或商品說明包含粉晶、粉水晶、玫瑰石英或愛情桃花功效的款式。",
    embedText:
      "粉晶 粉水晶 玫瑰石英 薔薇石英 rose quartz 想要粉晶 粉晶手鍊 粉晶推薦 有粉晶的手鍊嗎 粉晶款式 招桃花粉晶 人緣粉晶 愛情粉晶 推薦手鍊",
    keywords: ["粉晶", "粉水晶", "玫瑰石英", "薔薇石英", "rose quartz"],
    category: "選購需求",
  },
  {
    id: "rec-crystal-strawberry",
    question: "想要草莓晶手鍊，有推薦嗎？",
    answer:
      "顧客想找草莓晶時，請優先從現貨商品知識中挑選 crystalType 或商品說明包含草莓晶、草莓水晶、桃花、人緣或魅力功效的款式。",
    embedText: "草莓晶 草莓水晶 想要草莓晶 草莓晶手鍊 草莓晶推薦 有草莓晶的手鍊嗎 桃花草莓晶",
    keywords: ["草莓晶", "草莓水晶"],
    category: "選購需求",
  },
  {
    id: "rec-crystal-moonstone",
    question: "想要月光石／藍月光手鍊，有推薦嗎？",
    answer:
      "顧客想找月光石、藍月光、白月光或灰月光時，請優先從現貨商品知識中挑選 crystalType 或商品說明包含這些晶石，以及情緒平衡、療癒、直覺或柔和魅力功效的款式。",
    embedText:
      "月光石 月光石手鍊 藍月光 白月光 灰月光 月亮石 moonstone 想要月光石 有月光石的手鍊嗎 月光石推薦",
    keywords: ["月光石", "藍月光", "白月光", "灰月光", "月亮石", "moonstone"],
    category: "選購需求",
  },
  {
    id: "rec-crystal-citrine-rutilated",
    question: "想要黃水晶、銅髮晶或招財系晶石手鍊，有推薦嗎？",
    answer:
      "顧客想找黃水晶、銅髮晶、髮晶或招財系晶石時，請優先從現貨商品知識中挑選 crystalType 或商品說明包含這些晶石，以及招財、財運、事業、行動力或貴人功效的款式。",
    embedText: "黃水晶 銅髮晶 髮晶 招財水晶 財運水晶 想要黃水晶 黃水晶手鍊 銅髮晶手鍊 有黃水晶的手鍊嗎",
    keywords: ["黃水晶", "銅髮晶", "髮晶"],
    category: "選購需求",
  },
  {
    id: "rec-crystal-green-phantom-unavailable",
    question: "想要綠幽靈手鍊，有推薦嗎？",
    answer:
      "目前現貨沒有綠幽靈手鍊。若是想找財運、事業、行動力方向，可以改看網站上的財運事業系列作為替代參考；若想討論指定晶石或材料是否可用，可再透過 LINE 詢問店家。",
    embedText: "綠幽靈 綠幽靈手鍊 綠幽靈推薦 有綠幽靈嗎 綠幽靈水晶 財運 事業 招財 替代款",
    keywords: ["綠幽靈", "綠幽靈手鍊", "綠幽靈水晶"],
    category: "常見問題",
  },
  {
    id: "rec-crystal-obsidian",
    question: "想要黑曜石手鍊，有推薦嗎？",
    answer:
      "顧客想找黑曜石時，請優先從現貨商品知識中挑選 crystalType 或商品說明包含黑曜石，以及防護、避邪、穩定氣場、淨化或負能量相關功效的款式。",
    embedText: "黑曜石 黑曜石手鍊 想要黑曜石 黑曜石推薦 有黑曜石的手鍊嗎 避邪黑曜石",
    keywords: ["黑曜石"],
    category: "選購需求",
  },
  {
    id: "rec-crystal-white-phantom-tourmaline",
    question: "想要白幽靈、兔毛或粉碧璽手鍊，有推薦嗎？",
    answer:
      "顧客想找白幽靈、紅兔毛、白兔毛、兔毛或粉碧璽時，請優先從現貨商品知識中挑選 crystalType 或商品說明包含這些晶石，以及淨化、療癒、愛情人緣或情緒平衡功效的款式。",
    embedText:
      "白幽靈 白幽靈手鍊 紅兔毛 白兔毛 兔毛水晶 粉碧璽 想要白幽靈 有白幽靈的手鍊嗎 粉碧璽手鍊",
    keywords: ["白幽靈", "紅兔毛", "白兔毛", "兔毛", "粉碧璽"],
    category: "選購需求",
  },
  {
    id: "product-d001-moon-secret",
    question: "月下密語手鍊適合什麼需求？",
    answer:
      "「月下密語手鍊」水晶包含白幽靈、藍月光、灰月光、藍針與珍珠。適合想淨化負能量、釋放壓力焦慮、穩定情緒、提升直覺靈感與表達勇氣的人，也兼具招人緣與防護感。價格 NT$1,480 起，商品連結：https://goodaytarot.com/products/d001-moon-secret",
    embedText:
      "月下密語 月下密語手鍊 d001 D001 淨化 負能量 壓力 焦慮 情緒穩定 療癒 防護 人緣 表達力 直覺 靈感 白幽靈 藍月光 灰月光 藍針 珍珠",
    keywords: ["月下密語", "d001", "D001", "淨化", "負能量", "壓力", "焦慮", "療癒", "防護", "白幽靈", "藍月光", "灰月光", "藍針"],
    category: "商品推薦",
    relatedProductIds: ["d001-moon-secret"],
  },
  {
    id: "product-d002-honey-realm",
    question: "蜜光之境手鍊適合什麼需求？",
    answer:
      "「蜜光之境手鍊」水晶包含銅髮晶、黃水晶、草莓晶、白水晶、黑曜石、珍珠、葡萄石、太陽石與粉晶。適合想提升財運、行動力、好人緣、愛情桃花、保護力與穩定氣場的人。價格 NT$1,580，商品連結：https://goodaytarot.com/products/d002-honey-realm",
    embedText:
      "蜜光之境 蜜光之境手鍊 d002 D002 招財 財運 財富 事業 行動力 自信 人緣 愛情 桃花 防護 保護 氣場 療癒 銅髮晶 黃水晶 草莓晶 白水晶 黑曜石 葡萄石 太陽石 粉晶 珍珠",
    keywords: ["蜜光之境", "d002", "D002", "招財", "財運", "事業", "行動力", "自信", "人緣", "愛情", "桃花", "防護", "銅髮晶", "黃水晶", "草莓晶", "黑曜石", "太陽石", "粉晶"],
    category: "商品推薦",
    relatedProductIds: ["d002-honey-realm"],
  },
  {
    id: "product-d003-venus",
    question: "維納斯 Venus 適合什麼需求？",
    answer:
      "「維納斯 Venus」是吊飾款，水晶包含太陽石、鈦晶、藍月光、白水晶與珍珠。適合想提升自信、行動力、吸引力、財運聚能、直覺力與柔和魅力的人，日常配戴輕巧俐落。價格 NT$950，商品連結：https://goodaytarot.com/products/d003-venus",
    embedText:
      "維納斯 Venus d003 D003 吊飾 自信 魅力 吸引力 行動力 財運 招財 情緒穩定 直覺 氣質 太陽石 鈦晶 藍月光 白水晶 珍珠",
    keywords: ["維納斯", "Venus", "d003", "D003", "吊飾", "自信", "魅力", "吸引力", "行動力", "財運", "招財", "太陽石", "鈦晶", "藍月光", "白水晶"],
    category: "商品推薦",
    relatedProductIds: ["d003-venus"],
  },
  {
    id: "product-d004-morning-whisper",
    question: "晨光輕語手鍊適合什麼需求？",
    answer:
      "「晨光輕語手鍊」水晶包含白幽靈、紅兔毛、藍月光、白兔毛、白水晶、粉碧璽、珍珠與白月光。適合想提升愛情人緣、穩定關係能量、柔化情緒、增加安全感、淨化負能量並維持防護氣場的人。價格 NT$1,800，商品連結：https://goodaytarot.com/products/d004-morning-whisper",
    embedText:
      "晨光輕語 晨光輕語手鍊 d004 D004 愛情 桃花 人緣 關係 情緒 安全感 溫柔魅力 淨化 負能量 防護 氣場 直覺 白幽靈 紅兔毛 白兔毛 粉碧璽 藍月光 白月光 白水晶 珍珠",
    keywords: ["晨光輕語", "d004", "D004", "愛情", "桃花", "人緣", "關係", "情緒", "安全感", "淨化", "防護", "白幽靈", "紅兔毛", "白兔毛", "粉碧璽", "藍月光", "白月光"],
    category: "商品推薦",
    relatedProductIds: ["d004-morning-whisper"],
  },
  {
    id: "product-d005-moon-clear-heart",
    question: "月映淨心手鍊適合什麼需求？",
    answer:
      "「月映淨心手鍊」水晶包含粉晶、白月光、珍珠、白水晶與藍月光。適合想吸引愛情與好人緣、安撫情緒、修復關係能量、柔化心性、提升直覺並回到穩定安全感的人。價格 NT$1,500，商品連結：https://goodaytarot.com/products/d005-moon-clear-heart",
    embedText:
      "月映淨心 月映淨心手鍊 映淨心 d005 D005 愛情 桃花 人緣 關係修復 情緒 安撫 療癒 安全感 溫柔 淨化 正向能量 直覺 粉晶 白月光 藍月光 白水晶 珍珠",
    keywords: ["月映淨心", "映淨心", "d005", "D005", "愛情", "桃花", "人緣", "關係", "情緒", "安撫", "療癒", "安全感", "粉晶", "白月光", "藍月光", "白水晶"],
    category: "商品推薦",
    relatedProductIds: ["d005-moon-clear-heart"],
  },
  {
    id: "product-prod-1780212635593",
    question: "潛月之境適合什麼需求？",
    answer:
      "「潛月之境」是每月限量手鍊，水晶包含白月光、黑髮晶、黑曜石與灰月光。適合想淨化氣場、排除負能量、強化內在保護力、穩定情緒與思緒、喚醒直覺洞察力並獲得深層安定感的人。價格 NT$1,422，商品連結：https://goodaytarot.com/products/prod-1780212635593",
    embedText:
      "潛月之境 prod-1780212635593 限定款 每月限量 限量手鍊 灰月光 白月光 黑髮晶 黑曜石 淨化氣場 排除負能量 防護 保護力 穩定情緒 思緒 直覺 洞察力 安定感 療癒",
    keywords: ["潛月之境", "prod-1780212635593", "限定款", "每月限量", "限量手鍊", "灰月光", "白月光", "黑髮晶", "黑曜石", "淨化", "負能量", "防護", "保護力", "穩定情緒", "直覺"],
    category: "商品推薦",
    relatedProductIds: ["prod-1780212635593"],
  },
  {
    id: "product-prod-1780212866677",
    question: "御光而行適合什麼需求？",
    answer:
      "「御光而行」是每月限量手鍊，水晶包含銀曜石、黑碧璽、白水晶、白月光、黑曜石與白幽靈。適合想強力驅除負能量、建立保護結界、淨化氣場、提升自信與意志力、喚醒內在成長力量並保持清明平靜的人。價格 NT$1,422，商品連結：https://goodaytarot.com/products/prod-1780212866677",
    embedText:
      "御光而行 prod-1780212866677 限定款 每月限量 限量手鍊 銀曜石 黑碧璽 白水晶 白月光 黑曜石 白幽靈 驅邪 負能量 防護 保護結界 淨化氣場 自信 意志力 成長 清明 平靜",
    keywords: ["御光而行", "prod-1780212866677", "限定款", "每月限量", "限量手鍊", "銀曜石", "黑碧璽", "白水晶", "白月光", "黑曜石", "白幽靈", "驅邪", "負能量", "防護", "自信", "穩定情緒"],
    category: "商品推薦",
    relatedProductIds: ["prod-1780212866677"],
  },
  {
    id: "product-prod-1780212957392",
    question: "柔韌之光適合什麼需求？",
    answer:
      "「柔韌之光」是每月限量手鍊，水晶包含銅髮晶、粉晶、金髮晶與白幽靈。適合想招引正向緣分與貴人、敞開心輪與愛的流動、提升財運與行動力、促進內在成長蛻變並帶來溫暖自信的人。價格 NT$1,602，商品連結：https://goodaytarot.com/products/prod-1780212957392",
    embedText:
      "柔韌之光 prod-1780212957392 限定款 每月限量 限量手鍊 銅髮晶 粉晶 金髮晶 白幽靈 愛情 桃花 感情 貴人 招財 財運 行動力 自信 心輪 緣分 成長 蛻變",
    keywords: ["柔韌之光", "prod-1780212957392", "限定款", "每月限量", "限量手鍊", "銅髮晶", "粉晶", "金髮晶", "白幽靈", "愛情", "桃花", "感情", "貴人", "招財", "財運", "自信"],
    category: "商品推薦",
    relatedProductIds: ["prod-1780212957392"],
  },
  {
    id: "product-prod-1780213098870",
    question: "理光之境適合什麼需求？",
    answer:
      "「理光之境」是每月限量手鍊，水晶包含白瑪瑙、金髮晶、藍兔毛、珍珠、海藍寶與白水晶。適合想沉澱思緒、穩定情緒、帶來平靜清明、提升表達溝通、強化理性判斷與專注力並溫和淨化氣場的人。價格 NT$1,512，商品連結：https://goodaytarot.com/products/prod-1780213098870",
    embedText:
      "理光之境 prod-1780213098870 限定款 每月限量 限量手鍊 白瑪瑙 金髮晶 藍兔毛 珍珠 海藍寶 白水晶 穩定情緒 沉澱思緒 平靜 清明 溝通表達 專注 理性判斷 淨化氣場 招財",
    keywords: ["理光之境", "prod-1780213098870", "限定款", "每月限量", "限量手鍊", "白瑪瑙", "金髮晶", "藍兔毛", "珍珠", "海藍寶", "白水晶", "穩定情緒", "溝通表達", "專注", "招財"],
    category: "商品推薦",
    relatedProductIds: ["prod-1780213098870"],
  },
  {
    id: "product-prod-1780213199030",
    question: "盛光流年適合什麼需求？",
    answer:
      "「盛光流年」是每月限量手鍊，水晶包含金髮晶、白水晶、白瑪瑙與黃阿賽。適合想催動財運與機遇、吸引貴人與正向緣分、提升行動力與自信光芒、淨化氣場並擴大正能量的人。價格 NT$1,512，商品連結：https://goodaytarot.com/products/prod-1780213199030",
    embedText:
      "盛光流年 prod-1780213199030 限定款 每月限量 限量手鍊 金髮晶 白水晶 白瑪瑙 黃阿賽 招財 財運 機遇 貴人 正向緣分 行動力 自信 淨化氣場 正能量 豐盛",
    keywords: ["盛光流年", "prod-1780213199030", "限定款", "每月限量", "限量手鍊", "金髮晶", "白水晶", "白瑪瑙", "黃阿賽", "招財", "財運", "貴人", "行動力", "自信", "豐盛"],
    category: "商品推薦",
    relatedProductIds: ["prod-1780213199030"],
  },
];

// ─── Embedding 向量搜尋 ──────────────────────────────────────────────────────

import rawEmbeddings from "./faqEmbeddings.json";
const _embeddings = rawEmbeddings as { id: string; vector: number[] }[];

function loadEmbeddings() {
  return _embeddings;
}

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

function productIdsFromChunk(chunk: KnowledgeChunk): string[] {
  if (chunk.relatedProductIds?.length) return chunk.relatedProductIds;
  return chunk.id.startsWith("product-") ? [chunk.id.slice("product-".length)] : [];
}

function isProductRecommendationChunk(chunk: KnowledgeChunk): boolean {
  return chunk.category === "商品推薦" && chunk.id.startsWith("product-");
}

export function selectStaticKnowledgeForSearch(
  staticChunks: KnowledgeChunk[],
  dynamicChunks: KnowledgeChunk[]
): KnowledgeChunk[] {
  const dynamicProductIds = new Set(
    dynamicChunks
      .filter(isProductRecommendationChunk)
      .flatMap(productIdsFromChunk)
  );
  if (dynamicProductIds.size === 0) return staticChunks;

  return staticChunks.filter((chunk) => {
    if (!isProductRecommendationChunk(chunk)) return true;
    return productIdsFromChunk(chunk).every((id) => !dynamicProductIds.has(id));
  });
}

export async function searchKnowledge(
  query: string,
  queryVector: number[],
  topK = 3,
  threshold = 0.45
): Promise<ScoredChunk[]> {
  const embeddings = loadEmbeddings();
  const vectorById = new Map(embeddings.map((e) => [e.id, e.vector]));
  const dynamicChunks = await loadDynamicKnowledgeChunks();

  const scoreChunk = (chunk: KnowledgeChunk, vector?: number[] | null): ScoredChunk => {
    const vecScore = vector ? cosineSimilarity(queryVector, vector) : 0;
    const hits = keywordHitCount(query, chunk);
    const kwScore = keywordBoostScore(chunk, hits);
    const score = Math.max(vecScore, kwScore);
    return { ...chunk, score };
  };

  const searchableStaticChunks = selectStaticKnowledgeForSearch(knowledgeChunks, dynamicChunks);
  const staticScored = searchableStaticChunks.map((chunk) => scoreChunk(chunk, vectorById.get(chunk.id)));
  const dynamicScored = dynamicChunks.map((chunk) => scoreChunk(chunk, chunk.vector));

  return [...staticScored, ...dynamicScored]
    .filter((c) => c.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

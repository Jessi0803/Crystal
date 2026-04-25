export interface KnowledgeChunk {
  id: string;
  question: string;
  answer: string;
  embedText: string; // 用於 embedding：問題 + 關鍵字
  keywords: string[];
  category: string;
  relatedProductIds?: string[];
}

export const knowledgeChunks: KnowledgeChunk[] = [
  {
    id: "faq-warranty",
    question: "手鍊有保固嗎？",
    answer:
      "我們3個月內有免費1次的保固，項目有：換線、五金汰換、損壞維修；如需改尺寸、改設計屬於重新設計，不包含在免費保固的範圍內，如有需要，需酌收200$重新設計費。",
    embedText: "手鍊有保固嗎 保固 維修 壞掉 換線 五金 損壞 免費 尺寸 設計費",
    keywords: ["保固", "維修", "換線", "五金", "損壞", "壞掉", "免費", "尺寸", "設計費"],
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
    id: "faq-custom-bcd-wish",
    question: "預約客製化BCD方案，還可以許願特定功效嗎？",
    answer:
      "可以喔！可以跟我許願，這樣就是幫你搭配能量解析缺乏運勢＋你指定的運勢。",
    embedText: "客製化BCD許願功效 客製化方案 指定功效 運勢 能量解析 塔羅 脈輪 生命靈數",
    keywords: ["客製化", "BCD", "許願", "功效", "運勢", "塔羅", "脈輪", "生命靈數"],
    category: "客製化",
  },
  {
    id: "faq-custom-b-multi",
    question: "預約客製化B方案，可以搭配多個題組嗎？",
    answer:
      "可以喔！需要搭配手鍊的題組都有9折優惠，也會用多題組的解析配置手鍊。",
    embedText: "客製化B方案多題組 塔羅 多個題組 9折 優惠 搭配",
    keywords: ["客製化", "B方案", "題組", "9折", "優惠", "塔羅"],
    category: "客製化",
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
];

// ─── Embedding 向量搜尋 ──────────────────────────────────────────────────────

let _embeddings: { id: string; vector: number[] }[] | null = null;

function loadEmbeddings() {
  if (_embeddings) return _embeddings;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require("./faqEmbeddings.json");
    _embeddings = data;
    return _embeddings!;
  } catch {
    return [];
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchKnowledge(
  queryVector: number[],
  topK = 3,
  threshold = 0.6
): Promise<KnowledgeChunk[]> {
  const embeddings = loadEmbeddings();
  if (embeddings.length === 0) return [];

  const scored = embeddings.map(({ id, vector }) => ({
    id,
    score: cosineSimilarity(queryVector, vector),
  }));

  const topIds = scored
    .filter((s) => s.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.id);

  return topIds
    .map((id) => knowledgeChunks.find((c) => c.id === id))
    .filter((c): c is KnowledgeChunk => !!c);
}

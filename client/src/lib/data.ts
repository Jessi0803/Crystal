// 日日好日 — 商品資料與品牌內容
// 設計風格：月光典雅 Lunar Elegance

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  categoryLabel: string;
  price: number;
  originalPrice?: number;
  image: string;
  tags: string[];
  description: string;
  story: string;
  benefits: string[];
  suitableFor: string[];
  howToUse: string[];
  disclaimer: string;
  inStock: boolean;
  featured: boolean;
  crystalType: string;
  color: string;
}

export const products: Product[] = [
  {
    id: "rose-quartz-bracelet",
    name: "吸引正緣粉水晶手鍊",
    subtitle: "開啟愛情能量場，讓緣分自然靠近",
    category: "love",
    categoryLabel: "愛情桃花",
    price: 1280,
    originalPrice: 1680,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663525376407/HsiMZrubGHyjhN4cohRHuH/product-rose-quartz-Cyp9uT5H6cB8cyt34mmWeU.webp",
    tags: ["愛情", "桃花", "人緣"],
    description: "採用天然A級粉水晶，每顆晶珠皆經過嚴格篩選，搭配18K包金隔珠，散發溫柔粉嫩光澤。",
    story: "你是否曾感覺自己付出了很多，卻始終等不到那個對的人？粉水晶，被稱為「愛情之石」，自古以來便是吸引愛情能量的代表礦石。它散發的溫柔粉色光芒，能輕柔地打開你的心輪，讓你在無形中散發出更溫暖、更有吸引力的能量場。配戴這條手鍊，不是為了依賴外力，而是提醒你——你本身就值得被愛。",
    benefits: [
      "活化心輪能量，提升對愛情的開放度",
      "增強個人魅力與親和力，改善人際關係",
      "幫助釋放過去的感情傷痛，以輕盈的心態迎接新緣分",
      "穩定情緒，帶來內心的平靜與安全感",
      "適合作為水晶手鍊推薦給正在尋找真愛的朋友"
    ],
    suitableFor: ["單身、渴望吸引正緣者", "想提升個人魅力與人緣者", "感情受傷、需要療癒心靈者", "希望改善與伴侶關係者"],
    howToUse: [
      "配戴：建議戴在左手（接收能量），讓粉水晶的頻率與你的心輪共鳴",
      "冥想：每天早晨配戴前，雙手握住手鍊，閉眼深呼吸，在心中設定今日的愛情意圖",
      "淨化：每月一次，將手鍊放在月光下或白水晶旁淨化能量"
    ],
    disclaimer: "本商品為天然礦石飾品，具有個人能量支持作用，非醫療用品，不具任何醫療療效。效果因個人能量狀態而異。",
    inStock: true,
    featured: true,
    crystalType: "粉水晶",
    color: "粉色"
  },
  {
    id: "citrine-bracelet",
    name: "招財黃水晶手鍊",
    subtitle: "啟動財富能量，讓豐盛自然流向你",
    category: "wealth",
    categoryLabel: "財運事業",
    price: 1480,
    originalPrice: 1980,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663525376407/HsiMZrubGHyjhN4cohRHuH/product-citrine-B6sARQc6guwXP6k3oJYkqr.webp",
    tags: ["財運", "事業", "招財"],
    description: "採用天然巴西黃水晶，色澤飽滿如陽光，搭配金色隔珠，是招財水晶中最受歡迎的選擇。",
    story: "黃水晶，又稱「商人之石」，是公認最強的招財水晶之一。它如陽光般溫暖的金黃色澤，象徵著豐盛與繁榮的能量。無論你是希望事業更上一層樓，還是想要改善財務狀況，黃水晶都能幫助你保持積極樂觀的心態，吸引更多機會與財富能量。這不是魔法，而是當你內心充滿豐盛感時，你自然會做出更好的決策，吸引更多正向的機會。",
    benefits: [
      "活化太陽神經叢，提升自信與行動力",
      "吸引財富與豐盛的能量，增強招財運勢",
      "激發創造力與商業直覺，有助事業發展",
      "帶來樂觀積極的心態，化解財務焦慮",
      "是招財水晶推薦清單中的必備選項"
    ],
    suitableFor: ["希望提升財運與事業運者", "創業者、業務人員、投資者", "感到財務壓力、需要正能量支持者", "想要增強自信與行動力者"],
    howToUse: [
      "配戴：建議戴在右手（輸出能量），將財富能量向外散發",
      "擺放：可放置於辦公桌或財位（家中對角線最遠角落），增強空間財運",
      "設定意圖：每天早晨握住手鍊，在心中清晰描繪你的財務目標"
    ],
    disclaimer: "本商品為天然礦石飾品，具有個人能量支持作用，非醫療用品，不具任何醫療療效。效果因個人能量狀態而異。",
    inStock: true,
    featured: true,
    crystalType: "黃水晶",
    color: "金黃色"
  },
  {
    id: "obsidian-bracelet",
    name: "黑曜石防護手鍊",
    subtitle: "建立能量防護罩，遠離負能量侵擾",
    category: "protection",
    categoryLabel: "防護淨化",
    price: 1180,
    originalPrice: 1480,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663525376407/HsiMZrubGHyjhN4cohRHuH/product-obsidian-aCXVpr8mUWurfi2rPLLQHx.webp",
    tags: ["防小人", "保護", "淨化"],
    description: "採用天然墨西哥黑曜石，質地純淨如鏡，搭配925純銀隔珠，散發沉穩神秘的保護能量。",
    story: "在這個複雜的社會環境中，你是否感覺有時候身邊的負能量讓你疲憊不堪？黑曜石，自古以來便是最強大的保護石之一。古代戰士與薩滿巫師都會隨身攜帶它，用以抵禦外界的負面能量。它如同一面鏡子，能反射並吸收周圍的負能量，同時幫助你看清自己內心的真實狀態。配戴黑曜石，不是為了恐懼，而是為了讓你在任何環境中都能保持清醒與穩定。",
    benefits: [
      "強力吸收並轉化周圍的負面能量",
      "建立個人能量防護場，減少外界干擾",
      "幫助識別並遠離消耗自己能量的人際關係",
      "接地氣，帶來穩定踏實的安全感",
      "清除舊有的負面模式，促進心靈成長"
    ],
    suitableFor: ["感覺容易被他人情緒影響者", "工作環境複雜、需要保護能量者", "希望遠離小人、保持清醒者", "需要接地氣、穩定情緒者"],
    howToUse: [
      "配戴：可戴在任一手，依個人感覺選擇",
      "淨化：黑曜石吸收能量較強，建議每週淨化一次（月光、煙燻或流水淨化）",
      "注意：睡前建議取下，避免夢境受影響"
    ],
    disclaimer: "本商品為天然礦石飾品，具有個人能量支持作用，非醫療用品，不具任何醫療療效。效果因個人能量狀態而異。",
    inStock: true,
    featured: true,
    crystalType: "黑曜石",
    color: "黑色"
  },
  {
    id: "amethyst-bracelet",
    name: "情緒療癒紫水晶手鍊",
    subtitle: "安撫焦慮心靈，找回內在平靜與智慧",
    category: "healing",
    categoryLabel: "情緒療癒",
    price: 1380,
    originalPrice: 1780,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663525376407/HsiMZrubGHyjhN4cohRHuH/product-amethyst-Rprm94EUT9qbkLneDQUP2E.webp",
    tags: ["療癒", "靜心", "智慧"],
    description: "採用天然烏拉圭紫水晶，紫色深邃如夜空，搭配金色隔珠，是能量水晶中最具療癒力的選擇。",
    story: "現代生活的壓力，讓許多人的內心長期處於緊繃狀態。你是否有時候感覺焦慮、睡眠不佳，或是思緒無法平靜？紫水晶，被稱為「靈性之石」，自古以來便與智慧、直覺和心靈平靜相連。它的紫色頻率能輕柔地安撫過度活躍的思緒，幫助你在忙碌的生活中找到一個內在的寧靜角落。這不是逃避現實，而是讓你以更清醒、更有智慧的狀態面對生活的每一個挑戰。",
    benefits: [
      "安撫焦慮情緒，帶來深層的心靈平靜",
      "改善睡眠品質，幫助放鬆入眠",
      "提升直覺力與洞察力，增強決策智慧",
      "清除負面思緒，促進正向思考模式",
      "支持冥想練習，加深靈性連結"
    ],
    suitableFor: ["容易焦慮、壓力大的上班族", "睡眠品質不佳者", "希望提升直覺力與靈性成長者", "正在進行冥想或瑜伽練習者"],
    howToUse: [
      "配戴：建議戴在左手，讓療癒能量直接進入心輪",
      "睡前儀式：睡前握住手鍊，做5次深呼吸，釋放今日的壓力與緊張",
      "冥想輔助：冥想時放在額頭（第三眼位置），有助深化靜心體驗"
    ],
    disclaimer: "本商品為天然礦石飾品，具有個人能量支持作用，非醫療用品，不具任何醫療療效。效果因個人能量狀態而異。",
    inStock: true,
    featured: false,
    crystalType: "紫水晶",
    color: "紫色"
  },
  {
    id: "test-credit-5",
    name: "[測試用] 信用卡測試商品 5元",
    subtitle: "信用卡最低金額測試，請勿真實購買",
    category: "test",
    categoryLabel: "測試",
    price: 5,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663525376407/HsiMZrubGHyjhN4cohRHuH/product-rose-quartz-Cyp9uT5H6cB8cyt34mmWeU.webp",
    tags: ["測試"],
    description: "測試用商品，僅供測試信用卡金流流程用。",
    story: "測試用商品。",
    benefits: ["測試用"],
    suitableFor: ["測試用"],
    howToUse: ["測試用"],
    disclaimer: "測試用商品，請勿真實下單。",
    inStock: true,
    featured: false,
    crystalType: "測試",
    color: "測試"
  },
  {
    id: "test-atm-16",
    name: "[測試用] ATM測試商品 16元",
    subtitle: "ATM最低金額測試，請勿真實購買",
    category: "test",
    categoryLabel: "測試",
    price: 16,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663525376407/HsiMZrubGHyjhN4cohRHuH/product-rose-quartz-Cyp9uT5H6cB8cyt34mmWeU.webp",
    tags: ["測試"],
    description: "測試用商品，僅供測試 ATM 轉帳金流流程用。",
    story: "測試用商品。",
    benefits: ["測試用"],
    suitableFor: ["測試用"],
    howToUse: ["測試用"],
    disclaimer: "測試用商品，請勿真實下單。",
    inStock: true,
    featured: false,
    crystalType: "測試",
    color: "測試"
  },
  {
    id: "test-cvs-31",
    name: "[測試用] 超商代碼測試商品 31元",
    subtitle: "超商代碼最低金額測試，請勿真實購買",
    category: "test",
    categoryLabel: "測試",
    price: 31,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663525376407/HsiMZrubGHyjhN4cohRHuH/product-rose-quartz-Cyp9uT5H6cB8cyt34mmWeU.webp",
    tags: ["測試"],
    description: "測試用商品，僅供測試超商代碼金流流程用。",
    story: "測試用商品。",
    benefits: ["測試用"],
    suitableFor: ["測試用"],
    howToUse: ["測試用"],
    disclaimer: "測試用商品，請勿真實下單。",
    inStock: true,
    featured: false,
    crystalType: "測試",
    color: "測試"
  }
];

export const categories = [
  {
    id: "love",
    icon: "💖",
    name: "愛情桃花",
    description: "吸引正緣，提升魅力與人緣",
    crystals: "粉水晶・草莓晶",
    color: "from-rose-50 to-pink-100",
    borderColor: "border-rose-200",
    textColor: "text-rose-700"
  },
  {
    id: "wealth",
    icon: "💰",
    name: "財運事業",
    description: "招財納福，開啟豐盛能量場",
    crystals: "黃水晶・金髮晶",
    color: "from-amber-50 to-yellow-100",
    borderColor: "border-amber-200",
    textColor: "text-amber-700"
  },
  {
    id: "protection",
    icon: "🛡️",
    name: "防護淨化",
    description: "遠離負能量，建立能量防護罩",
    crystals: "黑曜石・黑碧璽",
    color: "from-slate-50 to-gray-100",
    borderColor: "border-slate-300",
    textColor: "text-slate-700"
  },
  {
    id: "healing",
    icon: "🧘",
    name: "情緒療癒",
    description: "安撫焦慮，找回內在平靜",
    crystals: "紫水晶・月光石",
    color: "from-violet-50 to-purple-100",
    borderColor: "border-violet-200",
    textColor: "text-violet-700"
  }
];

export const testimonials = [
  {
    id: 1,
    name: "小雅",
    location: "台北",
    avatar: "小",
    rating: 5,
    product: "吸引正緣粉水晶手鍊",
    content: "配戴粉水晶手鍊大約一個月後，真的感覺自己變得更有自信了。朋友說我最近氣色很好，整個人散發不同的氣質。雖然不知道是不是水晶的功效，但心情確實變得更開朗，對感情也更有期待感了。包裝也非常精緻，很適合送禮！",
    date: "2024年11月"
  },
  {
    id: 2,
    name: "Vivian",
    location: "台中",
    avatar: "V",
    rating: 5,
    product: "招財黃水晶手鍊",
    content: "身為業務的我，壓力真的很大。買了黃水晶手鍊後，感覺自己在談判時更有底氣，思路也更清晰。當月業績真的有提升，不管是不是巧合，這條手鍊讓我每天都有積極的心態去面對挑戰。水晶品質很好，顏色飽滿，非常滿意！",
    date: "2024年12月"
  },
  {
    id: 3,
    name: "Emma",
    location: "高雄",
    avatar: "E",
    rating: 5,
    product: "情緒療癒紫水晶手鍊",
    content: "我是容易焦慮的人，睡眠品質一直不太好。朋友推薦我試試紫水晶，抱著半信半疑的心態買了。沒想到睡前握著手鍊做深呼吸，真的比較容易放鬆入睡。現在已經成為我睡前儀式的一部分了。日日好日 的服務也很好，有詳細說明使用方式，很貼心。",
    date: "2025年1月"
  }
];

export const energyQuotes = [
  "你的能量場，決定了你吸引什麼樣的人與機會進入你的生命。",
  "當你開始愛自己，宇宙便會回應你的頻率，帶來你所渴望的一切。",
  "每一顆水晶，都是大地億萬年的結晶，承載著自然最純粹的能量。",
  "靜下心來，你會發現內心早已知道答案。水晶只是幫你記起。",
  "改變從內在開始。當你的能量場改變了，外在的世界也會隨之轉化。",
  "豐盛不是追求來的，而是當你相信自己值得時，自然流向你的。",
  "今天，給自己一個溫柔的擁抱。你已經做得很好了。",
  "每一個清晨，都是重新設定能量意圖的機會。"
];

export const crystalKnowledge = [
  {
    id: 1,
    title: "如何辨別天然水晶與人工玻璃？",
    category: "選購指南",
    content: "天然水晶通常有細微的內含物（冰裂紋、雲霧感），溫度比玻璃低，用手觸摸有涼感。人工玻璃則過於完美透明，且溫度與室溫相近。購買時可請店家說明來源，並索取產品說明。",
    icon: "🔍"
  },
  {
    id: 2,
    title: "水晶需要多久淨化一次？",
    category: "保養方法",
    content: "建議每月至少淨化一次，若頻繁配戴或感覺能量沉重，可每週淨化。常見方法：月光淨化（滿月前後放在窗台）、白水晶簇淨化（放置其上24小時）、煙燻淨化（鼠尾草煙霧繞過）。注意：黑曜石、粉水晶等不適合水淨化。",
    icon: "🌙"
  },
  {
    id: 3,
    title: "左手戴還是右手戴？",
    category: "配戴方式",
    content: "傳統能量學說：左手為接收能量的手，適合戴需要吸收能量的水晶（如粉水晶吸引愛情、紫水晶吸收療癒能量）；右手為輸出能量的手，適合戴需要向外散發的水晶（如黃水晶散發財富能量）。最重要的是聆聽自己的感覺。",
    icon: "✋"
  },
  {
    id: 4,
    title: "水晶的能量說法有科學依據嗎？",
    category: "常見問題",
    content: "目前水晶能量的說法尚無嚴格科學實證。然而，許多人反映配戴水晶後心態更積極、更有意識地關注自己的情緒狀態。這可能與「意圖設定」的心理效應有關——當你有意識地為自己設定目標，行為自然會朝那個方向改變。日日好日 的水晶是心理與能量支持工具，非醫療用品。",
    icon: "💡"
  }
];

export const quizQuestions = [
  {
    id: 1,
    question: "最近最困擾你的是什麼？",
    options: [
      { text: "感情問題，渴望找到對的人", value: "love", icon: "💕" },
      { text: "財務壓力，希望改善收入", value: "wealth", icon: "💰" },
      { text: "感覺被負能量包圍，身心俱疲", value: "protection", icon: "🛡️" },
      { text: "情緒不穩定，焦慮睡不好", value: "healing", icon: "🧘" }
    ]
  },
  {
    id: 2,
    question: "你最希望在生活中增加什麼？",
    options: [
      { text: "更多溫暖的連結與愛", value: "love", icon: "💖" },
      { text: "更多豐盛與機會", value: "wealth", icon: "✨" },
      { text: "更強的內心力量與邊界感", value: "protection", icon: "💪" },
      { text: "更深的平靜與自我了解", value: "healing", icon: "🌸" }
    ]
  },
  {
    id: 3,
    question: "你最喜歡哪種顏色的能量？",
    options: [
      { text: "粉色・溫柔・浪漫", value: "love", icon: "🌸" },
      { text: "金色・陽光・豐盛", value: "wealth", icon: "🌟" },
      { text: "黑色・神秘・穩定", value: "protection", icon: "🖤" },
      { text: "紫色・靈性・智慧", value: "healing", icon: "💜" }
    ]
  }
];

export const categoryResultMap: Record<string, string> = {
  love: "rose-quartz-bracelet",
  wealth: "citrine-bracelet",
  protection: "obsidian-bracelet",
  healing: "amethyst-bracelet"
};

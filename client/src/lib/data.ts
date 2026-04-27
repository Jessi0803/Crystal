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
    id: "custom-deposit-product",
    name: "客製化商品",
    subtitle: "客製化服務訂金下單專用",
    category: "custom",
    categoryLabel: "客製化",
    price: 1,
    image: "/logo.png",
    tags: ["客製化", "訂金"],
    description: "客製化服務訂金專用商品。老闆確認需求後，會另外提供尾款付款連結。",
    story: "此商品用於客製化服務的訂金下單。完成訂金付款後，訂單會進入「已付訂金」，待老闆確認內容後可產生尾款付款連結。",
    benefits: [
      "保留客製化製作排程",
      "作為客製化服務的訂金憑證",
      "老闆可於後台產生尾款付款連結",
    ],
    suitableFor: ["已與老闆確認要進行客製化服務的顧客"],
    howToUse: ["此商品為訂金專用，下單後請留意後續尾款付款連結。"],
    disclaimer: "此商品為客製化服務訂金，實際尾款金額由老闆確認後另行通知。",
    inStock: true,
    featured: false,
    crystalType: "客製化服務",
    color: "訂金",
  },
  {
    id: "tarot-crystal-deposit-product",
    name: "塔羅 × 水晶手鍊客製化商品",
    subtitle: "塔羅 × 水晶手鍊客製化服務訂金下單專用",
    category: "custom",
    categoryLabel: "客製化",
    price: 1,
    image: "/logo.png",
    tags: ["客製化", "訂金", "塔羅"],
    description: "塔羅 × 水晶手鍊客製化服務訂金專用商品。老闆確認需求後，會另外提供尾款付款連結。",
    story: "此商品用於塔羅 × 水晶手鍊客製化服務的訂金下單。完成訂金付款後，訂單會進入「已付訂金」，待老闆確認內容後可產生尾款付款連結。",
    benefits: [
      "保留塔羅 × 水晶手鍊客製化製作排程",
      "作為客製化服務的訂金憑證",
      "老闆可於後台產生尾款付款連結",
    ],
    suitableFor: ["已決定預約塔羅 × 水晶手鍊客製化服務的顧客"],
    howToUse: ["此商品為訂金專用，下單後請留意後續尾款付款連結。"],
    disclaimer: "此商品為客製化服務訂金，實際尾款金額由老闆確認後另行通知。",
    inStock: true,
    featured: false,
    crystalType: "客製化服務",
    color: "訂金",
  },
  {
    id: "d001-moon-secret",
    name: "月下密語手鍊",
    subtitle: "淨化壓力，喚醒內在平靜與魅力",
    category: "healing",
    categoryLabel: "療癒系列",
    price: 1480,
    originalPrice: 1880,
    image: "/images/d-design/d001.jpg",
    tags: ["淨化", "平衡"],
    description: "水晶：白幽靈、藍月光、灰月光、藍針、珍珠",
    story: "",
    benefits: [
      "淨化負能量與過去不好的記憶",
      "平衡身心靈並釋放壓力焦慮",
      "增強直覺與靈感，提升創造力",
      "提升自信與勇氣，加強表達力",
      "招人緣並保護免受外在負能量侵擾"
    ],
    suitableFor: ["近期壓力較大者", "希望穩定情緒與提升魅力者", "想增強溝通表達與靈感者"],
    howToUse: [
      "手圍：12、12.5、13、13.5、14、14.5、15、15.5、16、16.5、17、17.5、18、18.5、19",
      "手圍小於13.5－1480$，手圍14-17－1580$，手圍大於18－1680$",
      "標準為彈力繩版本；若改龍蝦扣或磁扣需加收 200 元"
    ],
    disclaimer: "本商品為天然礦石飾品，具有個人能量支持作用，非醫療用品，不具任何醫療療效。效果因個人能量狀態而異。",
    inStock: true,
    featured: false,
    crystalType: "白幽靈、藍月光、灰月光、藍針、珍珠",
    color: "月光白藍"
  },
  {
    id: "d002-honey-realm",
    name: "蜜光之境手鍊",
    subtitle: "財富、人緣與保護能量一次到位",
    category: "wealth",
    categoryLabel: "財運事業",
    price: 1580,
    originalPrice: 1880,
    image: "/images/d-design/d002.jpg",
    tags: ["招財", "人緣"],
    description: "結合銅髮晶、黃水晶、草莓晶、葡萄石、太陽石等多種晶石，打造豐盛且穩定的能量場。",
    story: "蜜光之境是一款複方設計，兼顧行動力、財富運與情緒平衡。適合想加速執行目標，同時維持內在穩定與人際和諧者。商品會因手圍不同而有些微變化；若需改龍蝦扣或磁扣，需加收 200 元工本費。",
    benefits: [
      "招財聚能並提升行動力",
      "吸引愛情與好人緣",
      "淨化並放大個人能量",
      "強化保護力與穩定氣場",
      "帶來療癒、活力與內在穩定",
      "促進成長並增強自信"
    ],
    suitableFor: ["希望同時提升財運與人緣者", "正在衝刺工作目標者", "需要穩定情緒與防護力者"],
    howToUse: [
      "手圍可選 12-19 公分，請依淨手圍下單",
      "標準為彈力繩版本；若改龍蝦扣或磁扣需加收 200 元"
    ],
    disclaimer: "本商品為天然礦石飾品，具有個人能量支持作用，非醫療用品，不具任何醫療療效。效果因個人能量狀態而異。",
    inStock: true,
    featured: false,
    crystalType: "銅髮晶、黃水晶、草莓晶、白水晶、黑曜石、珍珠、葡萄石、太陽石、粉晶",
    color: "蜜金暖粉"
  },
  {
    id: "d003-venus",
    name: "維納斯 Venus",
    subtitle: "喚醒自信與吸引力的日常配戴款",
    category: "pendant",
    categoryLabel: "吊飾",
    price: 950,
    image: "/images/d-design/d003.jpg",
    tags: ["自信", "魅力"],
    description: "以太陽石、鈦晶、藍月光、白水晶與珍珠搭配，外觀俐落且適合日常。",
    story: "維納斯 Venus 設計聚焦在自信、行動與柔和魅力。適合想提升氣場、穩定情緒，並維持清晰判斷與直覺的人。",
    benefits: [
      "提升自信與行動力",
      "招財聚能並放大正向能量",
      "穩定情緒與提升直覺力",
      "柔化氣質並帶來內在平衡"
    ],
    suitableFor: ["想建立自信與氣場者", "需要兼顧事業與情緒平衡者", "偏好輕量日常配戴者"],
    howToUse: [
      "每月淨化一次，保持晶石清晰頻率",
      "避免長時間接觸化學清潔與香水"
    ],
    disclaimer: "本商品為天然礦石飾品，具有個人能量支持作用，非醫療用品，不具任何醫療療效。效果因個人能量狀態而異。",
    inStock: true,
    featured: false,
    crystalType: "太陽石、鈦晶、藍月光、白水晶、珍珠",
    color: "金白月光"
  },
  {
    id: "d004-morning-whisper",
    name: "晨光輕語手鍊",
    subtitle: "在溫柔中建立保護與愛的平衡",
    category: "love",
    categoryLabel: "愛情桃花",
    price: 1800,
    originalPrice: 2100,
    image: "/images/d-design/d004.jpg",
    tags: ["人緣", "平衡"],
    description: "由白幽靈、紅兔毛、藍月光、白兔毛、粉碧璽等晶石構成，層次柔和且氣場飽滿。",
    story: "晨光輕語適合在關係與自我之間尋找平衡的人。它將淨化、防護與柔和愛能量融合在同一條手鍊中。商品會因手圍不同而有些微變化；若需改龍蝦扣或磁扣，需加收 200 元工本費。",
    benefits: [
      "淨化負能量並穩定氣場",
      "提升愛情運與好人緣",
      "柔化情緒、增加安全感",
      "增強直覺與感受力"
    ],
    suitableFor: ["希望穩定關係能量者", "容易受外界情緒影響者", "想提升人緣與溫柔魅力者"],
    howToUse: [
      "手圍可選 12-19 公分，請依淨手圍下單",
      "標準為彈力繩版本；若改龍蝦扣或磁扣需加收 200 元"
    ],
    disclaimer: "本商品為天然礦石飾品，具有個人能量支持作用，非醫療用品，不具任何醫療療效。效果因個人能量狀態而異。",
    inStock: true,
    featured: false,
    crystalType: "白幽靈、紅兔毛、藍月光、白兔毛、白水晶、粉碧璽、珍珠、白月光",
    color: "晨光粉白"
  },
  {
    id: "d005-moon-clear-heart",
    name: "月映淨心手鍊",
    subtitle: "柔和淨化，回到穩定且被愛的狀態",
    category: "healing",
    categoryLabel: "療癒系列",
    price: 1500,
    originalPrice: 1800,
    image: "/images/d-design/d005.jpg",
    tags: ["淨化", "愛情"],
    description: "以粉晶、白月光、藍月光與白水晶為主軸，搭配珍珠呈現溫柔安定的月光系設計。",
    story: "月映淨心著重在情緒安撫與關係能量修復。適合在高敏感或疲憊時期配戴，提醒自己回到穩定節奏。商品會因手圍不同而有些微變化；若需改龍蝦扣或磁扣，需加收 200 元工本費。",
    benefits: [
      "吸引愛情與好人緣",
      "柔化心性與安撫情緒",
      "淨化並放大正向能量",
      "提升直覺與內在感受力",
      "帶來溫柔且穩定的安全感"
    ],
    suitableFor: ["想穩定內在節奏者", "希望修復情緒與關係者", "偏好柔和月光系設計者"],
    howToUse: [
      "手圍可選 12-19 公分，請依淨手圍下單",
      "標準為彈力繩版本；若改龍蝦扣或磁扣需加收 200 元"
    ],
    disclaimer: "本商品為天然礦石飾品，具有個人能量支持作用，非醫療用品，不具任何醫療療效。效果因個人能量狀態而異。",
    inStock: true,
    featured: false,
    crystalType: "粉晶、白月光、珍珠、白水晶、藍月光",
    color: "粉白月光"
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
    name: "[測試用] 轉帳測試商品 16元",
    subtitle: "轉帳最低金額測試，請勿真實購買",
    category: "test",
    categoryLabel: "測試",
    price: 16,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663525376407/HsiMZrubGHyjhN4cohRHuH/product-rose-quartz-Cyp9uT5H6cB8cyt34mmWeU.webp",
    tags: ["測試"],
    description: "測試用商品，僅供測試轉帳金流流程用。",
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
    id: "protect",
    icon: "🛡️",
    name: "能量防護",
    description: "遠離負能量，建立能量防護罩",
    crystals: "黑曜石・黑碧璽",
    color: "from-slate-50 to-gray-100",
    borderColor: "border-slate-300",
    textColor: "text-slate-700"
  },
  {
    id: "healing",
    icon: "🧘",
    name: "療癒系列",
    description: "安撫焦慮，找回內在平靜",
    crystals: "紫水晶・月光石",
    color: "from-violet-50 to-purple-100",
    borderColor: "border-violet-200",
    textColor: "text-violet-700"
  },
  {
    id: "necklace",
    icon: "📿",
    name: "項鍊",
    description: "日常疊戴，展現優雅與個人風格",
    crystals: "鎖骨鍊・能量鍊",
    color: "from-stone-50 to-zinc-100",
    borderColor: "border-stone-300",
    textColor: "text-stone-700"
  },
  {
    id: "pendant",
    icon: "🧿",
    name: "吊飾",
    description: "隨身點綴，帶著能量一起出門",
    crystals: "守護吊飾・隨身掛件",
    color: "from-sky-50 to-cyan-100",
    borderColor: "border-cyan-200",
    textColor: "text-cyan-700"
  },
  {
    id: "other",
    icon: "✨",
    name: "其他",
    description: "更多特別款與周邊配件",
    crystals: "限定品・配件",
    color: "from-neutral-50 to-slate-100",
    borderColor: "border-slate-200",
    textColor: "text-slate-700"
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
  love: "d003-venus",
  wealth: "d002-honey-realm",
  protection: "d001-moon-secret",
  healing: "d005-moon-clear-heart"
};

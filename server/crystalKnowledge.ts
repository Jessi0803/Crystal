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
    id: "faq-deposit-price",
    question: "訂金是多少？之後還要付什麼？",
    answer: "各方案訂金不同：純客製 500 元、塔羅方案 1,399 元、脈輪/生命靈數方案各 1,000 元。老闆設計完成品圖後確認滿意再支付尾款，手鍊總價依方案而定。詳細總價見：https://goodaytarot.com/custom",
    embedText: "訂金多少 訂金 尾款 費用 付款 多少錢 價格 方案費用",
    keywords: ["訂金", "尾款", "費用", "多少錢", "價格", "付款金額"],
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
    question: "可以免費修改嗎？",
    answer: "每個方案提供初版免費修改 1 次。有其他需求歡迎透過 LINE 討論：https://line.me/R/ti/p/@011tymeh",
    embedText: "可以免費修改嗎 修改 免費修改 改設計 不滿意 修改幾次",
    keywords: ["免費修改", "修改", "改設計", "不滿意", "修改次數"],
    category: "客製化",
  },
  {
    id: "faq-dislike-design",
    question: "如果我不喜歡成品圖怎麼辦？",
    answer: "可使用免費修改 1 次。歡迎透過 LINE 聯絡：https://line.me/R/ti/p/@011tymeh",
    embedText: "不喜歡成品圖 成品圖 不滿意設計 修改 改款 設計不好看",
    keywords: ["成品圖", "不喜歡", "不滿意", "修改設計", "改款"],
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
    id: "faq-fit-preference",
    question: "手鍊尺寸可以選鬆緊嗎？",
    answer: "可以，填寫表單時可選擇「剛好」（有水晶壓痕但不掐肉）或「微鬆」（可輕微滑動）。前往填寫：https://goodaytarot.com/custom",
    embedText: "手鍊鬆緊 尺寸鬆緊 剛好 微鬆 鬆緊偏好 寬鬆 緊",
    keywords: ["鬆緊", "剛好", "微鬆", "尺寸偏好", "寬鬆"],
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
    id: "faq-silver-tube-bead",
    question: "可以加銀管或珠框嗎？",
    answer: "可以，在表單填寫時可選擇是否加入銀管或珠框，兩者可分開選擇。前往填寫：https://goodaytarot.com/custom",
    embedText: "銀管 珠框 加銀管 加珠框 配件 裝飾",
    keywords: ["銀管", "珠框", "配件", "加銀管", "加珠框"],
    category: "常見問題",
  },
  {
    id: "faq-payment-methods",
    question: "支援哪些付款方式？",
    answer: "台灣地區（含離島）：轉帳、信用卡、Apple Pay（信用卡及 Apple Pay 需額外支付 2% 手續費）。台灣以外地區：僅支援 PayPal（需額外支付 6% 手續費）。",
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
    answer: "早鳥優惠價 12,888 元（共 6 小時），兩人同行再減 888 元/人。地點：桃園小檜溪區（預約制）。課程分三段：①理論/創業基礎（2hr）②手作 3 件作品（3hr）③淨化保養與連結（0.5hr）。包含 6 種核心製作技法及龍蝦扣、磁扣、U 型扣等進階技法，IG 分享可獲贈品。報名請私訊 LINE：https://line.me/R/ti/p/@011tymeh",
    embedText: "水晶創業全能班費用 創業班費用 課程內容 大綱 12888 桃園 報名",
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
    id: "faq-wear-always",
    question: "水晶手鍊可以一直戴著嗎？睡覺也可以戴嗎？",
    answer: "一般建議白天配戴，睡眠時可取下讓水晶休息並放置淨化。如果非常想要 24 小時配戴，建議選擇金飾款。",
    embedText: "一直戴著 睡覺戴 24小時 一直戴 睡眠時 配戴時間 可以一直戴嗎",
    keywords: ["一直戴", "睡覺戴", "24小時", "配戴時間", "睡眠"],
    category: "常見問題",
  },
  {
    id: "faq-broken-crystal",
    question: "水晶斷掉或脫落代表什麼？",
    answer: "水晶斷裂通常代表它已吸收了足夠的負能量或完成使命，不需要擔心。歡迎私訊 LINE 討論後續：https://line.me/R/ti/p/@011tymeh",
    embedText: "水晶斷掉 水晶斷了 脫落 掉了 斷裂 代表什麼 不好的預兆",
    keywords: ["水晶斷掉", "斷裂", "脫落", "代表什麼", "斷了"],
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
    question: "可以看到成品圖再決定要不要購買嗎？",
    answer: "客製化流程為先付訂金，老闆設計完成品圖後給您確認，滿意再支付尾款，提供 1 次免費修改。",
    embedText: "先看成品圖 成品圖確認 先看設計 看圖再付款 設計確認",
    keywords: ["成品圖", "先看設計", "設計確認", "看圖", "確認後付款"],
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
    answer: "台灣地區（含離島）提供黑貓宅急便（$100）及 7-11 店到店（$60），單次購買兩條以上免運。海外可寄送至馬來西亞、香港、新加坡、美國、英國、澳洲。詳見：https://goodaytarot.com/shopping-guide",
    embedText: "配送方式 運送 黑貓 7-11 店到店 宅配 免運 寄送",
    keywords: ["配送方式", "運送", "黑貓", "7-11", "店到店", "宅配", "免運"],
    category: "常見問題",
  },
  {
    id: "faq-shipping-fee",
    question: "運費是多少？",
    answer: "黑貓宅急便 $100、7-11 店到店 $60，單次購買兩條以上免運。",
    embedText: "運費多少 運費 宅配費 免運 運費計算",
    keywords: ["運費", "多少", "宅配費", "免運"],
    category: "常見問題",
  },
  {
    id: "faq-overseas-shipping",
    question: "可以寄送到海外嗎？",
    answer: "可以，支援寄送至馬來西亞、香港、新加坡、美國、英國、澳洲，付款方式為 PayPal（需額外支付 6% 手續費）。",
    embedText: "海外寄送 寄到國外 海外配送 馬來西亞 香港 新加坡 美國 英國 澳洲 國際",
    keywords: ["海外", "國外", "馬來西亞", "香港", "新加坡", "美國", "英國", "澳洲", "國際"],
    category: "常見問題",
  },
  {
    id: "faq-dispatch-time",
    question: "下單後多久會出貨？",
    answer: "現貨商品約 1–3 個工作天出貨；客製化商品需等雙方確認設計稿後安排出貨，實際時間依製作進度而定，請私訊 LINE 確認：https://line.me/R/ti/p/@011tymeh",
    embedText: "出貨多久 出貨時間 何時出貨 幾天到 幾天出貨 快速出貨",
    keywords: ["出貨時間", "多久", "幾天", "出貨", "何時出貨"],
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
      "推薦「維納斯 Venus」（提升自信與行動力、招財聚能、穩定情緒，輕量日常款，NT$950）和「蜜光之境」（增強自信、吸引人緣、穩定氣場，NT$1,580）。兩款都適合想建立自信氣場的你！",
    embedText: "提升自信 自信心 魅力 吸引力 氣場 行動力 增強自信 建立自信 想變自信 自我提升",
    keywords: ["自信", "魅力", "吸引力", "氣場", "行動力", "提升自信"],
    category: "商品推薦",
    relatedProductIds: ["d003-venus", "d002-honey-realm"],
  },
  {
    id: "rec-wealth",
    question: "哪款手鍊適合招財、提升財運或事業運？",
    answer:
      "推薦「蜜光之境」（招財聚能、提升行動力、財富人緣一次到位，NT$1,580）和「維納斯 Venus」（招財放大正向能量、提升自信行動力，NT$950）。",
    embedText: "招財 財運 財富 錢財 事業 工作 升遷 行動力 提升財運 招財手鍊 賺錢",
    keywords: ["招財", "財運", "財富", "事業", "工作", "升遷", "賺錢"],
    category: "商品推薦",
    relatedProductIds: ["d002-honey-realm", "d003-venus"],
  },
  {
    id: "rec-love",
    question: "哪款手鍊適合提升愛情、桃花或人緣？",
    answer:
      "推薦「晨光輕語」（提升愛情人緣、柔化情緒增加安全感，NT$1,800）、「月映淨心」（吸引愛情、安撫情緒、帶來溫柔安全感，NT$1,500）和「蜜光之境」（吸引愛情與好人緣，NT$1,580）。",
    embedText: "愛情 桃花 人緣 感情 戀愛 交友 吸引異性 提升桃花 正緣 好人緣 脫單",
    keywords: ["愛情", "桃花", "人緣", "感情", "戀愛", "正緣", "交友", "脫單"],
    category: "商品推薦",
    relatedProductIds: ["d004-morning-whisper", "d005-moon-clear-heart", "d002-honey-realm"],
  },
  {
    id: "rec-healing",
    question: "哪款手鍊適合療癒、釋放壓力或安撫情緒？",
    answer:
      "推薦「月下密語」（淨化負能量、釋放壓力焦慮、增強直覺靈感，NT$1,480）和「月映淨心」（安撫情緒、淨化放大正向能量、帶來溫柔安全感，NT$1,500）。",
    embedText: "療癒 壓力 焦慮 情緒 安撫 紓壓 放鬆 不安 釋放壓力 情緒穩定 心情不好 負面情緒",
    keywords: ["療癒", "壓力", "焦慮", "情緒", "安撫", "紓壓", "放鬆", "心情不好"],
    category: "商品推薦",
    relatedProductIds: ["d001-moon-secret", "d005-moon-clear-heart"],
  },
  {
    id: "rec-protection",
    question: "哪款手鍊適合防護負能量、保護氣場？",
    answer:
      "推薦「月下密語」（淨化並防護外在負能量、平衡身心靈，NT$1,480）和「蜜光之境」（強化保護力與穩定氣場、放大個人能量，NT$1,580）。",
    embedText: "防護 負能量 保護 氣場 淨化 穩定 防小人 避邪 保護能量 驅邪",
    keywords: ["防護", "負能量", "保護", "氣場", "淨化", "防小人", "驅邪"],
    category: "商品推薦",
    relatedProductIds: ["d001-moon-secret", "d002-honey-realm"],
  },
];

// ─── Embedding 向量搜尋 ──────────────────────────────────────────────────────

import rawEmbeddings from "./faqEmbeddings.json";
const _embeddings = rawEmbeddings as { id: string; vector: number[] }[];

function loadEmbeddings() {
  return _embeddings;
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

function keywordSearch(query: string, topK: number): KnowledgeChunk[] {
  const q = query.toLowerCase();
  const scored = knowledgeChunks.map((c) => ({
    chunk: c,
    hits: c.keywords.filter((k) => q.includes(k.toLowerCase()) || k.toLowerCase().includes(q)).length,
  }));
  return scored
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, topK)
    .map((s) => s.chunk);
}

export type ScoredChunk = KnowledgeChunk & { score: number };

export async function searchKnowledge(
  query: string,
  queryVector: number[],
  topK = 3,
  threshold = 0.45
): Promise<ScoredChunk[]> {
  const embeddings = loadEmbeddings();

  const vectorResults: ScoredChunk[] = [];
  if (embeddings.length > 0) {
    const scored = embeddings.map(({ id, vector }) => ({
      id,
      score: cosineSimilarity(queryVector, vector),
    }));
    const top = scored
      .filter((s) => s.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    for (const { id, score } of top) {
      const chunk = knowledgeChunks.find((c) => c.id === id);
      if (chunk) vectorResults.push({ ...chunk, score });
    }
  }

  // keyword 永遠跑，補上向量搜尋沒找到的結果（score = 0）
  const seen = new Set(vectorResults.map((c) => c.id));
  const kwResults = keywordSearch(query, topK)
    .filter((c) => !seen.has(c.id))
    .map((c) => ({ ...c, score: 0 }));

  return [...vectorResults, ...kwResults].slice(0, topK);
}

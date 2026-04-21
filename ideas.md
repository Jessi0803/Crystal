# Crystal Aura 設計方案

## 方案一：「月光典雅」Lunar Elegance
<response>
<text>
**設計運動**：日本極簡主義 × 輕奢療癒美學（Wabi-Sabi Luxe）

**核心原則**：
- 大量留白，讓商品「呼吸」
- 不對稱排版，打破制式感
- 手寫感細節點綴，傳遞溫度
- 金色細線作為視覺引導

**色彩哲學**：
- 主色：米白 #FAF7F2（溫暖底色，如月光灑在宣紙上）
- 輔色：淡粉 #F0D9D5（粉水晶的溫柔）
- 強調：霧金 #C9A96E（輕奢點綴，非俗氣金色）
- 文字：深棕 #3D2B1F（溫暖而不冷硬）

**排版典範**：
- Hero 區塊：左文右圖，不對稱構圖
- 商品卡片：縱向長卡，大圖小字
- 分類入口：橫向滾動，寬螢幕展開

**標誌性元素**：
- 細金線分隔（1px 金色橫線）
- 圓形水晶特寫圖（帶透明感）
- 日文漢字點綴（能量、愛、運）

**互動哲學**：
- 懸停時卡片輕微上浮（translateY -4px）
- 按鈕邊框從左向右填充
- 頁面滾動時元素淡入

**動畫**：
- 入場：opacity 0→1 + translateY 20px→0，0.6s ease-out
- 卡片懸停：box-shadow 加深 + 輕微縮放 1.02
- CTA 按鈕：背景色從透明到霧金，0.3s

**字體系統**：
- 標題：Noto Serif TC（典雅繁體）
- 副標：Noto Sans TC Light（輕盈現代）
- 英文點綴：Cormorant Garamond Italic（奢華感）
</text>
<probability>0.08</probability>
</response>

## 方案二：「晨霧療癒」Morning Mist Healing
<response>
<text>
**設計運動**：北歐極簡主義 × 現代療癒美學（Scandinavian Wellness）

**核心原則**：
- 柔和漸層背景，如晨霧般朦朧
- 卡片式設計，清晰的資訊層次
- 大字標題，強烈的視覺衝擊
- 微妙的玻璃擬態（Glassmorphism）效果

**色彩哲學**：
- 背景：米白到淡紫漸層 #FDF8F5 → #F5EEF8
- 主色：薰衣草紫 #9B7EC8（神秘療癒）
- 輔色：玫瑰粉 #E8B4B8（溫柔桃花）
- 金色：#D4AF37（財運點綴）
- 文字：深灰藍 #2D3748

**排版典範**：
- 全版 Hero，文字居中，背景水晶大圖
- 功效分類：2×2 網格卡片
- 商品展示：3欄網格，懸停展開詳情

**標誌性元素**：
- 玻璃擬態卡片（backdrop-blur + 半透明白）
- 水晶光暈效果（radial-gradient 光點）
- 圓角大卡片（border-radius 20px）

**互動哲學**：
- 玻璃卡片懸停時折射光效
- 滾動視差（Parallax）背景
- 按鈕點擊時波紋擴散

**動畫**：
- 入場：stagger 動畫，每個元素延遲 0.1s
- 光暈：keyframe 動畫，緩慢脈動
- 卡片：3D 翻轉展示商品詳情

**字體系統**：
- 標題：Playfair Display（英文優雅）+ Noto Serif TC
- 內文：Noto Sans TC Regular
- 標籤：Noto Sans TC Medium
</text>
<probability>0.07</probability>
</response>

## 方案三：「晶礦奢華」Crystal Luxe Editorial
<response>
<text>
**設計運動**：高端時尚雜誌編輯風 × 礦石美學（Editorial Luxury）

**核心原則**：
- 大膽的排版對比（極大 vs 極小）
- 橫向滾動區塊，打破線性閱讀
- 黑白照片 + 彩色水晶的強烈對比
- 奢侈品牌式的極度留白

**色彩哲學**：
- 底色：純白 #FFFFFF + 暖米 #F9F5F0
- 主色：深炭黑 #1A1A1A（高端感）
- 強調：玫瑰金 #B76E79（精品點綴）
- 水晶色：自然礦石色系（粉、紫、金）

**排版典範**：
- Hero：全螢幕，巨大標題疊加水晶圖
- 商品：雜誌式不規則網格
- 文案：大小字對比，創造視覺節奏

**標誌性元素**：
- 超大字號標題（clamp 60px-120px）
- 細線框（1px border）
- 黑色 CTA 按鈕（反差強烈）

**互動哲學**：
- 游標自定義（水晶圖示）
- 磁吸式按鈕懸停效果
- 滾動觸發的文字揭露動畫

**動畫**：
- 文字：逐字顯現（clip-path reveal）
- 圖片：縮放進入（scale 1.1→1）
- 頁面轉場：淡出淡入

**字體系統**：
- 主標：Bodoni Moda（雜誌感）
- 副標：Noto Sans TC Light
- 英文：Cormorant Garamond
</text>
<probability>0.06</probability>
</response>

---

## 選定方案：方案一「月光典雅」Lunar Elegance

選擇理由：最符合目標客群（20-40歲女性）的審美偏好，日本極簡主義帶來的療癒感與信任感，配合霧金點綴傳遞輕奢品牌定位，同時保持高轉換率所需的清晰資訊層次。

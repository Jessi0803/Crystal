# LEARNING.md

**這份檔案追蹤的是「我的工程能力」，不是技術筆記。**

筆記記錄「這個東西是什麼」；這裡記錄「我到什麼程度、憑什麼這樣判斷」。
搭配 `AGENTS.md` §2 的 Learning-First Development 使用。

---

## Level 定義

| Level | 意義 |
|---|---|
| **Unassessed** | 尚未實際確認。**不等於不會**，只代表還沒有觀察到的依據。 |
| **L0 Unknown** | 確認過不熟悉，需要從概念開始 |
| **L1 Seen** | 看過、聽過、被解釋過，但無法獨立運用 |
| **L2 Developing** | 能提出方向，但會漏 edge case，需要 review |
| **L3 Independent** | 能獨立設計與實作，能說明 trade-off |
| **L4 Strong** | 能 review 他人設計、預判風險、在不熟的 codebase 裡遷移運用 |

---

## 更新原則（重要）

### 這些**不能**當作 Level 提升的理由

- ❌ AI 解釋過這個概念
- ❌ AI 產生的 code 跑起來了
- ❌ 我說「我懂了」
- ❌ 功能做完了、上線了

### 只有這些**才算 Evidence**

- ✅ 我能用自己的話解釋概念（不是複述 AI 的說法）
- ✅ 我能在新情境裡**辨識出**同一類問題
- ✅ 我能主動提出合理方案
- ✅ 我能說明 trade-off 與替代方案
- ✅ 我能獨立 debug 同類問題

**沒有足夠 Evidence 就維持原 Level。** 停在原地是正常的，虛報才是問題。
降級也是允許的——如果同一個概念再次出現時答不出來，就往下修並記在 Notes。

### Evidence 怎麼寫

寫「發生了什麼事」，不要寫「學了什麼」：

- 好：`2026-10-02 自己指出 coupon 併發下單會重複折抵，提出用條件式 UPDATE 保留，並說明為何不用 SELECT 後再 UPDATE`
- 壞：`了解了 race condition`

---

## Active Learning

> 目前真正在加強的能力。**最多 2–3 項**，多了就不是重點。
> 一項能力達到目標 Level 或暫時擱置，就從這裡移除。

_（尚未設定。等實際遇到問題、確認過程度後再放入。）_

---

## Skills

> 所有項目目前一律 `Unassessed`——尚未實際確認，不做任何預設。
> 每次互動產生有效 Evidence 時才更新對應項目。

### Swift / iOS

> 本專案（React + Node）不涵蓋這些能力，Evidence 會來自其他專案。

#### Swift Concurrency
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** async/await、Task、TaskGroup、structured concurrency、cancellation

#### Actor / Data Isolation
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** actor 隔離、`@MainActor`、Sendable、data race 的編譯期防護

#### Memory Management
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** ARC、retain cycle、weak/unowned、closure capture list

#### UIKit Architecture
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** view controller 生命週期、MVC/MVVM/Coordinator、responder chain

#### SwiftUI State Management
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** `@State` / `@Binding` / `@Observable` / `@Environment`、view identity 與重繪時機

---

### Architecture

#### Modular Architecture
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** 模組邊界、相依方向、循環相依、哪些東西該放 `shared/`

#### Dependency Injection
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** 相依反轉、可測試性、DI 與 service locator 的差異

---

### Backend / Database

#### Database Transactions
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** ACID、isolation level、交易邊界該畫在哪、長交易的代價

#### Race Conditions
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** 本專案高風險區：庫存扣減、優惠券保留（`reserveCoupon`）、限量商品搶購

#### Idempotency
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** 本專案高風險區：ECPay webhook 重送、cron 重複執行、通知信重複寄送

#### Database Schema Design
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** 正規化取捨、索引、快照欄位（如 `orderItems.productImage`）、migration 演進策略

---

### API / Security

#### Authentication vs Authorization
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** 「你是誰」vs「你能做什麼」；session、role、本專案的 `ctx.user`

#### API Authorization / IDOR
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** 本專案相關：`hasOrderAccess`、order access token、會員單 vs 訪客單的存取差異。
  2026-09-23 與 2026-09-29 兩次觸及此主題，但兩次都走 implementation mode（由 AI 說明），
  **尚未產生 Evidence，Level 不動**。下次再遇到時先讓我回想這兩次的結論。

#### Server-side Validation
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** 前端驗證只是 UX；金額、庫存、折扣一律伺服器重算，永不信任 client 傳來的價格

---

### E-commerce

#### Payment Webhooks
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** 本專案相關：ECPay 回調驗簽、重送處理、非同步付款結果與訂單狀態的一致性

#### Order State Design
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** 本專案相關：`orderStatus` × `paymentStatus` 雙軸、訂金／尾款、狀態轉移的合法性

#### Inventory Consistency
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** 本專案相關：限量商品、預購、超賣防護、扣減時機（下單 vs 付款）

#### Promotion / Coupon Architecture
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** 本專案相關：優惠券保留 TTL、每人上限、生日券不受模板上限限制、折抵計算歸屬伺服器

---

### 專案特有（本 repo 反覆出現的主題）

#### Serverless Deployment Constraints
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** Vercel function loader 不能 `require()` 純 ESM、bundle 與 external 套件、cold start

#### Caching & Image Delivery
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** Vercel Image Optimization、`srcSet` / `sizes`、CDN 快取、Blob 儲存

#### Background Jobs & Retry
- **Level:** Unassessed
- **Last reviewed:** —
- **Evidence:** —
- **Notes:** cron 排程、重複執行防護（已送出標記）、失敗降級（LINE 推播失敗改寄 Email）

---

## Learning History

> 只記錄**有實質學習價值**的事件。一般的功能開發、bug 修正不用寫。
> 一則記錄大約對應一次完整的 Learning Flow。

### 格式

```markdown
### YYYY-MM-DD — <主題>

- **Problem:** 當時遇到的實際問題
- **My initial reasoning:** 我一開始怎麼想的（誠實寫，包含想錯的部分）
- **What I missed:** 漏掉或誤解了什麼
- **Final understanding:** 最後的理解，用我自己的話
- **Evidence of understanding:** 我實際做到了什麼，證明真的懂了
- **Level change:** `<Skill>` Unassessed → L2（或「維持 L2」）
```

---

_（尚無記錄。第一次走完 Learning Flow 後補上。）_

# 活動功能最小驗收紀錄 — 2026-10-31

結果：**7 項通過、0 項失敗**，未執行全套測試或部署。

## 環境與 migration

- 實際 CURRENT_USER()：`3DeLUzaGBUJsiKt.root@%`，確認為 `crystal-test`。
- 0046、0047 已套用；既有訂單版本未回填。
- 本機新版程式，port 3200，Chromium，單 worker。
- 使用獨立驗收資料；未執行全套 seed/reset，未操作正式資料庫。
- 測試 Email／LINE 已停用。過程中 `RESEND_API_KEY 未設定` 是預期停用通知的日誌，不是付款或訂單失敗。

## 實際驗收

| 案例 | 結果與證據 |
|---|---|
| 一般商品活動＋優惠券 | 前台顯示活動折 222；2500 − 222 − 100 ＋ 130 = **2308**。滿 2400 的券拒絕使用；付款回呼核銷優惠券，取消後退回。 |
| 客製保存規則與尾款重試 | 測試庫現有客製訂金為 **500**。停用並修改活動後，最終總價 3333 仍依原規則折 **333**；含 100 元券與 130 運費，實付尾款 **2530**。失敗重試產生不同交易編號，成功後顯示完成付款；取消後退券。 |
| 新版逐單合併 | 有活動單報價 1500，無活動單報價 2000，各已付 500。逐單優惠合計 **111**，合併免運尾款 **2389**；未逐單報價時阻擋產生尾款。 |
| 舊流程與版本隔離 | 舊單使用 NULL 版本 fixture；尾款由 700 改 800，原連結編號不變；已有尾款仍能按原規則合併，再輸入合併尾款 1500。舊單新報價 API 被拒絕；新舊混合合併被拒絕且未建立群組。舊尾款頁不提供新版優惠券功能。 |
| 優惠折到零 | 邊界 fixture：總價 1111、訂金 1100、活動優惠 111、商品尾款 11、超商運費 60。應付 **0**，保存配送後結清，金流付款嘗試數為 **0**。 |
| 原有舊尾款信用卡重試 | 使用原本 `balance-payment.spec.ts` 案例；舊尾款連結保持不變，失敗後新交易編號付款，成功回呼後 UI 與資料庫顯示已付款。 |
| 原有舊零尾款配送 | 使用原本 `balance-payment.spec.ts` 案例；免運零尾款不出現付款選擇，送出配送資料後 UI 與訂單狀態正確。 |

主要 5 項耗時 1.2 分鐘，補充舊尾款 2 項耗時 30.3 秒。測試程式保留，後續可精準重跑，不需要執行整組。

## 範圍與限制

- 真實連接測試 TiDB，透過本機 HTTP API 與 Chromium 驗收；不是只測純計算函式或 mock DB。
- Legacy 與零元邊界使用獨立人工 fixture，不修改正式既有訂單。
- 驗證 ECPay sandbox 表單目的地、交易金額與本機簽章回呼。外部金流頁在舊尾款 UI 案例中被攔截；未驗收外部銀行／3DS 端到端交易、PayPal、實際 Email／LINE 寄送或物流建立。
- 畫面涵蓋活動管理列表、一般商品結帳折抵、舊尾款頁與新版尾款完成付款。管理員報價與合併透過同一組真實後台 API 驗證，未逐顆操作所有管理員 UI 控制項。
- 沒有重跑先前整組單元測試；先前 mock 測試的失敗紀錄仍保留於整合測試文件，不能將本次結果解讀為全專案測試全綠。
- 測試活動已在 afterAll 停用，保留獨立測試商品、會員、優惠券與訂單供核對。新程式未部署。

## 重跑

以下命令會寫入已確認的 crystal-test，需先有 `.env.test.local` 與 0046／0047：

```sh
NODE_ENV=test E2E_ALLOW_TEST_DB_WRITES=true pnpm_config_verify_deps_before_run=false pnpm exec playwright test --config=playwright.promotions.config.ts
NODE_ENV=test E2E_ALLOW_TEST_DB_WRITES=true pnpm_config_verify_deps_before_run=false pnpm exec playwright test --config=playwright.promotions-legacy.config.ts
```

為避免干擾其他驗收，主要案例若發現測試庫已有其他進行中活動，會停止，不會停用或覆蓋別人的活動。使用 port 3200，已有服務占用時也會停止，避免重用不明連線的 server。

## 本次測試資料

```json
{
  "run": "PAmvvy1tn2",
  "promotionId": 1,
  "userId": 4740002,
  "deposit": 500,
  "evidence": [
    {
      "case": "一般商品＋優惠券＋取消退回",
      "order": "CAMVVY29G2P5GB",
      "total": 2308
    },
    {
      "case": "客製保存規則與付款重試",
      "order": "CAMVVY2CFOLM3Q",
      "balance": "CB75AD8E4E82DFC17B0F",
      "total": 2530,
      "discount": 333
    },
    {
      "case": "新版逐單合併",
      "orders": [
        "CAMVVY2NT4PFAT",
        "CAMVVY2PP6BTKO"
      ],
      "balance": "CB039C98144311B15BED",
      "total": 2389
    },
    {
      "case": "舊流程與版本隔離",
      "orders": [
        "PAmvvy1tn2OLD1",
        "PAmvvy1tn2OLD2",
        "PAmvvy1tn2OLD3",
        "PAmvvy1tn2NEW1"
      ],
      "fixedLink": "CB180B6759835BF609CF"
    },
    {
      "case": "活動折尾款與運費至零",
      "order": "PAmvvy1tn2ZERO",
      "balance": "CBD17B9EF9455ACD92A0",
      "total": 0
    }
  ]
}
```

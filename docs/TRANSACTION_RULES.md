# TRANSACTION RULES — 交易與冪等規範

> 涉及 order / checkout / payment / refund / coupon / points / ledger / webhook /
> enrollment / quota / seat / balance / stock 時，先讀本檔與 `docs/INCIDENT_PREVENTION.md`。
> 金流與交易屬高風險，須走 `docs/AI_RULES.md` 第 5 節流程。

## 必守規則

1. **idempotency（冪等）**：同一操作重複執行結果一致，不重複入帳。用冪等鍵（idempotency key）+ UNIQUE constraint 保證。
2. **transaction（交易）**：多步驟寫入要嘛全成功、要嘛全回滾，不得留半套狀態。
3. **FOR UPDATE（行鎖）**：讀取後要更新的關鍵資料（庫存、名額、餘額）加行鎖，防併發競態。
4. **UNIQUE constraint**：防重複的最後防線放在資料庫層，不能只靠應用層。
5. **ledger（帳本）**：點數 / 金額異動一律留流水帳，可追溯、可對帳，不直接改餘額欄位了事。
6. **webhook 重複接收**：webhook 會重送，必須以事件 id 去重，重複接收但不得重複入帳。
7. **退款重複返還**：退款 / 點數返還要有狀態機與冪等鍵，防重複退。
8. **優惠碼重複核銷**：核銷寫入要有 UNIQUE（coupon_id + user_id 或使用記錄），防重複用。
9. **超賣**：名額 / 庫存 / 席次扣減要在交易內檢查餘量 + 行鎖，或用條件式 UPDATE（`where stock > 0`）。
10. **無效狀態排除**：計算時排除 `cancelled` / `expired` / `failed` 等無效狀態。
11. **不得只靠前端 disabled 防重複點擊**：前端 disabled 只是體驗，防重複的真正保證在資料庫層。
12. **DB 層必有唯一或防重複機制**：任何「不可重複」的業務，都要有對應的 UNIQUE / 條件約束。

## 檢查清單（涉及交易時逐項確認）

| # | 項目 | ✅ |
|---|---|---|
| 1 | 是否有冪等鍵 + UNIQUE？ | ☐ |
| 2 | 多步驟寫入是否包在 transaction？ | ☐ |
| 3 | 關鍵資源更新是否加 FOR UPDATE / 條件式 UPDATE？ | ☐ |
| 4 | 金額 / 點數是否有 ledger？ | ☐ |
| 5 | webhook 是否以事件 id 去重？ | ☐ |
| 6 | 退款 / 返還是否防重複？ | ☐ |
| 7 | 優惠碼是否防重複核銷？ | ☐ |
| 8 | 名額 / 庫存是否防超賣？ | ☐ |
| 9 | 是否排除 cancelled / expired / failed？ | ☐ |
| 10 | 防重複是否落在 DB 層（非僅前端）？ | ☐ |

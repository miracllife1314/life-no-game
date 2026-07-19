---
name: transaction-guard
description: Use when the task mentions order, checkout, payment, refund, coupon, points, ledger, webhook, enrollment, quota, seat, balance, stock, idempotency, or transaction. 當任務涉及訂單、結帳、付款、退款、優惠碼、點數、帳本、webhook、報名、名額、席次、餘額、庫存、冪等或交易時使用。
---

# Transaction Guard — 交易與冪等守衛

規則細節見 `docs/TRANSACTION_RULES.md`、`docs/INCIDENT_PREVENTION.md`、`docs/AI_RULES.md` 第 5 節。
此類任務屬高風險，動手前先提方案與風險。

## 必守規則

1. 必須具備 idempotency（冪等）。
2. webhook 可重複接收，但不得重複入帳。
3. 退款不得重複返還。
4. 點數異動必須有 ledger（帳本）。
5. 優惠碼不得重複核銷。
6. 名額、庫存、席次不得超賣。
7. 必要時使用 transaction。
8. 必要時使用 FOR UPDATE。
9. 必要時使用 UNIQUE constraint。
10. 必須排除 `cancelled` / `expired` / `failed` 等無效狀態。
11. 不得只靠前端 disabled 防重複點擊；防重複的保證放在 DB 層。

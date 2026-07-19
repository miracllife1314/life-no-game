# Database Engineer｜資料庫工程師（完整版）

> 精簡版與啟動條件見 `docs/ROLE_SYSTEM.md`。
> 規則單一事實來源：`docs/DB_DESIGN.md`、`docs/DB_MIGRATION_RULES.md`、`docs/TRANSACTION_RULES.md`。

## 1. 定位

守住資料的正確、一致與可回復。任何 schema / migration / RLS 變更都屬**高風險**（`docs/AI_RULES.md` §5），先停手提方案。

## 2. 核心責任

1. Schema 設計依 `docs/DB_DESIGN.md`：命名、COMMENT、RLS、個資標記、索引原則。
2. Migration 依 `docs/DB_MIGRATION_RULES.md`：只增不改、附影響範圍 / 風險 / 回滾 / 測試、不自動執行 SQL。
3. 交易一致性依 `docs/TRANSACTION_RULES.md`：冪等、transaction、FOR UPDATE、UNIQUE、ledger。
4. 資料存取集中在資料存取層（`docs/CODE_STANDARDS.md` §3），改 schema 只需改一層。
5. 每次資料庫變更同步更新 `docs/DB_DESIGN.md`（AI_RULES §8）。

## 3. 啟動時機

* 任何 schema / migration / RLS / index / trigger / function 變更（必啟動，高風險）。
* 交易、庫存、點數、名額等資料一致性設計。
* 查詢效能問題的根因分析。

## 4. 檢查清單（集中審查用）

```text
[ ] 新表啟用 RLS？無 using(true) / check(true)？
[ ] migration 是新增檔？既有 migration 未被修改？
[ ] 有回滾 SQL 或明確標註不可逆？
[ ] 「不可重複」的業務有 DB 層 UNIQUE / 條件約束？
[ ] 金額 / 點數異動走 ledger，不裸改餘額？
[ ] 常用查詢 / 外鍵 / 排序欄位評估過索引？
[ ] docs/DB_DESIGN.md 已同步？
```

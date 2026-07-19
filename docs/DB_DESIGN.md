# DB DESIGN — 資料庫設計

> 通用模板。每次資料表 / 欄位 / RLS / RPC / trigger / index 變更，
> 依 `docs/AI_RULES.md` 第 8 節同步更新本檔。

## 1. 資料表命名規則

1. 一律小寫、單字以底線分隔（snake_case）。
2. 資料表用複數名詞（例：`users`、`orders`、`point_ledgers`）。
3. 關聯表用 `a_b` 形式（例：`user_roles`）。
4. 不得使用中文表名、空白或大寫。

## 2. 欄位命名規則

1. snake_case。
2. 主鍵一律 `id`（uuid）。
3. 外鍵 `<entity>_id`（例：`user_id`、`order_id`）。
4. 時間欄位 `created_at`、`updated_at`（timestamptz）。
5. 布林欄位用 `is_` / `has_` 前綴（例：`is_active`）。
6. 金額 / 點數用整數（最小單位，避免浮點誤差）。

## 3. 中文 COMMENT 規則

1. 每張表都要有 `COMMENT ON TABLE`，說明用途。
2. 每個非顯而易見的欄位都要有 `COMMENT ON COLUMN`，用中文說明。
3. 敏感欄位（個資、金流、權限）的 COMMENT 需標註「敏感」。

範例：

```sql
comment on table <table_name> is '用途：<table_purpose>';
comment on column <table_name>.<user_id> is '所屬使用者（外鍵）';
```

## 4. RLS 設計原則

1. **新資料表一律啟用 RLS**。
2. 每張表都要有明確的 select / insert / update / delete policy。
3. 一般使用者原則上只能存取「屬於自己」的資料（`auth.uid() = user_id`）。
4. **禁止** `using(true)`、`with check(true)`、`allow_all_anon`。
5. 敏感欄位（role、permission、points、score）不得由一般使用者直接更新。
6. admin 專屬操作走獨立 policy 或 server-side（service_role 僅在 server）。

## 5. role / permission 設計原則

1. 角色定義集中管理，不散落在各處硬編碼。
2. 權限判斷以資料庫層級為準，不得只靠前端。
3. 角色升降權屬高風險，須走 `docs/AI_RULES.md` 第 5 節流程。

## 6. 個資欄位標記

1. 個資欄位在本檔表格的「是否敏感」欄標「是」。
2. 個資欄位的可見範圍需在 RLS 明確限制。
3. 不得將個資寫入 log 或 console（見 `docs/SECURITY_CHECKLIST.md`）。

## 7. 範例表格格式

## `<table_name>`

用途：`<table_purpose>`

| 欄位名稱 | 中文說明 | 型態 | 是否敏感 | 備註 |
|---|---|---|---|---|
| id | 主鍵 | uuid | 否 | 系統自動產生 |
| user_id | 所屬使用者 | uuid | 否 | 外鍵 → users.id |
| created_at | 建立時間 | timestamptz | 否 | 系統自動產生 |
| updated_at | 更新時間 | timestamptz | 否 | 系統自動更新 |

## 8. 索引原則

1. 常用查詢欄位、外鍵、排序欄位，以及排行榜 / 統計 / 後台列表會用到的欄位，應評估建立索引。
2. 避免在 500+ 使用者後才因全表掃描爆效能。
3. 新增 / 調整索引屬 schema 變更 → 走 `docs/AI_RULES.md` 第 5 節高風險流程。

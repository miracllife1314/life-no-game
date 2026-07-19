---
name: supabase-guard
description: Use when the task mentions migration, RLS, policy, alter table, create table, trigger, function, rpc, index, role, permission, auth, service_role, Supabase, or PostgreSQL. 當任務涉及 migration、RLS、policy、資料表、trigger、function、RPC、index、角色權限、service_role、Supabase 或 PostgreSQL 時使用。
---

# Supabase Guard — 資料庫與安全守衛

本專案採**手動 SQL 過渡模式**：AI 產生 SQL → 使用者審核 → 使用者貼到 Supabase Dashboard SQL Editor 執行。
規則細節見 `docs/DB_MIGRATION_RULES.md`、`docs/SECURITY_CHECKLIST.md`、`docs/AI_RULES.md` 第 5、7 節。

## 鐵律

1. 所有資料庫變更建立**新的增量 SQL**，不得修改既有 migration。
2. 不得自動執行 SQL、不得操作 production。
3. 禁止 `using(true)`、`check(true)`、`allow_all_anon`。
4. 禁止 service_role key 進前端。
5. 禁止一般使用者修改 `role`、`permission`、`points`、`score`。
6. 不得只靠前端判斷 admin 權限。
7. 不得用 localStorage 模擬正式登入。
8. 新資料表必須啟用 RLS。
9. **敏感表（金流/獎金/個資/權限/財務）不得只依賴 RLS**：Supabase default privileges 會自動
   GRANT 新表給 anon/authenticated，只寫 GRANT（加法）收不窄任何權限。migration 必須顯式
   `REVOKE ALL ON TABLE <t> FROM anon; REVOKE ALL ON TABLE <t> FROM authenticated;` 再最小 GRANT
   （anon 對敏感表零權限）；函式同理 `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated;`
   只 GRANT EXECUTE 給需要的角色（完整規則見 `docs/DB_MIGRATION_RULES.md` 鐵律 12）。

## SQL 交付格式

1. Migration 檔名
2. SQL 內容
3. 影響資料表 / 欄位
4. 是否影響 RLS
5. 是否影響登入與權限
6. 是否修改既有資料
7. 是否可回滾 / 回滾 SQL
8. 建議測試環境
9. 手動貼 SQL 前檢查清單

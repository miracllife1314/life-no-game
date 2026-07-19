# DB MIGRATION RULES — 資料庫 Migration 規範

> 涉及資料庫變更時，先讀本檔與 `docs/DB_DESIGN.md`、`docs/SECURITY_CHECKLIST.md`。
> 資料庫變更屬高風險，須走 `docs/AI_RULES.md` 第 5 節流程。

## 鐵律

1. 所有資料庫變更都必須建立**新的 migration SQL**，放在 `backend/supabase/migrations/`。
2. **不得修改任何既有 migration 檔**（包含任何已合併的 migration 檔）。
3. 不得自動執行 SQL。
4. 不得直接操作 production database。
5. 目前採**手動 SQL 模式**：AI 產生 SQL → 使用者手動審核 → 使用者貼到 Supabase Dashboard SQL Editor 執行。
6. SQL 必須附：影響範圍、風險、回滾方式、測試方式。
7. **新資料表必須啟用 RLS**。
8. **含個資或敏感資料的表，禁止** `using(true)`、`with check(true)`、`allow_all_anon`（大小寫皆禁）。
9. **例外：公開或參考資料表**（如全站設定、等級、徽章等純可公開的唯讀資料）若確需 `USING (true)`，必須先經人工審核確認該表**永遠不含機密/個資**，再依檔案類型登記放行：
   - **migration 檔**（不可修改）→ 登記到 `scripts/preflight-allow.txt`，格式「路徑:行號 原因」。**不可**在 migration 檔內加 inline 註記——那會違反「只增不改」並觸發 preflight 檢查 #6。
   - **非 migration 檔** → 在該命中行加 inline 註記 `-- preflight-allow: <原因>`。
   兩種放行都受 git 稽核，不得濫用；機密（sk_live 等）不受任何白名單影響，一律攔。
10. `role`、`permission`、`points`、`score` 等敏感欄位不得讓一般使用者直接更新。
11. 每次資料庫變更必須同步更新 `docs/DB_DESIGN.md`。
12. **敏感表（金流 / 獎金 / 個資 / 權限 / 財務）不得只依賴 RLS——必須顯式收斂 GRANT。**
    Supabase 對 public schema 的新表有 **default privileges，會自動 GRANT 給 anon 與 authenticated**；
    migration 只寫 GRANT（加法）等於什麼都沒收窄（實戰實證：anon 拿到 56 筆權限，全靠 RLS 單層硬撐）。
    建敏感表的 migration 必須：
    - `REVOKE ALL ON TABLE <t> FROM anon;` 與 `REVOKE ALL ON TABLE <t> FROM authenticated;`
    - 再只補必要的最小權限（anon 對敏感表**零權限**；authenticated 頂多必要 SELECT，
      寫入走 RPC / service_role）。
    - 函式同理：`REVOKE ALL ON FUNCTION <f> FROM PUBLIC, anon, authenticated;`
      再只 `GRANT EXECUTE` 給需要的角色。
    機器提醒：preflight 第 14 項會在「新 migration 建表卻無 REVOKE」時黃字提醒。

## Migration 檔名建議

```text
backend/supabase/migrations/<timestamp>_<動作>_<對象>.sql
例：20260705_add_column_is_active_to_users.sql
```

## SQL 交付格式（AI 產出時必附）

```text
1. Migration 檔名：
2. SQL 內容：
3. 影響資料表 / 欄位：
4. 是否影響 RLS：
5. 是否影響登入與權限：
6. 是否修改既有資料：
7. 是否可回滾 / 回滾 SQL：
8. 建議測試環境（local / staging）：
9. 手動貼 SQL 前檢查清單：
```

## 已知限制與演進路線

```text
目前採手動貼 SQL 到 Dashboard 是過渡方案。
優點是使用者可以人工審核，適合早期階段。
限制是缺乏完整版本控制，local / staging / production 容易 schema drift。
未來成熟後，應演進到 Supabase CLI migration / CI 流程，
讓 migration 有版本控制、可自動化、環境一致。
```

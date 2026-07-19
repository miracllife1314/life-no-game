# Security Engineer｜資安工程師（完整版）

> 精簡版與啟動條件見 `docs/ROLE_SYSTEM.md`。
> 規則單一事實來源：`docs/SECURITY_CHECKLIST.md`（18 項）、`docs/AI_RULES.md` §5、§7。

## 1. 定位

守住商用系統的安全底線：權限、個資、密鑰、金流。
原則：**權限以資料庫 / server 層為準，前端隱藏只是體驗**；密鑰永不進前端、永不進 Git。

## 2. 核心責任

1. 權限與個資變更屬高風險（AI_RULES §5）：RLS、role / permission、個資寫入更新刪除、可見範圍。
2. 每次涉及安全面的變更，逐項過 `docs/SECURITY_CHECKLIST.md`；機器可掃項交給 `scripts/preflight-check.sh`，語意判斷項人工確認。
3. 密鑰管理：`.env` 不進 Git、service_role 只在 server、公開前綴（如 `NEXT_PUBLIC_`）視為全公開。
4. 防繞路（AI_RULES §7）：不得為避開 RLS 改用 service_role、不得只做前端隱藏。
5. 公開端點限流防刷、上傳限制（SECURITY_CHECKLIST 第 16、17 項）；新建敏感表/函式顯式 REVOKE 後最小 GRANT（第 18 項，`docs/DB_MIGRATION_RULES.md` 鐵律 12）。
6. 高風險操作要求 audit log 與二次確認（`docs/UX_GUIDELINES.md` §二）。

## 3. 啟動時機

* 權限、登入、admin、個資、金流、檔案上傳、公開 API 相關任務（必啟動，高風險）。
* 部署前安全審查。

## 4. 檢查清單（集中審查用）

```text
[ ] SECURITY_CHECKLIST 18 項逐項過（機器項以 preflight 結果為準）
[ ] 一般使用者拿別人的 id 打 API，會被拒嗎？
[ ] 敏感欄位（role/permission/points/score）一般使用者改不動？
[ ] 個資有沒有進 log / console / 錯誤訊息？
[ ] 新增的密鑰是否只在 server、只在 .env？
```

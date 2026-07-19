# SECURITY CHECKLIST — 安全檢查表

> 涉及資料庫、權限、登入、個資、部署時逐項檢查。
> 可搭配 `scripts/preflight-check.sh` 做機器紅線掃描。

| # | 檢查項 | 通過標準 | ✅ |
|---|---|---|---|
| 1 | service_role key 是否只在後端使用？ | 僅 server 端讀取，前端無任何引用 | ☐ |
| 2 | 是否有 `NEXT_PUBLIC_` 外洩機密？ | 無任何機密以 NEXT_PUBLIC_ 命名 | ☐ |
| 3 | 是否所有資料表都啟用 RLS？ | 每張表 `enable row level security` | ☐ |
| 4 | 是否有 `using(true)`（含大寫 `USING (true)`）？ | 敏感/個資表無；公開參考表如有，須經審核並加 `-- preflight-allow` 標記 | ☐ |
| 5 | 是否有 `check(true)`？ | 同上 | ☐ |
| 6 | 是否有 `allow_all_anon`？ | 無 | ☐ |
| 6b | 「設定表 / 參考表」是否確認**永遠不放機密與個資**？ | 是（放行 `USING(true)` 的前提） | ☐ |
| 7 | admin 權限是否只靠前端判斷？ | 否，DB 層有保護 | ☐ |
| 8 | 一般使用者是否能越權讀取？ | 否，RLS 限制 `auth.uid()` | ☐ |
| 9 | 一般使用者是否能越權寫入？ | 否，RLS + 敏感欄位限制 | ☐ |
| 10 | 個資欄位是否有可見範圍限制？ | 是，RLS 明確限制 | ☐ |
| 11 | 是否有 localStorage 模擬正式登入？ | 否 | ☐ |
| 12 | 是否有 mock data 混入正式流程？ | 否 | ☐ |
| 13 | 是否有敏感資料 `console.log`？ | 否 | ☐ |
| 14 | 是否有 audit log（高風險操作）？ | 是 | ☐ |
| 15 | 是否有資料庫層級權限保護？ | 是，不只靠前端 | ☐ |
| 16 | 公開 API / 表單 / 登入 / 報名 / 邀約 / 上傳 / AI 端點是否有限流與防刷？ | 有速率限制、防重複提交、防刷機制 | ☐ |
| 17 | 檔案 / 圖片上傳是否限制大小、格式、數量與權限？ | 有明確限制，避免成本爆量、惡意上傳、敏感資料外洩 | ☐ |
| 18 | 新建敏感表 / 函式是否顯式 REVOKE anon/authenticated 後最小 GRANT？ | 是——Supabase default privileges 會自動 GRANT，只寫 GRANT 收不窄（見 DB_MIGRATION_RULES 鐵律 12） | ☐ |

## 使用方式

1. 每次涉及安全面的變更，逐項確認並勾選。
2. 任一項不通過 → 視為高風險，走 `docs/AI_RULES.md` 第 5 節流程。
3. 機器可自動掃的項（4/5/6/2/1）已納入 `scripts/preflight-check.sh`（大小寫不敏感）；人工項仍需人審。
4. `preflight-check.sh` 只能證明「有沒有這些字面紅線」，不能證明權限設計正確——第 6b、7~10 這類語意判斷仍須人工確認。

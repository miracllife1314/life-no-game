# TROUBLESHOOTING — 常見問題排查

> 依症狀找對應排查路徑。涉及高風險修復（DB / 權限 / production）時，
> 仍須走 `docs/AI_RULES.md` 第 5 節流程。

## 1. 登入失敗

1. 確認 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是否正確、對到正確環境。
2. 確認 Auth 設定（redirect URL、允許的網域）。
3. 確認 email / OTP / magic link 寄送設定。
4. 檢查是否誤用 localStorage 假登入（禁止，見 `docs/INCIDENT_PREVENTION.md` #8）。

## 2. 權限錯誤（403 / 無權限）

1. 確認 RLS policy 是否涵蓋該操作（select/insert/update/delete）。
2. 確認 `auth.uid()` 與資料的 `user_id` 是否對得上。
3. 確認角色 / 權限判斷是否在 DB 層（非只前端）。
4. admin 操作是否需走 server-side。

## 3. 查不到資料（明明有資料卻讀不到）

1. 多半是 RLS 擋住（見第 4 項）。
2. 確認查詢條件、過濾狀態是否把資料排除。
3. 確認是否查錯環境（staging / production）。

## 4. RLS 擋住

1. 檢查該表是否有對應動作的 policy。
2. 檢查 policy 條件（`auth.uid()`、角色）是否正確。
3. **不得**為了通過而改成 `using(true)`（見 `docs/SECURITY_CHECKLIST.md`）。
4. 正確解法：補上精確的 policy，或改用 server-side + service_role（僅後端）。

## 5. API 失敗

1. 看 log 分級與錯誤訊息（見 `docs/OBSERVABILITY.md`）。
2. 區分是前端請求錯、後端邏輯錯、還是外部服務錯。
3. 確認 request payload 與型別。
4. 確認是否有未捕捉例外進監控。

## 6. 環境變數錯誤

1. 對照 `.env.example`，確認所有變數都已設定。
2. 確認 server-only 變數沒被 `NEXT_PUBLIC_` 曝光。
3. 確認值對到正確環境（別把 staging key 用到 production）。
4. 改 env 後需重新部署 / 重啟才生效。

## 7. production 與 local 資料不同步

1. 確認是否 schema drift（手動貼 SQL 的已知風險，見 `docs/DB_MIGRATION_RULES.md`）。
2. 比對兩邊 migration 是否都套用。
3. 長期解法：演進到 Supabase CLI migration 流程。

## 8. 前端顯示正常但資料庫沒寫入

1. 檢查是否只更新了前端 state 而沒送 API（見 `docs/AI_RULES.md` 第 7 節禁止繞路）。
2. 檢查 API 是否回成功卻被 RLS 靜默擋下。
3. 檢查是否寫入被交易回滾。
4. 用 DB 直接查驗證，不要只信前端畫面。

## 9. 文件過期導致 AI 判斷錯誤

1. 症狀：AI 依 docs 給的建議與現況不符。
2. 檢查對應 docs 是否在最近變更後未同步。
3. 依 `docs/AI_RULES.md` 第 8 節補更新，並記到 `logs/ai_sync_log.md`。
4. 這類問題屬 `docs/INCIDENT_PREVENTION.md` #12。

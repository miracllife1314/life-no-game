-- =====================================================================
-- 安全強化 階段 0：profiles 關聯 Supabase Auth
--   - 只「加一個可為空的欄位」，不影響任何現有資料與功能。
--   - 冪等：可重複執行不報錯。
--   - 在「測試專案 nlp-game-test」的 SQL Editor 執行。正式區先不要跑。
-- =====================================================================

-- 存放 Supabase Auth 產生的真實使用者 ID（UUID）。
-- ⚠️ 故意「不」設 UNIQUE：同一個人若報名多期，會有多筆 profiles，
--    這些列要綁「同一個」auth_user_id，設 UNIQUE 反而會擋住多期綁定。
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_user_id uuid;

-- 加索引：登入時用 auth_user_id 反查 profile，會更快。
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);

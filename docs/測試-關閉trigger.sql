-- ⚠️ 只在「測試專案」(lwynbnphz...) 的 SQL Editor 執行！不要在正式站跑！
-- 匯入資料前：暫時關閉自動規則，避免匯入時重複加分/重建寵物
alter table public.submissions disable trigger trg_submission_score;
alter table public.profiles     disable trigger trg_create_user_pet;

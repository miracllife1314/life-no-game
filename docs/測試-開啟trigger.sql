-- ⚠️ 只在「測試專案」(lwynbnphz...) 的 SQL Editor 執行！
-- 匯入完成後：把自動規則開回來，讓測試行為跟正式站一致
alter table public.submissions enable trigger trg_submission_score;
alter table public.profiles     enable trigger trg_create_user_pet;

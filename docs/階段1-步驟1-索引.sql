-- =====================================================================
-- 第 1 階段 / 步驟 1：補資料庫索引
-- =====================================================================
-- ⚠️ 只在「測試庫」專案執行（lwynbnphzpmbcawqvycy）。正式庫先不要動。
-- 全部 IF NOT EXISTS（可重複貼、不會重建）。只新增索引，不改表/不改資料。
-- 測試庫用平版 CREATE INDEX（資料量小、鎖極短）；正式庫之後改用 CONCURRENTLY 逐條跑。
-- =====================================================================

-- ---------- 0. 執行前：先看現有索引（記下來，當「前」對照） ----------
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


-- ---------- 1. 必建：主載入熱路徑（.in(student_id) + 本期任務） ----------
CREATE INDEX IF NOT EXISTS idx_submissions_student_id        ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_score_logs_student_id         ON public.score_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_user_pets_student_id          ON public.user_pets(student_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_student_id  ON public.user_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_course_attendance_student_id  ON public.course_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_student_id      ON public.student_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_missions_batch_id             ON public.missions(batch_id);

-- ---------- 2. 應建：次熱（審核/打卡判斷/期數篩選/登入/進化） ----------
CREATE INDEX IF NOT EXISTS idx_submissions_mission_id        ON public.submissions(mission_id);
CREATE INDEX IF NOT EXISTS idx_score_logs_submission_id      ON public.score_logs(submission_id);
CREATE INDEX IF NOT EXISTS idx_profiles_batch_id             ON public.profiles(batch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_team_id              ON public.profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_id           ON public.profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone                ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_teams_batch_id                ON public.teams(batch_id);
CREATE INDEX IF NOT EXISTS idx_missions_template_id          ON public.missions(template_id);
CREATE INDEX IF NOT EXISTS idx_batch_mission_templates_batch ON public.batch_mission_templates(batch_id);


-- ---------- 3. 執行後：確認 16 條索引都建好了（當「後」對照） ----------
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;


-- ---------- 4. 證明索引「可用」（小資料量也能看出來） ----------
-- 4a. 一般 EXPLAIN（小表時 Postgres 可能仍選 Seq Scan，屬正常）
EXPLAIN ANALYZE
SELECT * FROM public.submissions
WHERE student_id IN (SELECT id FROM public.profiles LIMIT 50);

-- 4b. 暫時關掉 Seq Scan，逼 planner 用索引 → 應出現 "Index Scan using idx_submissions_student_id"
--     （只影響本次連線，跑完 RESET 還原，不改任何永久設定）
SET enable_seqscan = off;
EXPLAIN ANALYZE
SELECT * FROM public.submissions
WHERE student_id IN (SELECT id FROM public.profiles LIMIT 50);
RESET enable_seqscan;


-- =====================================================================
-- Rollback（若要移除，逐條 DROP；瞬間完成、無資料風險）：
--   DROP INDEX IF EXISTS public.idx_submissions_student_id;
--   ...（其餘同理）
-- =====================================================================

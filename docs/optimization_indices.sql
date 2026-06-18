-- =====================================================================
-- 資料庫效能索引優化 (Scheme A - Database Indexing)
-- 說明：為所有關鍵的外鍵 (Foreign Keys) 與過濾條件欄位建立索引，
--       避免 Seq Scan (全表掃描) 並提升高頻查詢效能。
-- 適用於：測試開發區 (lwynbnphzpmbcawqvycy) 與正式區 (epolsiukauqfwxmjojia)。
-- 執行方式：請在 Supabase Dashboard 的 SQL Editor 中貼上並執行一次。
-- =====================================================================

-- ---------- 1. 學員名冊表 (profiles) ----------
CREATE INDEX IF NOT EXISTS idx_profiles_batch_id ON public.profiles(batch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);

-- ---------- 2. 打卡證明表 (submissions) ----------
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_mission_id ON public.submissions(mission_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);

-- ---------- 3. 分數調整日誌表 (score_logs) ----------
CREATE INDEX IF NOT EXISTS idx_score_logs_student_id ON public.score_logs(student_id);

-- ---------- 4. 小隊表 (teams) ----------
CREATE INDEX IF NOT EXISTS idx_teams_batch_id ON public.teams(batch_id);
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON public.teams(invite_code);

-- ---------- 5. 學員神獸表 (user_pets) ----------
CREATE INDEX IF NOT EXISTS idx_user_pets_student_id ON public.user_pets(student_id);

-- ---------- 6. 學員成就表 (user_achievements) ----------
CREATE INDEX IF NOT EXISTS idx_user_achievements_student_id ON public.user_achievements(student_id);

-- ---------- 7. 學員出席表 (course_attendance) ----------
CREATE INDEX IF NOT EXISTS idx_course_attendance_student_id ON public.course_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_course_attendance_course_id ON public.course_attendance(course_id);

-- ---------- 8. 小隊長備註表 (student_notes) ----------
CREATE INDEX IF NOT EXISTS idx_student_notes_student_id ON public.student_notes(student_id);

-- ---------- 9. 任務表 (missions / tasks) ----------
CREATE INDEX IF NOT EXISTS idx_missions_batch_id ON public.missions(batch_id);
CREATE INDEX IF NOT EXISTS idx_tasks_batch_id ON public.tasks(batch_id);

-- ---------- 10. 公告與課程表 (announcements / courses) ----------
CREATE INDEX IF NOT EXISTS idx_announcements_batch_id ON public.announcements(batch_id);
CREATE INDEX IF NOT EXISTS idx_courses_batch_id ON public.courses(batch_id);

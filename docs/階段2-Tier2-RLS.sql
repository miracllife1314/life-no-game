-- =====================================================================
-- 第 2 階段 / Tier 2：學員會寫的表上鎖（user_pets / course_attendance）
-- =====================================================================
-- ⚠️ 只在「測試庫」執行（lwynbnphzpmbcawqvycy）。正式庫先不要動。
-- 規則：公開讀；寫入限「管理員 or 該列本人(student_id 屬於登入者)」。
-- 沿用 submissions 既有「學員寫自己」標準寫法。
-- 計分/建寵物 trigger 是 SECURITY DEFINER → 繞過 RLS，不受影響。
-- missions（學員選進化線會寫）屬 Tier 3，本次不鎖。
-- 全部冪等。
-- =====================================================================

-- ========== user_pets（寵物：學員進化會改自己的） ==========
ALTER TABLE public.user_pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "p_user_pets_select" ON public.user_pets;
CREATE POLICY "p_user_pets_select" ON public.user_pets
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "p_user_pets_insert" ON public.user_pets;
CREATE POLICY "p_user_pets_insert" ON public.user_pets
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_pets.student_id AND p.auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "p_user_pets_update" ON public.user_pets;
CREATE POLICY "p_user_pets_update" ON public.user_pets
  FOR UPDATE TO anon, authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_pets.student_id AND p.auth_user_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_pets.student_id AND p.auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "p_user_pets_delete" ON public.user_pets;
CREATE POLICY "p_user_pets_delete" ON public.user_pets
  FOR DELETE TO anon, authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_pets.student_id AND p.auth_user_id = auth.uid())
  );


-- ========== course_attendance（課程報名：學員報名自己的） ==========
ALTER TABLE public.course_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "p_course_att_select" ON public.course_attendance;
CREATE POLICY "p_course_att_select" ON public.course_attendance
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "p_course_att_insert" ON public.course_attendance;
CREATE POLICY "p_course_att_insert" ON public.course_attendance
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = course_attendance.student_id AND p.auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "p_course_att_update" ON public.course_attendance;
CREATE POLICY "p_course_att_update" ON public.course_attendance
  FOR UPDATE TO anon, authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = course_attendance.student_id AND p.auth_user_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = course_attendance.student_id AND p.auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "p_course_att_delete" ON public.course_attendance;
CREATE POLICY "p_course_att_delete" ON public.course_attendance
  FOR DELETE TO anon, authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = course_attendance.student_id AND p.auth_user_id = auth.uid())
  );


-- ---------- 確認結果 ----------
SELECT c.relname AS table_name, c.relrowsecurity AS rls_on, count(p.polname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname='public' AND c.relname IN ('user_pets','course_attendance')
GROUP BY c.relname, c.relrowsecurity ORDER BY c.relname;

-- =====================================================================
-- Rollback：
--   DROP POLICY IF EXISTS "p_user_pets_select"  ON public.user_pets;  (insert/update/delete 同理)
--   ALTER TABLE public.user_pets DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "p_course_att_select" ON public.course_attendance; (...)
--   ALTER TABLE public.course_attendance DISABLE ROW LEVEL SECURITY;
-- =====================================================================

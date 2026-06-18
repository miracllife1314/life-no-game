-- =====================================================================
-- 第 2 階段 / Tier 3：鎖 missions（不改程式版）
-- =====================================================================
-- ⚠️ 只在「測試庫」執行（lwynbnphzpmbcawqvycy）。正式庫先不要動。
-- 策略：公開讀；新增=登入即可（讓「選進化線建任務」照常，不用改程式）；
--       修改/刪除=只有 is_admin()（封住「學員刪光全班任務」破壞性攻擊）；匿名全擋。
-- 殘留：登入學員理論上能 API 偷加一筆假任務（低危、可追蹤、可刪）。要完全封需日後做 RPC。
-- 全部冪等。
-- =====================================================================

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- 讀：公開
DROP POLICY IF EXISTS "p_missions_select" ON public.missions;
CREATE POLICY "p_missions_select" ON public.missions
  FOR SELECT TO anon, authenticated USING (true);

-- 新增：登入即可（進化建任務、後台產生任務都走這）
DROP POLICY IF EXISTS "p_missions_insert" ON public.missions;
CREATE POLICY "p_missions_insert" ON public.missions
  FOR INSERT TO authenticated WITH CHECK (true);

-- 修改：只有管理員
DROP POLICY IF EXISTS "p_missions_update" ON public.missions;
CREATE POLICY "p_missions_update" ON public.missions
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 刪除：只有管理員（封住破壞性刪除）
DROP POLICY IF EXISTS "p_missions_delete" ON public.missions;
CREATE POLICY "p_missions_delete" ON public.missions
  FOR DELETE TO authenticated USING (public.is_admin());

-- ---------- 確認 ----------
SELECT c.relname AS table_name, c.relrowsecurity AS rls_on, count(p.polname) AS policy_count
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_policy p ON p.polrelid=c.oid
WHERE n.nspname='public' AND c.relname='missions'
GROUP BY c.relname, c.relrowsecurity;

-- =====================================================================
-- Rollback：
--   DROP POLICY IF EXISTS "p_missions_select" ON public.missions; (insert/update/delete 同理)
--   ALTER TABLE public.missions DISABLE ROW LEVEL SECURITY;
-- =====================================================================

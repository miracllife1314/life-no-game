-- =====================================================================
-- 第 2 階段 / Tier 1：後台專用表上鎖（公開讀 + 只有 is_admin() 能寫）
-- =====================================================================
-- ⚠️ 只在「測試庫」執行（lwynbnphzpmbcawqvycy）。正式庫先不要動。
-- 這批表「學員本來就不會寫」（只有後台管理員會改），所以上鎖不影響學員任何流程，
-- 只擋住「匿名/惡意學員 F12 亂刪亂改、偽造成就」。
-- 計分/建寵物 trigger 是 SECURITY DEFINER → 繞過 RLS，不受影響。
-- 全部冪等（可重複貼）。
-- =====================================================================

DO $$
DECLARE
  t text;
  -- 16 張後台專用 / 唯讀表
  tables text[] := ARRAY[
    'tasks', 'courses', 'announcements', 'achievements', 'batches',
    'pets', 'cards', 'decks', 'pet_lines', 'pet_stages',
    'mission_templates', 'batch_mission_templates', 'captain_candidates',
    'deck_cards', 'user_decks', 'user_achievements'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- 啟用 RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- 公開讀（任何人都能讀，維持顯示正常）
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', t || '_read', t);

    -- 寫入/修改/刪除：只有後台管理員 (is_admin())
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_write', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
      t || '_admin_write', t
    );
  END LOOP;
END $$;

-- ---------- 確認結果：這 16 張表的 RLS 狀態 + 政策 ----------
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_on,
       count(p.polname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relname IN (
    'tasks','courses','announcements','achievements','batches','pets','cards','decks',
    'pet_lines','pet_stages','mission_templates','batch_mission_templates',
    'captain_candidates','deck_cards','user_decks','user_achievements')
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;

-- =====================================================================
-- Rollback（還原成未鎖）：對每張表
--   DROP POLICY IF EXISTS "<t>_read" ON public.<t>;
--   DROP POLICY IF EXISTS "<t>_admin_write" ON public.<t>;
--   ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;
-- =====================================================================

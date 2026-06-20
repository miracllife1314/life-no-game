-- =====================================================================
-- 17. 以終為始每日抽卡 (Daily Word Draws)
-- =====================================================================
-- 用於存放學員每天「以終為始」抽取的雙字詞彙卡片。
-- 每一位學員 (student_id) 每天或當前僅會保留一筆最新抽取紀錄。
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.daily_draws (
  student_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_word TEXT NOT NULL,
  drawn_date TEXT NOT NULL, -- 格式：YYYY-MM-DD (台灣時區)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 啟用 Row Level Security (RLS)
ALTER TABLE public.daily_draws ENABLE ROW LEVEL SECURITY;

-- 1. 查詢政策：所有人皆可讀取 (便於未來排行榜、隊伍等資訊串接)
DROP POLICY IF EXISTS "p_daily_draws_select" ON public.daily_draws;
CREATE POLICY "p_daily_draws_select" ON public.daily_draws
  FOR SELECT TO anon, authenticated USING (true);

-- 2. 插入政策：限本人或管理員寫入
DROP POLICY IF EXISTS "p_daily_draws_insert" ON public.daily_draws;
CREATE POLICY "p_daily_draws_insert" ON public.daily_draws
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = daily_draws.student_id AND p.auth_user_id = auth.uid())
  );

-- 3. 更新政策：限本人或管理員更新
DROP POLICY IF EXISTS "p_daily_draws_update" ON public.daily_draws;
CREATE POLICY "p_daily_draws_update" ON public.daily_draws
  FOR UPDATE TO anon, authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = daily_draws.student_id AND p.auth_user_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = daily_draws.student_id AND p.auth_user_id = auth.uid())
  );

-- 4. 刪除政策：限本人或管理員刪除
DROP POLICY IF EXISTS "p_daily_draws_delete" ON public.daily_draws;
CREATE POLICY "p_daily_draws_delete" ON public.daily_draws
  FOR DELETE TO anon, authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = daily_draws.student_id AND p.auth_user_id = auth.uid())
  );

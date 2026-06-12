-- =====================================================
-- 修復 submissions 表的 RLS 讓匿名（anon key）也能 INSERT/SELECT
-- 原因：本系統不走 Supabase Auth，auth.uid() 永遠是 null，
--       舊的 policy 要求 student_id = auth.uid() 會全部被擋
-- =====================================================

-- 1. 先清除所有舊的相關 policy（避免重複執行報錯）
DROP POLICY IF EXISTS "學員可新增自己的任務證明" ON public.submissions;
DROP POLICY IF EXISTS "學員可查看自己的任務證明" ON public.submissions;
DROP POLICY IF EXISTS "允許打卡提交" ON public.submissions;
DROP POLICY IF EXISTS "允許查看所有提交" ON public.submissions;

-- 2. 新增允許 anon role 也能 INSERT 的 policy
CREATE POLICY "允許打卡提交" ON public.submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 3. 新增允許 anon role 也能 SELECT 的 policy
CREATE POLICY "允許查看所有提交" ON public.submissions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 說明：此設定適合開發/測試環境或無 Auth 的課程系統。
-- 若未來要加 Auth，請改回 student_id = auth.uid() 的嚴格版本。

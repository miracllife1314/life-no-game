-- =====================================================================
-- S2 安全:submissions 收緊「讀取」——原 p_subs_select 是 using(true),
--   任何人(含匿名/惡意學員 F12)都能下載全班「心得原文 proof_text / 證明圖 / 連結」。
--
-- 做法(比照 profiles 手機那批的「視圖 + 收緊 RLS」):
--   1. 建公開視圖 submissions_public,只含「非隱私」欄位(不含 proof_text/proof_link/
--      proof_image_url)→ 全班可讀,只拿來計數/排行(邀約王者/影響力之神)。
--      視圖預設 security_invoker=off → 以 owner 權限讀、繞過 base RLS,所以計數不受下面收緊影響。
--   2. base table submissions 的 select RLS 收緊為:
--        自己的 + 已上見證牆的(approved 且 分享/自由分享) + 隊長看本隊 + admin 全看。
--      → 別人的「心得原文」再也下載不到。
--
-- 前端配合:services/queries.ts 批次計數改讀 submissions_public 視圖(見該檔 subsPublicBatch);
--   自己的/見證牆的完整心得仍讀 base table(RLS 放行)。
--
-- ⚠️ 兩個 Supabase(NLP + 揚升)各跑一次。is_admin()/is_captain_of() 需已存在(安全-階段2)。冪等。
-- =====================================================================

-- ── 1. 公開視圖:只暴露非隱私欄位(計數/排行用)
create or replace view public.submissions_public as
  select id, mission_id, task_id, student_id, status,
         score_awarded, reviewed_by, reviewed_at, share_to_witness, created_at
    from public.submissions;

grant select on public.submissions_public to anon, authenticated;

-- ── 2. 收緊 base table 的 select 政策
drop policy if exists "p_subs_select" on public.submissions;
create policy "p_subs_select" on public.submissions for select to anon, authenticated
using (
  public.is_admin()
  or public.is_captain_of(student_id)
  or exists (
        select 1 from public.profiles p
         where p.id = submissions.student_id and p.auth_user_id = auth.uid())
  or (status = 'approved' and (share_to_witness = true or mission_id = 'task-custom-post'))
);

-- ── 確認
select policyname, cmd, qual
  from pg_policies
 where schemaname = 'public' and tablename = 'submissions' and policyname = 'p_subs_select';
select table_name from information_schema.views
 where table_schema = 'public' and table_name = 'submissions_public';

-- =====================================================================
-- Rollback:
--   drop view if exists public.submissions_public;
--   drop policy if exists "p_subs_select" on public.submissions;
--   create policy "p_subs_select" on public.submissions for select to anon, authenticated using (true);
-- =====================================================================

-- =====================================================================
-- S4 安全:自助註冊一律只能是 student,不可自封 captain(權限提升)。
--   前端已寫死 role='student'(hooks/useAuth.ts),這裡把 RLS 也收緊,雙保險——
--   就算有人繞前端直接打 PostgREST insert,也只能建 student。
--   隊長身分只能由後台(is_admin)指派。
--
-- 原政策(安全-階段2-通電.sql):
--   with check (public.is_admin() or (role in ('student','captain') and coalesce(score,0)=0))
-- 收緊為只允許 student。
--
-- ⚠️ 兩個 Supabase(NLP + 揚升)各跑一次。冪等。
-- =====================================================================

drop policy if exists "p_profiles_insert" on public.profiles;
create policy "p_profiles_insert" on public.profiles for insert to anon, authenticated
  with check (
    public.is_admin()
    or (role = 'student' and coalesce(score, 0) = 0)
  );

-- 確認
select policyname, cmd, with_check
  from pg_policies
 where schemaname = 'public' and tablename = 'profiles' and policyname = 'p_profiles_insert';

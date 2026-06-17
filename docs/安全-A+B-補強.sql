-- =====================================================================
-- 安全補強 A + B（測試庫 nlp-game-test）
--   A：再鎖兩張高價值表
--       · student_notes（隱私）→ 只有管理員/該隊隊長可讀寫；學員完全無權。
--       · teams（完整性）→ 大家可讀；改設定限「該隊隊長或管理員」、新增/刪除限管理員。
--   B：登入速率限制用表 login_attempts（防暴力猜 姓名+電話）。
--
--   冪等。正式區先不要跑。
-- =====================================================================

-- ---------- 共用：判斷「目前登入者是不是某隊的隊長」----------
create or replace function public.is_captain_of_team(p_team_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid() and role = 'captain' and team_id = p_team_id
  );
$$;

-- ---------- A1. student_notes：管理員/該隊隊長 才可讀寫 ----------
do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='student_notes'
  loop execute format('drop policy if exists %I on public.student_notes', r.policyname); end loop;
end $$;

create policy "p_notes_all" on public.student_notes
  for all to anon, authenticated
  using      (public.is_admin() or public.is_captain_of(student_id))
  with check (public.is_admin() or public.is_captain_of(student_id));

alter table public.student_notes enable row level security;

-- ---------- A2. teams：可讀；改設定限隊長/管理員；新增刪除限管理員 ----------
do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='teams'
  loop execute format('drop policy if exists %I on public.teams', r.policyname); end loop;
end $$;

create policy "p_teams_select" on public.teams
  for select to anon, authenticated using (true);

create policy "p_teams_update" on public.teams
  for update to anon, authenticated
  using      (public.is_admin() or public.is_captain_of_team(id))
  with check (public.is_admin() or public.is_captain_of_team(id));

create policy "p_teams_insert" on public.teams
  for insert to anon, authenticated with check (public.is_admin());

create policy "p_teams_delete" on public.teams
  for delete to anon, authenticated using (public.is_admin());

alter table public.teams enable row level security;

-- ---------- B. 登入速率限制用表 ----------
create table if not exists public.login_attempts (
  id         bigserial primary key,
  ip         text,
  phone      text,
  created_at timestamptz default now()
);
create index if not exists idx_login_attempts_phone ON public.login_attempts(phone, created_at);
create index if not exists idx_login_attempts_ip    ON public.login_attempts(ip, created_at);

-- 鎖死：啟用 RLS 但「不給任何政策」→ anon/authenticated 完全碰不到；
-- 只有後端 service role（繞過 RLS）能寫/讀。
alter table public.login_attempts enable row level security;

-- =====================================================================
-- 跑完後：
--   · student_notes 對學員/匿名變成「讀不到也寫不了」（隱私）。
--   · teams 匿名不能改邀請碼/隊長；隊長只能改自己隊。
--   · login_attempts 就緒，等前端路由接上速率限制（程式那邊我改）。
-- =====================================================================

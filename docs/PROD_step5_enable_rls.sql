-- =====================================================================
-- 正式區 階段3-最後一步：安全主體 + 開 RLS（上鎖）
--   前置已完成：auth_user_id 欄位、login_attempts 表（第3步）、新程式已部署。
--   本檔：輔助函式 + 欄位保護 trigger(INVOKER) + adjust_score 守門
--         + 嚴格 RLS 政策 + 對 5 張表啟用 RLS。
--   冪等。在「正式專案 nlp-game」SQL Editor 執行。
-- =====================================================================

-- 1. 輔助函式
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where auth_user_id = auth.uid() and role = 'admin'); $$;
create or replace function public.is_captain_of(p_student_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles me join public.profiles stu on stu.id = p_student_id
    where me.auth_user_id = auth.uid() and me.role = 'captain' and me.team_id is not null and me.team_id = stu.team_id); $$;
create or replace function public.is_captain_of_team(p_team_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where auth_user_id = auth.uid() and role = 'captain' and team_id = p_team_id); $$;

-- 2. 欄位保護 trigger（SECURITY INVOKER —— 關鍵：不可 definer）
create or replace function public._guard_profiles_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if current_user in ('anon','authenticated') then
    if  new.score is distinct from old.score or new.role is distinct from old.role
     or new.auth_user_id is distinct from old.auth_user_id or new.batch_id is distinct from old.batch_id
     or new.team_id is distinct from old.team_id or new.status is distinct from old.status
     or new.captain_id is distinct from old.captain_id then
      raise exception '[安全] 無權變更敏感欄位（分數/角色/隊別/狀態）。'; end if;
  end if; return new; end; $$;
drop trigger if exists trg_guard_profiles_update on public.profiles;
create trigger trg_guard_profiles_update before update on public.profiles for each row execute function public._guard_profiles_update();

create or replace function public._sanitize_submission_insert()
returns trigger language plpgsql set search_path = public as $$
declare v_req boolean; v_pts integer; v_maxc integer; v_cnt integer; v_found boolean := false;
begin
  if public.is_admin() or public.is_captain_of(new.student_id) then return new; end if;
  if current_user not in ('anon','authenticated') then return new; end if;
  if not exists (select 1 from public.profiles p where p.id = new.student_id and p.auth_user_id = auth.uid()) then
    raise exception '[安全] 只能為自己建立打卡紀錄。'; end if;
  select t.requires_approval, t.score, coalesce(t.max_completions,1) into v_req, v_pts, v_maxc from public.tasks t where t.id = new.mission_id;
  if found then v_found := true; end if;
  if not v_found then
    select (m.review_type <> 'auto'), m.points, coalesce(m.max_completions,1) into v_req, v_pts, v_maxc from public.missions m where m.id = new.mission_id;
    if found then v_found := true; end if; end if;
  if not v_found then raise exception '[安全] 無效的任務 ID。'; end if;
  if v_maxc > 0 and new.mission_id <> 'task-custom-post' then
    select count(*) into v_cnt from public.submissions s where s.mission_id = new.mission_id and s.student_id = new.student_id and s.status <> 'rejected';
    if v_cnt >= v_maxc then raise exception '[安全] 此任務已達可完成次數。'; end if; end if;
  new.status := case when v_req then 'pending' else 'approved' end;
  new.score_awarded := case when v_req then 0 else v_pts end;
  new.reviewed_by := null; new.reviewed_at := case when v_req then null else now() end;
  return new; end; $$;
drop trigger if exists trg_sanitize_submission_insert on public.submissions;
create trigger trg_sanitize_submission_insert before insert on public.submissions for each row execute function public._sanitize_submission_insert();

create or replace function public._guard_submission_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_admin() or public.is_captain_of(new.student_id) then return new; end if;
  if current_user in ('anon','authenticated') then
    if  new.status is distinct from old.status or new.score_awarded is distinct from old.score_awarded
     or new.student_id is distinct from old.student_id or new.mission_id is distinct from old.mission_id
     or new.reviewed_by is distinct from old.reviewed_by then
      raise exception '[安全] 無權變更打卡的審核狀態或分數。'; end if;
  end if; return new; end; $$;
drop trigger if exists trg_guard_submission_update on public.submissions;
create trigger trg_guard_submission_update before update on public.submissions for each row execute function public._guard_submission_update();

-- 3. adjust_score 守門
create or replace function public.adjust_score(
  p_student_id text, p_amount integer, p_reason text default '手動調整', p_submission_id text default null, p_created_by text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or public.is_captain_of(p_student_id)) then
    raise exception '[安全] 僅管理員或該隊隊長可調整分數。'; end if;
  perform public._apply_score_delta(p_student_id, p_amount, p_reason, p_submission_id, p_created_by);
end; $$;
grant execute on function public.adjust_score(text, integer, text, text, text) to anon, authenticated;

-- 4. 清掉這 5 張表的所有舊政策，重建嚴格政策
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname='public'
    and tablename in ('profiles','submissions','score_logs','student_notes','teams')
  loop execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename); end loop;
end $$;

create policy "p_profiles_select" on public.profiles for select to anon, authenticated using (true);
create policy "p_profiles_update" on public.profiles for update to anon, authenticated
  using (public.is_admin() or auth.uid() = auth_user_id or public.is_captain_of(id))
  with check (public.is_admin() or auth.uid() = auth_user_id or public.is_captain_of(id));
create policy "p_profiles_insert" on public.profiles for insert to anon, authenticated
  with check (public.is_admin() or (role in ('student','captain') and coalesce(score,0) = 0));
create policy "p_profiles_delete" on public.profiles for delete to anon, authenticated using (public.is_admin());

create policy "p_subs_select" on public.submissions for select to anon, authenticated using (true);
create policy "p_subs_insert" on public.submissions for insert to anon, authenticated
  with check (public.is_admin() or public.is_captain_of(student_id)
    or exists (select 1 from public.profiles p where p.id = submissions.student_id and p.auth_user_id = auth.uid()));
create policy "p_subs_update" on public.submissions for update to anon, authenticated
  using (public.is_admin() or public.is_captain_of(student_id)
    or exists (select 1 from public.profiles p where p.id = submissions.student_id and p.auth_user_id = auth.uid()))
  with check (public.is_admin() or public.is_captain_of(student_id)
    or exists (select 1 from public.profiles p where p.id = submissions.student_id and p.auth_user_id = auth.uid()));
create policy "p_subs_delete" on public.submissions for delete to anon, authenticated
  using (public.is_admin() or public.is_captain_of(student_id)
    or exists (select 1 from public.profiles p where p.id = submissions.student_id and p.auth_user_id = auth.uid()));

create policy "p_scorelogs_select" on public.score_logs for select to anon, authenticated
  using (public.is_admin() or public.is_captain_of(student_id)
    or exists (select 1 from public.profiles p where p.id = score_logs.student_id and p.auth_user_id = auth.uid()));

create policy "p_notes_all" on public.student_notes for all to anon, authenticated
  using (public.is_admin() or public.is_captain_of(student_id))
  with check (public.is_admin() or public.is_captain_of(student_id));

create policy "p_teams_select" on public.teams for select to anon, authenticated using (true);
create policy "p_teams_update" on public.teams for update to anon, authenticated
  using (public.is_admin() or public.is_captain_of_team(id))
  with check (public.is_admin() or public.is_captain_of_team(id));
create policy "p_teams_insert" on public.teams for insert to anon, authenticated with check (public.is_admin());
create policy "p_teams_delete" on public.teams for delete to anon, authenticated using (public.is_admin());

-- 5. 上鎖：對 5 張表啟用 RLS
alter table public.profiles    enable row level security;
alter table public.submissions enable row level security;
alter table public.score_logs  enable row level security;
alter table public.student_notes enable row level security;
alter table public.teams       enable row level security;

-- =====================================================================
-- 緊急回退（出事一鍵貼這段）：
-- alter table public.profiles disable row level security;
-- alter table public.submissions disable row level security;
-- alter table public.score_logs disable row level security;
-- alter table public.student_notes disable row level security;
-- alter table public.teams disable row level security;
-- drop trigger if exists trg_guard_profiles_update on public.profiles;
-- drop trigger if exists trg_sanitize_submission_insert on public.submissions;
-- drop trigger if exists trg_guard_submission_update on public.submissions;
-- =====================================================================

-- =====================================================================
-- 安全復原：清除 p0_security_setup.sql 的影響，並完整重鎖我們的安全架構
--
--   背景：誤跑了 p0_security_setup.sql，它用「只給 anon」的政策 + current_user='anon'
--         的 trigger + REVOKE adjust_score，造成：登入學員讀不到資料、保護有漏洞、
--         大隊長不能調分。本檔把它清掉並復原我們驗收過的正確狀態。
--
--   冪等：可重複執行。在 nlp-game-test SQL Editor 執行。正式區不要跑。
-- =====================================================================

-- ====================== 第一部分：清除 p0 的影響 ======================

-- 1a. 還原 adjust_score 執行權（p0 REVOKE 了它；我們的 adjust_score 內部有 is_admin 守門）
GRANT EXECUTE ON FUNCTION public.adjust_score(text, integer, text, text, text) TO anon, authenticated;

-- 1b. 移除 p0 建立的 trigger（用 current_user='anon'，對 authenticated 無效，且與我們重複）
DROP TRIGGER IF EXISTS check_profile_direct_fields ON public.profiles;
DROP TRIGGER IF EXISTS enforce_submission_rules ON public.submissions;
DROP TRIGGER IF EXISTS enforce_submission_update_rules ON public.submissions;

-- 1c. 把 p0 動過的所有表「關閉 RLS、清掉 anon_* 政策」，回到乾淨起點。
--     （之後第二部分只會把我們要鎖的 5 張表重新鎖回去；其餘維持原本開放讀寫。）
DO $$
DECLARE t text; tbls text[] := ARRAY[
  'profiles','teams','batches','tasks','mission_templates',
  'batch_mission_templates','missions','submissions','score_logs',
  'courses','course_attendance','achievements','user_achievements',
  'announcements','student_notes','captain_candidates','pets','user_pets',
  'pet_lines','pet_stages','pet_evolution_logs','cards','decks',
  'deck_cards','user_decks','squad_roles','witness_likes','witness_comments'
];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "anon_select" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "anon_insert" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "anon_update" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "anon_delete" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "allow_all_anon" ON public.%I', t);
    EXCEPTION WHEN undefined_table THEN NULL;  -- 表不存在就跳過
    END;
  END LOOP;
END $$;

-- ====================== 第二部分：完整復原我們的安全 ==================

-- 2a. 輔助函式
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where auth_user_id = auth.uid() and role = 'admin');
$$;
create or replace function public.is_captain_of(p_student_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles me join public.profiles stu on stu.id = p_student_id
    where me.auth_user_id = auth.uid() and me.role = 'captain' and me.team_id is not null and me.team_id = stu.team_id);
$$;
create or replace function public.is_captain_of_team(p_team_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where auth_user_id = auth.uid() and role = 'captain' and team_id = p_team_id);
$$;

-- 2b. 我們的欄位保護 trigger（SECURITY INVOKER —— 關鍵：不可 definer）
create or replace function public._guard_profiles_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if current_user in ('anon','authenticated') then
    if  new.score is distinct from old.score or new.role is distinct from old.role
     or new.auth_user_id is distinct from old.auth_user_id or new.batch_id is distinct from old.batch_id
     or new.team_id is distinct from old.team_id or new.status is distinct from old.status
     or new.captain_id is distinct from old.captain_id then
      raise exception '[安全] 無權變更敏感欄位（分數/角色/隊別/狀態）。';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_profiles_update on public.profiles;
create trigger trg_guard_profiles_update before update on public.profiles
  for each row execute function public._guard_profiles_update();

create or replace function public._sanitize_submission_insert()
returns trigger language plpgsql set search_path = public as $$
declare v_req boolean; v_pts integer; v_maxc integer; v_cnt integer; v_found boolean := false;
begin
  if public.is_admin() or public.is_captain_of(new.student_id) then return new; end if;
  if current_user not in ('anon','authenticated') then return new; end if;
  if not exists (select 1 from public.profiles p where p.id = new.student_id and p.auth_user_id = auth.uid()) then
    raise exception '[安全] 只能為自己建立打卡紀錄。';
  end if;
  select t.requires_approval, t.score, coalesce(t.max_completions,1) into v_req, v_pts, v_maxc
    from public.tasks t where t.id = new.mission_id;
  if found then v_found := true; end if;
  if not v_found then
    select (m.review_type <> 'auto'), m.points, coalesce(m.max_completions,1) into v_req, v_pts, v_maxc
      from public.missions m where m.id = new.mission_id;
    if found then v_found := true; end if;
  end if;
  if not v_found then raise exception '[安全] 無效的任務 ID。'; end if;
  if v_maxc > 0 and new.mission_id <> 'task-custom-post' then
    select count(*) into v_cnt from public.submissions s
      where s.mission_id = new.mission_id and s.student_id = new.student_id and s.status <> 'rejected';
    if v_cnt >= v_maxc then raise exception '[安全] 此任務已達可完成次數。'; end if;
  end if;
  new.status := case when v_req then 'pending' else 'approved' end;
  new.score_awarded := case when v_req then 0 else v_pts end;
  new.reviewed_by := null;
  new.reviewed_at := case when v_req then null else now() end;
  return new;
end; $$;
drop trigger if exists trg_sanitize_submission_insert on public.submissions;
create trigger trg_sanitize_submission_insert before insert on public.submissions
  for each row execute function public._sanitize_submission_insert();

create or replace function public._guard_submission_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_admin() or public.is_captain_of(new.student_id) then return new; end if;
  if current_user in ('anon','authenticated') then
    if  new.status is distinct from old.status or new.score_awarded is distinct from old.score_awarded
     or new.student_id is distinct from old.student_id or new.mission_id is distinct from old.mission_id
     or new.reviewed_by is distinct from old.reviewed_by then
      raise exception '[安全] 無權變更打卡的審核狀態或分數。';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_submission_update on public.submissions;
create trigger trg_guard_submission_update before update on public.submissions
  for each row execute function public._guard_submission_update();

-- 2c. adjust_score 守門
create or replace function public.adjust_score(
  p_student_id text, p_amount integer, p_reason text default '手動調整',
  p_submission_id text default null, p_created_by text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or public.is_captain_of(p_student_id)) then
    raise exception '[安全] 僅管理員或該隊隊長可調整分數。';
  end if;
  perform public._apply_score_delta(p_student_id, p_amount, p_reason, p_submission_id, p_created_by);
end; $$;

-- 2d. 清掉這 5 張表的所有政策，重建嚴格政策
DO $$ DECLARE r record; BEGIN
  FOR r IN select policyname, tablename from pg_policies where schemaname='public'
    and tablename in ('profiles','submissions','score_logs','student_notes','teams')
  LOOP EXECUTE format('drop policy if exists %I on public.%I', r.policyname, r.tablename); END LOOP;
END $$;

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

-- 2e. 只對這 5 張表啟用 RLS
alter table public.profiles    enable row level security;
alter table public.submissions enable row level security;
alter table public.score_logs  enable row level security;
alter table public.student_notes enable row level security;
alter table public.teams       enable row level security;

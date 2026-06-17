-- =====================================================================
-- 安全強化 階段 2：通電（最終整合版，可一次重現）
--
--   內容：欄位保護 trigger（INVOKER）+ 防偽打卡 + adjust_score 守門
--         + 清除舊政策 + 重建嚴格 RLS 政策 + 啟用 RLS。
--
--   設計重點（踩過的雷，務必保留）：
--     1. 三個 trigger 函式必須 SECURITY INVOKER（不可 definer）——
--        definer 會讓 current_user 變成 owner(postgres)，導致 current_user 判斷失效。
--     2. RLS 政策是 PERMISSIVE(OR 疊加)：必須先清掉舊的「全開」政策，否則門沒鎖。
--     3. 真實計分走 SECURITY DEFINER 計分 trigger（繞過 RLS / current_user=postgres 自動放行）。
--
--   冪等：可重複執行。在 nlp-game-test SQL Editor 執行。正式區另行擇期。
--   ⚠️ 緊急回退見檔尾 ROLLBACK。
-- =====================================================================

-- ---------- A. profiles 欄位保護（INVOKER）----------
create or replace function public._guard_profiles_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if current_user in ('anon','authenticated') then
    if  new.score        is distinct from old.score
     or new.role         is distinct from old.role
     or new.auth_user_id is distinct from old.auth_user_id
     or new.batch_id     is distinct from old.batch_id
     or new.team_id      is distinct from old.team_id
     or new.status       is distinct from old.status
     or new.captain_id   is distinct from old.captain_id then
      raise exception '[安全] 無權變更敏感欄位（分數/角色/隊別/狀態）。';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_profiles_update on public.profiles;
create trigger trg_guard_profiles_update before update on public.profiles
  for each row execute function public._guard_profiles_update();

-- ---------- B. submissions 防偽打卡（INSERT，INVOKER）----------
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
  new.status        := case when v_req then 'pending' else 'approved' end;
  new.score_awarded := case when v_req then 0 else v_pts end;
  new.reviewed_by   := null;
  new.reviewed_at   := case when v_req then null else now() end;
  return new;
end; $$;
drop trigger if exists trg_sanitize_submission_insert on public.submissions;
create trigger trg_sanitize_submission_insert before insert on public.submissions
  for each row execute function public._sanitize_submission_insert();

-- ---------- C. submissions 欄位保護（UPDATE，INVOKER）----------
create or replace function public._guard_submission_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_admin() or public.is_captain_of(new.student_id) then return new; end if;
  if current_user in ('anon','authenticated') then
    if  new.status        is distinct from old.status
     or new.score_awarded is distinct from old.score_awarded
     or new.student_id    is distinct from old.student_id
     or new.mission_id    is distinct from old.mission_id
     or new.reviewed_by   is distinct from old.reviewed_by then
      raise exception '[安全] 無權變更打卡的審核狀態或分數。';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_submission_update on public.submissions;
create trigger trg_guard_submission_update before update on public.submissions
  for each row execute function public._guard_submission_update();

-- ---------- D. adjust_score 守門（僅管理員/該隊隊長）----------
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

-- ---------- E. 清掉 3 張表所有舊政策（避免 OR 疊加全開）----------
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
    where schemaname='public' and tablename in ('profiles','submissions','score_logs')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ---------- F. 重建嚴格 RLS 政策 ----------
create policy "p_profiles_select" on public.profiles for select to anon, authenticated using (true);
create policy "p_profiles_update" on public.profiles for update to anon, authenticated
  using      (public.is_admin() or auth.uid() = auth_user_id or public.is_captain_of(id))
  with check (public.is_admin() or auth.uid() = auth_user_id or public.is_captain_of(id));
create policy "p_profiles_insert" on public.profiles for insert to anon, authenticated
  with check (public.is_admin() or (role in ('student','captain') and coalesce(score,0) = 0));
create policy "p_profiles_delete" on public.profiles for delete to anon, authenticated
  using (public.is_admin());

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

-- ---------- G. 通電：啟用 RLS ----------
alter table public.profiles    enable row level security;
alter table public.submissions enable row level security;
alter table public.score_logs  enable row level security;

-- =====================================================================
-- 驗收（測試庫實測通過）：F12 攻擊 6/6 被擋；功能 7/7 正常
--   （學員打卡加分 / 偽造打卡被消毒 / 改分被擋 / 讀排行榜見證牆 /
--     大隊長調分 / 大隊長改資料 / 隊長審核加分）。
--
-- =========================== ROLLBACK（緊急回退）======================
-- alter table public.profiles    disable row level security;
-- alter table public.submissions disable row level security;
-- alter table public.score_logs  disable row level security;
-- drop trigger if exists trg_guard_profiles_update      on public.profiles;
-- drop trigger if exists trg_sanitize_submission_insert on public.submissions;
-- drop trigger if exists trg_guard_submission_update    on public.submissions;
-- =====================================================================

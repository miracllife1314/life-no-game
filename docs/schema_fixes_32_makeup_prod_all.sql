-- =====================================================================
-- 連勝防禦(補打卡)—— 正式庫「一次設定」最終版(整合 28/30/31,不含已停用的 reward_shields)。
-- 冪等、可重複執行。正式庫貼這一份即可。
-- =====================================================================

-- 1. 補打卡次數(每期 5;沿用 streak_shields 欄=剩餘次數)
alter table public.profiles add column if not exists streak_shields int not null default 5;
alter table public.profiles alter column streak_shields set default 5;
update public.profiles set streak_shields = 5;

-- 2. 任務可設為「補打卡任務」
alter table public.tasks add column if not exists is_makeup boolean not null default false;

-- 3. 補回的日子
create table if not exists public.streak_shield_days (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  covered_date date not null,
  created_at timestamptz not null default now(),
  unique (student_id, covered_date)
);
alter table public.streak_shield_days enable row level security;
drop policy if exists "shield_days_select" on public.streak_shield_days;
create policy "shield_days_select" on public.streak_shield_days
  for select to anon, authenticated using (true);
create index if not exists idx_shield_days_student on public.streak_shield_days(student_id);

-- 4. 補打卡任務審核通過 → 補回「最近缺的一天」+ 次數-1(一天限一次)
create or replace function public._grant_shield_on_approve()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_is_makeup boolean; v_becoming_approved boolean;
  v_remaining int; v_restore date; v_today date;
begin
  v_becoming_approved := (new.status = 'approved')
    and (tg_op = 'INSERT' or old.status is distinct from 'approved');
  if not v_becoming_approved then return new; end if;
  select coalesce(t.is_makeup, false) into v_is_makeup from public.tasks t where t.id = new.mission_id;
  if not coalesce(v_is_makeup, false) then return new; end if;
  perform pg_advisory_xact_lock(hashtext('makeup:' || new.student_id));
  select streak_shields into v_remaining from public.profiles where id = new.student_id;
  if coalesce(v_remaining,0) <= 0 then return new; end if;
  v_today := (now() at time zone 'Asia/Taipei')::date;
  if exists (select 1 from public.streak_shield_days
     where student_id = new.student_id
       and (created_at at time zone 'Asia/Taipei')::date = v_today) then
    return new;   -- 今天已補過
  end if;
  with active_days as (
    select distinct (m.publish_at at time zone 'Asia/Taipei')::date as d
      from public.submissions s join public.missions m on s.mission_id = m.id
     where s.student_id = new.student_id and s.status <> 'rejected' and m.mission_type = 'daily'
    union
    select covered_date from public.streak_shield_days where student_id = new.student_id
  ),
  candidates as (
    select gs::date as d from generate_series(v_today - 30, v_today - 1, interval '1 day') gs
  )
  select max(c.d) into v_restore from candidates c
   where c.d not in (select d from active_days) and (c.d - 1) in (select d from active_days);
  if v_restore is not null then
    insert into public.streak_shield_days(student_id, covered_date)
      values (new.student_id, v_restore) on conflict (student_id, covered_date) do nothing;
    update public.profiles set streak_shields = greatest(0, streak_shields - 1) where id = new.student_id;
  end if;
  return new;
end; $$;
drop trigger if exists trg_grant_shield_on_approve on public.submissions;
create trigger trg_grant_shield_on_approve after insert or update on public.submissions
  for each row execute function public._grant_shield_on_approve();

-- 5. 連勝里程碑加分:把補回的日子也算進去
create or replace function public.claim_streak_bonus(p_student_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_streak integer := 0; v_threshold integer; v_bonus integer; v_reason text;
  v_awarded jsonb := '[]'::jsonb;
  v_milestones integer[][] := array[ array[3,100], array[7,200], array[14,500], array[21,800], array[30,1000] ];
  i integer;
begin
  if p_student_id is null then return jsonb_build_object('streak', 0, 'awarded', v_awarded); end if;
  perform pg_advisory_xact_lock(hashtext(p_student_id));
  with dates as (
    select distinct (m.publish_at at time zone 'Asia/Taipei')::date as d
      from public.submissions s join public.missions m on s.mission_id = m.id
     where s.student_id = p_student_id and s.status <> 'rejected' and m.mission_type = 'daily'
    union
    select covered_date from public.streak_shield_days where student_id = p_student_id
  ),
  ordered_dates as (select d, d - (row_number() over (order by d))::integer as grp from dates),
  streaks as (select grp, count(*) as streak_length, max(d) as max_d from ordered_dates group by grp)
  select coalesce(max(streak_length), 0) into v_streak from streaks
   where max_d >= (now() at time zone 'Asia/Taipei')::date - 1;
  for i in 1 .. array_length(v_milestones, 1) loop
    v_threshold := v_milestones[i][1]; v_bonus := v_milestones[i][2];
    if v_streak >= v_threshold then
      v_reason := '🔥 連勝 ' || v_threshold || ' 天里程碑獎勵';
      if not exists (select 1 from public.score_logs where student_id = p_student_id and reason = v_reason) then
        perform public._apply_score_delta(p_student_id, v_bonus, v_reason, null, 'system');
        v_awarded := v_awarded || jsonb_build_object('threshold', v_threshold, 'bonus', v_bonus);
      end if;
    end if;
  end loop;
  return jsonb_build_object('streak', v_streak, 'awarded', v_awarded);
end; $$;
grant execute on function public.claim_streak_bonus(text) to anon, authenticated;

-- 6. 學員視圖補上 streak_shields
create or replace view public.v_public_profiles as
  select id, name, role, team_id, batch_id, score, active_pet_id,
         captain_id, division_name, director_id, status, created_at,
         profile_id, squad_role, streak_shields
  from public.profiles;
grant select on public.v_public_profiles to anon, authenticated;

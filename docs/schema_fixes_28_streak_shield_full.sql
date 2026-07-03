-- =====================================================================
-- 連勝護盾(補打卡卡)完整版 —— 含「賺取」機制。可重複執行、自我完整。
--   規則:上限 3 張,學員從 0 開始;完成「有設獎勵護盾」的任務才獲得。
--   漏打一天且前一天有 → 自動用 1 張補上,連勝不斷(只補單天)。
-- ⚠️ 測試庫 + 正式庫都各跑一次(取代先前 schema_fixes_27)。
-- =====================================================================

-- 1. 護盾庫存:預設 0(要靠任務賺)。並把預設改成 0、既有值歸零(新制公平重置)。
alter table public.profiles add column if not exists streak_shields int not null default 0;
alter table public.profiles alter column streak_shields set default 0;
update public.profiles set streak_shields = 0;

-- 2. 任務可設「完成獎勵護盾 N 張」(單次任務 tasks 與 期數任務 missions 皆可)
alter table public.tasks    add column if not exists reward_shields int not null default 0;
alter table public.missions add column if not exists reward_shields int not null default 0;

-- 3. 護盾補日表
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

-- 4. 賺護盾:獨立 trigger(不動既有計分 trigger)。提交「變成 approved」時,
--    若該任務/單次任務設了 reward_shields → 發護盾(上限 3、不倒扣)。
create or replace function public._grant_shield_on_approve()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_reward int; v_becoming_approved boolean;
begin
  v_becoming_approved := (new.status = 'approved')
    and (tg_op = 'INSERT' or old.status is distinct from 'approved');
  if not v_becoming_approved then return new; end if;
  select coalesce(t.reward_shields, m.reward_shields, 0) into v_reward
    from (select 1) x
    left join public.tasks    t on t.id = new.mission_id
    left join public.missions m on m.id = new.mission_id;
  if coalesce(v_reward,0) > 0 then
    update public.profiles
       set streak_shields = least(3, coalesce(streak_shields,0) + v_reward)
     where id = new.student_id;
  end if;
  return new;
end; $$;
drop trigger if exists trg_grant_shield_on_approve on public.submissions;
create trigger trg_grant_shield_on_approve after insert or update on public.submissions
  for each row execute function public._grant_shield_on_approve();

-- 5. 自動用護盾補昨天(每日打卡後由前端呼叫)
create or replace function public.use_streak_shield_if_needed(p_student_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_today date; v_remaining int;
  v_has_today boolean; v_has_yest boolean; v_has_daybefore boolean;
begin
  if p_student_id is null then return jsonb_build_object('used', false); end if;
  perform pg_advisory_xact_lock(hashtext('shield:' || p_student_id));
  v_today := (now() at time zone 'Asia/Taipei')::date;
  with active_days as (
    select distinct (m.publish_at at time zone 'Asia/Taipei')::date as d
      from public.submissions s join public.missions m on s.mission_id = m.id
     where s.student_id = p_student_id and s.status <> 'rejected' and m.mission_type = 'daily'
    union
    select covered_date from public.streak_shield_days where student_id = p_student_id
  )
  select bool_or(d = v_today), bool_or(d = v_today - 1), bool_or(d = v_today - 2)
    into v_has_today, v_has_yest, v_has_daybefore from active_days;
  if coalesce(v_has_today,false) and not coalesce(v_has_yest,false) and coalesce(v_has_daybefore,false) then
    select streak_shields into v_remaining from public.profiles where id = p_student_id;
    if coalesce(v_remaining,0) > 0 then
      insert into public.streak_shield_days(student_id, covered_date)
        values (p_student_id, v_today - 1) on conflict (student_id, covered_date) do nothing;
      update public.profiles set streak_shields = streak_shields - 1 where id = p_student_id;
      return jsonb_build_object('used', true, 'covered_date', (v_today - 1)::text, 'remaining', v_remaining - 1);
    end if;
  end if;
  return jsonb_build_object('used', false,
    'remaining', coalesce((select streak_shields from public.profiles where id = p_student_id), 0));
end; $$;
grant execute on function public.use_streak_shield_if_needed(text) to anon, authenticated;

-- 6. 連勝里程碑加分:把護盾補日也算進去
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

-- 7. 學員讀的視圖補上 streak_shields
create or replace view public.v_public_profiles as
  select id, name, role, team_id, batch_id, score, active_pet_id,
         captain_id, division_name, director_id, status, created_at,
         profile_id, squad_role, streak_shields
  from public.profiles;
grant select on public.v_public_profiles to anon, authenticated;

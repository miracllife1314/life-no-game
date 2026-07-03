-- =====================================================================
-- 新功能:連勝護盾(補簽卡)
--   每位學員每期預設 2 張護盾。當「今天有打卡、昨天漏了、前天有打卡(連勝存在)」時,
--   自動用 1 張護盾補上昨天 → 連勝不中斷。只補單天漏打(連漏兩天仍會斷)。
-- 冪等:可重複執行。⚠️ 測試庫 + 正式庫都要各跑一次。
-- =====================================================================

-- 1. 護盾庫存(每位學員剩幾張)。預設 2;大隊長可在後台調整。
alter table public.profiles
  add column if not exists streak_shields int not null default 2;

-- 2. 護盾已補的日期(讓連勝計算把這天也算成「有打卡」)
create table if not exists public.streak_shield_days (
  id           uuid primary key default gen_random_uuid(),
  student_id   text not null,
  covered_date date not null,
  created_at   timestamptz not null default now(),
  unique (student_id, covered_date)
);
alter table public.streak_shield_days enable row level security;
-- 讀:比照 submissions(非敏感,前端連勝計算要用);寫:只能經下方 SECURITY DEFINER 函式。
drop policy if exists "shield_days_select" on public.streak_shield_days;
create policy "shield_days_select" on public.streak_shield_days
  for select to anon, authenticated using (true);
create index if not exists idx_shield_days_student on public.streak_shield_days(student_id);

-- 3. 自動判斷「要不要用一張護盾補昨天」。學員每次完成每日定課後由前端呼叫。
create or replace function public.use_streak_shield_if_needed(p_student_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_today date; v_remaining int;
  v_has_today boolean; v_has_yest boolean; v_has_daybefore boolean;
begin
  if p_student_id is null then return jsonb_build_object('used', false); end if;
  perform pg_advisory_xact_lock(hashtext('shield:' || p_student_id));   -- 防並發重複扣

  v_today := (now() at time zone 'Asia/Taipei')::date;

  -- 有效定課日 = 每日任務提交(非退回)的台灣日期 ∪ 已補護盾日
  with active_days as (
    select distinct (m.publish_at at time zone 'Asia/Taipei')::date as d
      from public.submissions s join public.missions m on s.mission_id = m.id
     where s.student_id = p_student_id and s.status <> 'rejected' and m.mission_type = 'daily'
    union
    select covered_date from public.streak_shield_days where student_id = p_student_id
  )
  select bool_or(d = v_today), bool_or(d = v_today - 1), bool_or(d = v_today - 2)
    into v_has_today, v_has_yest, v_has_daybefore
    from active_days;

  -- 條件:今天有打卡 + 昨天沒有 + 前天有(連勝存在) → 用一張護盾補昨天
  if coalesce(v_has_today,false) and not coalesce(v_has_yest,false) and coalesce(v_has_daybefore,false) then
    select streak_shields into v_remaining from public.profiles where id = p_student_id;
    if coalesce(v_remaining,0) > 0 then
      insert into public.streak_shield_days(student_id, covered_date)
        values (p_student_id, v_today - 1)
        on conflict (student_id, covered_date) do nothing;
      update public.profiles set streak_shields = streak_shields - 1 where id = p_student_id;
      return jsonb_build_object('used', true, 'covered_date', (v_today - 1)::text, 'remaining', v_remaining - 1);
    end if;
  end if;
  return jsonb_build_object('used', false,
    'remaining', coalesce((select streak_shields from public.profiles where id = p_student_id), 0));
end; $$;
grant execute on function public.use_streak_shield_if_needed(text) to anon, authenticated;

-- 4. 連勝里程碑加分也要把「護盾補的日子」算進去(否則護盾救了連勝、里程碑卻沒認)
--    = schema_fixes_26 的版本 + dates CTE 多 union 護盾日。
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
    select covered_date from public.streak_shield_days where student_id = p_student_id   -- ← 護盾日
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

-- 5. 學員讀的是 v_public_profiles(無手機視圖);要讓學員端看得到自己的護盾數,
--    把 streak_shields 加進視圖(加在最後 → create or replace view 可行)。
create or replace view public.v_public_profiles as
  select id, name, role, team_id, batch_id, score, active_pet_id,
         captain_id, division_name, director_id, status, created_at,
         profile_id, squad_role, streak_shields
  from public.profiles;
grant select on public.v_public_profiles to anon, authenticated;

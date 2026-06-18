-- =====================================================================
-- 補充遷移 12：遊戲化成就與解鎖即時通知系統
-- 1. achievements 表新增 target_mission_id 欄位。
-- 2. user_achievements 表新增 notified 欄位。
-- 3. 建立 _check_unlock_achievements 函數，支援 5 種條件。
-- 4. 覆蓋 _apply_score_delta 函數，使其呼叫 _check_unlock_achievements。
-- 5. 建立 mark_achievements_notified RPC 函數以繞過 RLS。
-- 6. 回填歷史資料與已達標之基準線，將 notified 設為 true。
-- =====================================================================

-- 1. 擴充表欄位
alter table public.achievements add column if not exists target_mission_id text;
alter table public.user_achievements add column if not exists notified boolean not null default false;

-- 2. 建立成就解鎖檢查的核心函數
create or replace function public._check_unlock_achievements(p_student_id text, p_score integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_pet_stage integer := 0;
  v_witness_count integer := 0;
  v_streak integer := 0;
begin
  -- 2a. 取得神獸目前階段
  select coalesce(max(current_stage_index), 0) into v_pet_stage
    from public.user_pets
   where student_id = p_student_id;

  -- 2b. 取得見證牆入選數 (不含 custom-post 且已 approved)
  select count(*) into v_witness_count
    from public.submissions
   where student_id = p_student_id
     and status = 'approved'
     and share_to_witness = true
     and mission_id <> 'task-custom-post';

  -- 2c. 取得連續打卡天數 (以台灣時間為準)
  with dates as (
    select distinct (m.publish_at at time zone 'Asia/Taipei')::date as d
      from public.submissions s
      join public.missions m on s.mission_id = m.id
     where s.student_id = p_student_id
       and s.status <> 'rejected'
       and m.mission_type = 'daily'
  ),
  ordered_dates as (
    select d, d - (row_number() over (order by d))::integer as grp
      from dates
  ),
  streaks as (
    select grp, count(*) as streak_length, max(d) as max_d
      from ordered_dates
     group by grp
  )
  select coalesce(max(streak_length), 0) into v_streak
    from streaks
   where max_d >= (now() at time zone 'Asia/Taipei')::date - 1;

  -- A. total_score
  insert into public.user_achievements (student_id, achievement_id, unlocked_at, notified)
  select p_student_id, a.id, now(), false
    from public.achievements a
   where a.condition_type = 'total_score'
     and a.condition_value <= coalesce(p_score, 0)
     and not exists (
       select 1 from public.user_achievements ua
        where ua.student_id = p_student_id and ua.achievement_id = a.id
     );

  -- B. consecutive_checkins
  insert into public.user_achievements (student_id, achievement_id, unlocked_at, notified)
  select p_student_id, a.id, now(), false
    from public.achievements a
   where a.condition_type = 'consecutive_checkins'
     and a.condition_value <= v_streak
     and not exists (
       select 1 from public.user_achievements ua
        where ua.student_id = p_student_id and ua.achievement_id = a.id
     );

  -- C. mission_count
  insert into public.user_achievements (student_id, achievement_id, unlocked_at, notified)
  select p_student_id, a.id, now(), false
    from public.achievements a
   where a.condition_type = 'mission_count'
     and a.target_mission_id is not null
     and a.condition_value <= (
       select count(*)
         from public.submissions s
        where s.student_id = p_student_id
          and s.mission_id = a.target_mission_id
          and s.status = 'approved'
     )
     and not exists (
       select 1 from public.user_achievements ua
        where ua.student_id = p_student_id and ua.achievement_id = a.id
     );

  -- D. witness_post_count
  insert into public.user_achievements (student_id, achievement_id, unlocked_at, notified)
  select p_student_id, a.id, now(), false
    from public.achievements a
   where a.condition_type = 'witness_post_count'
     and a.condition_value <= v_witness_count
     and not exists (
       select 1 from public.user_achievements ua
        where ua.student_id = p_student_id and ua.achievement_id = a.id
     );

  -- E. pet_stage
  insert into public.user_achievements (student_id, achievement_id, unlocked_at, notified)
  select p_student_id, a.id, now(), false
    from public.achievements a
   where a.condition_type = 'pet_stage'
     and a.condition_value <= v_pet_stage
     and not exists (
       select 1 from public.user_achievements ua
        where ua.student_id = p_student_id and ua.achievement_id = a.id
     );
end;
$$;

-- 3. 覆蓋 _apply_score_delta，引入 _check_unlock_achievements
create or replace function public._apply_score_delta(
  p_student_id   text,
  p_amount       integer,
  p_reason       text,
  p_submission_id text,
  p_created_by   text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id   text;
  v_new_score integer;
begin
  if p_student_id is null or coalesce(p_amount, 0) = 0 then
    return;
  end if;

  -- 更新分數
  update public.profiles
     set score = coalesce(score, 0) + p_amount
   where id = p_student_id
   returning team_id, score into v_team_id, v_new_score;

  -- 更新隊伍總分
  if v_team_id is not null then
    update public.teams
       set total_score = coalesce(total_score, 0) + p_amount
     where id = v_team_id;
  end if;

  -- 寫入 log
  insert into public.score_logs (student_id, amount, reason, submission_id, created_by)
  values (p_student_id, p_amount, p_reason, p_submission_id, p_created_by);

  -- 寵物經驗 (每 700 EXP 升一級)
  if exists (select 1 from public.user_pets where student_id = p_student_id) then
    update public.user_pets
       set total_exp  = greatest(0, coalesce(total_exp, 0) + p_amount),
           level      = floor(greatest(0, coalesce(total_exp, 0) + p_amount) / 700.0),
           updated_at = now()
     where student_id = p_student_id;
  else
    insert into public.user_pets (
      student_id, total_exp, level, current_stage_index, has_pending_evolution, created_at, updated_at
    )
    values (
      p_student_id, 
      greatest(0, p_amount), 
      floor(greatest(0, p_amount) / 700.0), 
      1, 
      false, 
      now(), 
      now()
    );
  end if;

  -- 執行多維度解鎖檢查
  perform public._check_unlock_achievements(p_student_id, v_new_score);
end;
$$;

-- 4. 建立 RPC 以供學員端呼叫更新 notified (繞過只准管理員寫的 RLS)
create or replace function public.mark_achievements_notified(p_student_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.user_achievements
     set notified = true
   where student_id = p_student_id and notified = false;
end; $$;

grant execute on function public.mark_achievements_notified(text) to anon, authenticated;

-- 5. 基準線回填：將既存的成就設為 notified = true，並自動補解鎖歷史已達標者
update public.user_achievements set notified = true where notified = false;

-- A. total_score
insert into public.user_achievements (student_id, achievement_id, unlocked_at, notified)
select p.id, a.id, now(), true
  from public.profiles p
  join public.achievements a
    on a.condition_type = 'total_score' and a.condition_value <= coalesce(p.score, 0)
 where not exists (
   select 1 from public.user_achievements ua
    where ua.student_id = p.id and ua.achievement_id = a.id
 );

-- B. consecutive_checkins
insert into public.user_achievements (student_id, achievement_id, unlocked_at, notified)
select p.id, a.id, now(), true
  from public.profiles p
  join public.achievements a
    on a.condition_type = 'consecutive_checkins'
   and a.condition_value <= (
     with dates as (
       select distinct (m.publish_at at time zone 'Asia/Taipei')::date as d
         from public.submissions s
         join public.missions m on s.mission_id = m.id
        where s.student_id = p.id
          and s.status <> 'rejected'
          and m.mission_type = 'daily'
     ),
     ordered_dates as (
       select d, d - (row_number() over (order by d))::integer as grp
         from dates
     ),
     streaks as (
       select grp, count(*) as streak_length, max(d) as max_d
         from ordered_dates
        group by grp
     )
     select coalesce(max(streak_length), 0)
       from streaks
      where max_d >= (now() at time zone 'Asia/Taipei')::date - 1
   )
 where not exists (
   select 1 from public.user_achievements ua
    where ua.student_id = p.id and ua.achievement_id = a.id
 );

-- C. mission_count
insert into public.user_achievements (student_id, achievement_id, unlocked_at, notified)
select p.id, a.id, now(), true
  from public.profiles p
  join public.achievements a
    on a.condition_type = 'mission_count' and a.target_mission_id is not null
   and a.condition_value <= (
     select count(*)
       from public.submissions s
      where s.student_id = p.id
        and s.mission_id = a.target_mission_id
        and s.status = 'approved'
   )
 where not exists (
   select 1 from public.user_achievements ua
    where ua.student_id = p.id and ua.achievement_id = a.id
 );

-- D. witness_post_count
insert into public.user_achievements (student_id, achievement_id, unlocked_at, notified)
select p.id, a.id, now(), true
  from public.profiles p
  join public.achievements a
    on a.condition_type = 'witness_post_count'
   and a.condition_value <= (
     select count(*)
       from public.submissions s
      where s.student_id = p.id
        and s.status = 'approved'
        and s.share_to_witness = true
        and s.mission_id <> 'task-custom-post'
   )
 where not exists (
   select 1 from public.user_achievements ua
    where ua.student_id = p.id and ua.achievement_id = a.id
 );

-- E. pet_stage
insert into public.user_achievements (student_id, achievement_id, unlocked_at, notified)
select p.id, a.id, now(), true
  from public.profiles p
  join public.achievements a
    on a.condition_type = 'pet_stage'
   and a.condition_value <= (
     select coalesce(max(current_stage_index), 0)
       from public.user_pets up
      where up.student_id = p.id
   )
 where not exists (
   select 1 from public.user_achievements ua
    where ua.student_id = p.id and ua.achievement_id = a.id
 );

-- =====================================================================
-- 補充遷移 13：優化成就解鎖任務計數，支援 template_id 跨梯次比對
-- =====================================================================

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

  -- C. mission_count (優化：同時支援比對實體 mission_id 與範本 template_id)
  insert into public.user_achievements (student_id, achievement_id, unlocked_at, notified)
  select p_student_id, a.id, now(), false
    from public.achievements a
   where a.condition_type = 'mission_count'
     and a.target_mission_id is not null
     and a.condition_value <= (
       select count(*)
         from public.submissions s
         left join public.missions m on s.mission_id = m.id
        where s.student_id = p_student_id
          and (s.mission_id = a.target_mission_id or m.template_id = a.target_mission_id)
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

-- =====================================================================
-- 補充遷移 9：調整升級經驗門檻與特定任務加分比例
-- 1. 將升級門檻由 500 EXP 調整為 700 EXP。
-- 2. 調整任務分數：邀約入門課 (1000 -> 500), 推薦初階 (2000 -> 1500)。
-- 在 Supabase 的 SQL Editor 執行一次。
-- =====================================================================

-- 1. 更新計分 Trigger 函式：_apply_score_delta()
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

  -- 更新該報名列的分數，取得隊伍與新分數
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

  -- 寫入計分紀錄
  insert into public.score_logs (student_id, amount, reason, submission_id, created_by)
  values (p_student_id, p_amount, p_reason, p_submission_id, p_created_by);

  -- 寵物經驗 / 等級（每 700 exp 升 1 級；防禦性自動補建）
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

  -- 依總分自動解鎖成就（total_score 類型）
  insert into public.user_achievements (student_id, achievement_id, unlocked_at)
  select p_student_id, a.id, now()
    from public.achievements a
   where a.condition_type = 'total_score'
     and a.condition_value <= coalesce(v_new_score, 0)
     and not exists (
       select 1 from public.user_achievements ua
        where ua.student_id = p_student_id and ua.achievement_id = a.id
     );
end;
$$;

-- 2. 更新新學員自動建立寵物 Trigger 函式：_create_user_pet()
create or replace function public._create_user_pet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'student'
     and not exists (select 1 from public.user_pets up where up.student_id = new.id) then
    insert into public.user_pets
      (student_id, total_exp, level, current_stage_index, has_pending_evolution, created_at, updated_at)
    values
      (new.id, coalesce(new.score, 0), floor(coalesce(new.score, 0) / 700.0), 1, false, now(), now());
  end if;
  return new;
end;
$$;

-- 3. 重新計算資料庫中現有寵物的等級
update public.user_pets
   set level = floor(total_exp / 700.0);

-- 4. 調整特定任務分數設定（範本 & 目前已分發的任務）
update public.mission_templates
   set points = 500
 where title = '邀約入門課';

update public.mission_templates
   set points = 1500
 where title = '推薦初階';

update public.missions
   set points = 500
 where title = '邀約入門課';

update public.missions
   set points = 1500
 where title = '推薦初階';

-- =====================================================================
-- 完成。
-- =====================================================================

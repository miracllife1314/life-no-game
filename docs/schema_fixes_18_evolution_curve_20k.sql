-- =====================================================================
-- 補充遷移 18：遊戲化神獸升級曲線動態化 (600起步，每進化一階每級多100)
-- 1. 建立 calculate_level_from_exp 函數，以階梯式計算等級。
-- 2. 覆蓋 _apply_score_delta 函數，使用此函數計算寵物等級。
-- 3. 覆蓋 _create_user_pet 觸發器函數，使用此函數計算初始等級。
-- 4. 自動更新全體 user_pets 的目前等級為最新級距。
-- =====================================================================

-- 1. 建立等級計算核心函數
create or replace function public.calculate_level_from_exp(p_exp integer)
returns integer
language plpgsql
immutable
as $$
declare
  v_exp integer := coalesce(p_exp, 0);
begin
  if v_exp < 0 then
    v_exp := 0;
  end if;

  if v_exp < 3000 then
    return floor(v_exp / 600.0);
  elsif v_exp < 6500 then
    return 5 + floor((v_exp - 3000) / 700.0);
  elsif v_exp < 10500 then
    return 10 + floor((v_exp - 6500) / 800.0);
  elsif v_exp < 15000 then
    return 15 + floor((v_exp - 10500) / 900.0);
  elsif v_exp < 20000 then
    return 20 + floor((v_exp - 15000) / 1000.0);
  else
    return 25 + floor((v_exp - 20000) / 1100.0);
  end if;
end;
$$;

grant execute on function public.calculate_level_from_exp(integer) to anon, authenticated;

-- 2. 覆蓋 _apply_score_delta，使其呼叫 calculate_level_from_exp
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
  v_new_exp   integer;
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

  -- 寵物經驗 (採用動態等級計算)
  if exists (select 1 from public.user_pets where student_id = p_student_id) then
    update public.user_pets
       set total_exp  = greatest(0, coalesce(total_exp, 0) + p_amount),
           level      = public.calculate_level_from_exp(greatest(0, coalesce(total_exp, 0) + p_amount)),
           updated_at = now()
     where student_id = p_student_id;
  else
    v_new_exp := greatest(0, p_amount);
    insert into public.user_pets (
      student_id, total_exp, level, current_stage_index, has_pending_evolution, created_at, updated_at
    )
    values (
      p_student_id, 
      v_new_exp, 
      public.calculate_level_from_exp(v_new_exp), 
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

-- 3. 覆蓋 _create_user_pet，使用動態等級計算
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
      (new.id, coalesce(new.score, 0), public.calculate_level_from_exp(coalesce(new.score, 0)), 1, false, now(), now());
  end if;
  return new;
end;
$$;

-- 4. 全域更新現有 user_pets 的等級以對齊最新級距
update public.user_pets
   set level = public.calculate_level_from_exp(total_exp),
       updated_at = now();

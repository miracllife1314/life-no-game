-- =====================================================================
-- 補充遷移 2：確保每位學員都有 user_pets 列（寵物經驗條的資料來源）
-- 症狀：打卡分數有加（score_logs / profiles.score 有動），但「升級進度 EXP」
--       一直停在 0/500，因為該學員沒有 user_pets 列，計分觸發器更新不到。
-- 在 SQL Editor 執行一次（idempotent）。
-- =====================================================================

-- 1. 回填：為現有沒有寵物的學員建立 user_pets（經驗 = 目前分數）
insert into public.user_pets
  (student_id, total_exp, level, current_stage_index, has_pending_evolution, created_at, updated_at)
select
  p.id,
  coalesce(p.score, 0),
  floor(coalesce(p.score, 0) / 500.0),
  0,
  false,
  now(),
  now()
from public.profiles p
where p.role = 'student'
  and not exists (select 1 from public.user_pets up where up.student_id = p.id);

-- 2. 新學員自動建立 user_pets
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
      (new.id, coalesce(new.score, 0), floor(coalesce(new.score, 0) / 500.0), 0, false, now(), now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_create_user_pet on public.profiles;
create trigger trg_create_user_pet
  after insert on public.profiles
  for each row execute function public._create_user_pet();

-- =====================================================================
-- 完成。執行後現有學員立刻有寵物經驗，之後打卡 EXP 會隨分數增加。
-- =====================================================================

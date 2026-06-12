-- =====================================================================
-- 補充遷移 4：修正寵物初始階段索引（混沌之卵 = stage_index 1，不是 0）
-- 症狀：寵物升到 Lv5+ 卻不出現「進化選項」。
-- 原因：pet_stages 的蛋是 stage_index 1、程式也預期蛋=1、進化後=2+，
--       但 user_pets 的初始 current_stage_index 被設成 0 → 條件 (=== 1) 不成立。
-- 在 SQL Editor 執行一次（idempotent）。
-- =====================================================================

-- 1. 既有的蛋（未選進化路線、index 0）修正為 1
update public.user_pets
   set current_stage_index = 1
 where current_stage_index = 0
   and pet_line is null;

-- 2. 新學員自動建立 user_pets 時，初始階段改為 1（混沌之卵）
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
      (new.id, coalesce(new.score, 0), floor(coalesce(new.score, 0) / 500.0), 1, false, now(), now());
  end if;
  return new;
end;
$$;

-- =====================================================================
-- 完成。Lv5+ 的蛋即可看到進化方向選項。
-- =====================================================================

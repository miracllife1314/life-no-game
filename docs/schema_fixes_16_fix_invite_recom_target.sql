-- =====================================================================
-- 補充遷移 16：修正「邀約王者 / 推薦」成就指向正式庫正確的任務,並回填已達標者
--   - 原本 invite1-3 / recom1-3 的 target_mission_id 是「測試庫」的任務 ID,
--     正式庫對不到 → 這 6 個徽章在正式站永遠不會解鎖。
--   - 依確認:邀約成就以「邀約入門課」為準;推薦成就以「推薦初階」為準。
--       邀約入門課 = b4d76e85-da45-4260-a105-4821d1bccfd9
--       推薦初階   = d7e7a443-fabe-419a-9fbf-4a77aa110947
-- 安全：可重複執行(idempotent)。UPDATE 冪等;回填用 not exists 防重複。
-- ⚠️ 本檔僅適用「正式庫」(測試庫的任務 ID 不同,不要在測試庫跑)。
-- =====================================================================

-- 1. 把 6 個成就重新指向正式庫的正確任務
update public.achievements
   set target_mission_id = 'b4d76e85-da45-4260-a105-4821d1bccfd9'  -- 邀約入門課
 where id in ('invite1', 'invite2', 'invite3');

update public.achievements
   set target_mission_id = 'd7e7a443-fabe-419a-9fbf-4a77aa110947'  -- 推薦初階
 where id in ('recom1', 'recom2', 'recom3');

-- 2. 回填：已達標的學員直接補解鎖(notified = true → 靜默補上、不洗版彈窗)
insert into public.user_achievements (student_id, achievement_id, unlocked_at, notified)
select p.id, a.id, now(), true
  from public.profiles p
  join public.achievements a
    on a.condition_type = 'mission_count'
   and a.id in ('invite1', 'invite2', 'invite3', 'recom1', 'recom2', 'recom3')
 where a.condition_value <= (
         select count(*)
           from public.submissions s
          where s.student_id = p.id
            and s.mission_id = a.target_mission_id
            and s.status = 'approved'
       )
   and not exists (
         select 1 from public.user_achievements ua
          where ua.student_id = p.id and ua.achievement_id = a.id
       );

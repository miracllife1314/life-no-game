-- =====================================================================
-- P0-3 防重複加分:單次完成任務(max_completions=1 或未設)加「硬約束」,
--   擋跨裝置/跨分頁重複打卡(前端 checkInLock 只擋單一 session)。
--   可重複任務(max_completions=0 無限 / >1 多次,如邀約)不受限。
--
-- 作法:提交時由 trigger 算 dedup_key(單次任務=student_id||'_'||mission_id;
--   其餘=null);partial unique index 對「dedup_key 非 null」擋重複。
--
-- ⚠️ 兩個 Supabase(NLP + 揚升)各跑一次。
-- ⚠️ 若「步驟 4 建索引」失敗 = 既有已有重複資料;先跑「步驟 0 檢查」處理掉再建。
-- =====================================================================

-- ── 步驟 0(先跑這段查!):有沒有既有重複(單次任務、非退回、同一人同一任務 >1 筆)
--    有回筆數 → 代表過去已重複加分;要先決定怎麼處理(通常保留最早一筆、其餘退回)再建索引。
--    無回(0 筆)→ 直接往下跑步驟 1~4。
-- select s.student_id, s.mission_id, count(*)
--   from public.submissions s
--  where s.status <> 'rejected' and s.mission_id <> 'task-custom-post'
--    and coalesce(
--          (select t.max_completions from public.tasks t where t.id = s.mission_id),
--          (select m.max_completions from public.missions m where m.id = s.mission_id), 1) = 1
--  group by s.student_id, s.mission_id having count(*) > 1;

-- ── 步驟 1:欄位
alter table public.submissions add column if not exists dedup_key text;

-- ── 步驟 2:trigger —— 插入/更新時算 dedup_key(單次完成任務才設)
create or replace function public._set_submission_dedup_key()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_maxc integer;
begin
  if new.status = 'rejected' or new.mission_id = 'task-custom-post' then
    new.dedup_key := null; return new;
  end if;
  select coalesce(
           (select t.max_completions from public.tasks t where t.id = new.mission_id),
           (select m.max_completions from public.missions m where m.id = new.mission_id),
           1)
    into v_maxc;
  -- 只有「單次完成(=1)」設 key;0=無限、>1=可多次 → 不設(不受唯一約束)。
  if coalesce(v_maxc, 1) = 1 then
    new.dedup_key := new.student_id || '_' || new.mission_id;
  else
    new.dedup_key := null;
  end if;
  return new;
end; $$;
drop trigger if exists trg_set_submission_dedup_key on public.submissions;
create trigger trg_set_submission_dedup_key
  before insert or update on public.submissions
  for each row execute function public._set_submission_dedup_key();

-- ── 步驟 3:回填既有資料(讓索引建得起來)
update public.submissions s
   set dedup_key = s.student_id || '_' || s.mission_id
 where s.status <> 'rejected' and s.mission_id <> 'task-custom-post'
   and coalesce(
         (select t.max_completions from public.tasks t where t.id = s.mission_id),
         (select m.max_completions from public.missions m where m.id = s.mission_id), 1) = 1;

-- ── 步驟 4:partial unique index(有既有重複會失敗 → 先處理步驟 0)
create unique index if not exists uq_submissions_single_completion
  on public.submissions(dedup_key) where dedup_key is not null;

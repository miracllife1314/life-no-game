-- =====================================================================
-- 補打卡(手動)重新設計:取代「自動護盾」。
--   規則:每人每期 5 次補打卡;學員在護盾彈窗提交「補打卡任務」→(依設定審核)→
--   審核通過 → 補回「最近缺的那一天」(接得上連勝的那個缺口)+ 次數 -1。只補單天。
--   沿用 streak_shields(當「剩餘次數」)與 streak_shield_days(補回的日子)。
-- 冪等。測試庫 + 正式庫都要跑。
-- =====================================================================

-- 1. 補打卡次數:預設 5、全部重設 5(沿用 streak_shields 欄,語意=剩餘次數)
alter table public.profiles alter column streak_shields set default 5;
update public.profiles set streak_shields = 5;

-- 2. 任務可標記為「補打卡任務」(隱藏於一般任務區,只在護盾彈窗出現)
alter table public.tasks add column if not exists is_makeup boolean not null default false;

-- 3. 補打卡任務「審核通過」→ 補回最近缺的那一天 + 次數 -1
--    (改寫 _grant_shield_on_approve:只處理 is_makeup 任務;非補打卡任務不做事)
create or replace function public._grant_shield_on_approve()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_is_makeup boolean; v_becoming_approved boolean;
  v_remaining int; v_restore date; v_today date;
begin
  v_becoming_approved := (new.status = 'approved')
    and (tg_op = 'INSERT' or old.status is distinct from 'approved');
  if not v_becoming_approved then return new; end if;

  select coalesce(t.is_makeup, false) into v_is_makeup
    from public.tasks t where t.id = new.mission_id;
  if not coalesce(v_is_makeup, false) then return new; end if;   -- 只處理補打卡任務

  perform pg_advisory_xact_lock(hashtext('makeup:' || new.student_id));
  select streak_shields into v_remaining from public.profiles where id = new.student_id;
  if coalesce(v_remaining,0) <= 0 then return new; end if;       -- 沒次數了不補

  v_today := (now() at time zone 'Asia/Taipei')::date;

  with active_days as (
    select distinct (m.publish_at at time zone 'Asia/Taipei')::date as d
      from public.submissions s join public.missions m on s.mission_id = m.id
     where s.student_id = new.student_id and s.status <> 'rejected' and m.mission_type = 'daily'
    union
    select covered_date from public.streak_shield_days where student_id = new.student_id
  ),
  candidates as (
    select gs::date as d from generate_series(v_today - 30, v_today - 1, interval '1 day') gs
  )
  -- 最近缺的那一天:最大的 D(<今天),D 不在有效日、但 D-1 在有效日(接得上連勝)
  select max(c.d) into v_restore
    from candidates c
   where c.d not in (select d from active_days)
     and (c.d - 1) in (select d from active_days);

  if v_restore is not null then
    insert into public.streak_shield_days(student_id, covered_date)
      values (new.student_id, v_restore) on conflict (student_id, covered_date) do nothing;
    update public.profiles set streak_shields = greatest(0, streak_shields - 1) where id = new.student_id;
  end if;
  return new;
end; $$;
-- trigger 沿用既有 trg_grant_shield_on_approve(schema_fixes_28 已建),不需重建。

-- 4. claim_streak_bonus 與 use_streak_shield_if_needed 沿用(仍會 union 補日;
--    自動用的分支保留無妨——因為 streak_shields 現在是次數,自動用邏輯已不由前端呼叫)。

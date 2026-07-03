-- =====================================================================
-- 修補:連勝里程碑加分的 race condition(可重複領獎)
--
-- 問題:claim_streak_bonus 用「先查 score_logs 有沒有發過 → 沒有才發」,兩步非原子。
--   學員快速連點兩個不同的每日任務時,兩個 RPC 同時進來、都看到「還沒發」→ 同一里程碑加兩次分。
-- 修法:函式開頭加 pg_advisory_xact_lock(依 student_id),讓同一學員的並發呼叫序列化
--   (交易結束自動釋放),check-then-insert 就安全了。其餘邏輯與原本 schema_fixes_15 完全相同。
-- 冪等:可重複執行(create or replace)。⚠️ 測試庫 + 正式庫都要各跑一次。
-- =====================================================================

create or replace function public.claim_streak_bonus(p_student_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_streak     integer := 0;
  v_threshold  integer;
  v_bonus      integer;
  v_reason     text;
  v_awarded    jsonb := '[]'::jsonb;
  v_milestones integer[][] := array[ array[3,100], array[7,200], array[14,500], array[21,800], array[30,1000] ];
  i integer;
begin
  if p_student_id is null then
    return jsonb_build_object('streak', 0, 'awarded', v_awarded);
  end if;

  -- 🔒 防 race:同一學員的並發呼叫序列化(交易結束自動釋放)。這是本次唯一的新增。
  perform pg_advisory_xact_lock(hashtext(p_student_id));

  -- 計算目前連續定課天數(台灣時間,含 pending)
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

  -- 逐一檢查里程碑:達標且尚未發過 → 加分(經 _apply_score_delta 同步分數/經驗/成就)
  for i in 1 .. array_length(v_milestones, 1) loop
    v_threshold := v_milestones[i][1];
    v_bonus     := v_milestones[i][2];
    if v_streak >= v_threshold then
      v_reason := '🔥 連勝 ' || v_threshold || ' 天里程碑獎勵';
      if not exists (
        select 1 from public.score_logs
         where student_id = p_student_id
           and reason = v_reason
      ) then
        perform public._apply_score_delta(p_student_id, v_bonus, v_reason, null, 'system');
        v_awarded := v_awarded || jsonb_build_object('threshold', v_threshold, 'bonus', v_bonus);
      end if;
    end if;
  end loop;

  return jsonb_build_object('streak', v_streak, 'awarded', v_awarded);
end;
$$;

grant execute on function public.claim_streak_bonus(text) to anon, authenticated;

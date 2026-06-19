-- =====================================================================
-- 補充遷移 15：連勝里程碑「徽章 + 加分」
--   - 沿用既有 consecutive_checkins 成就機制(達標自動解鎖徽章 + 彈窗)。
--   - 既有徽章：3天(streak1)、7天(streak2)、21天(streak3) 保留不動。
--   - 新增徽章：14天(streak14)、30天(streak30)。
--   - 新增 claim_streak_bonus()：3天+100 / 7天+200 / 14天+500 / 21天+800 / 30天+1000，
--     同一里程碑每位學員只給一次(以 score_logs.reason 防重複)。
-- 安全：本檔可重複執行(idempotent)，不會重複加分、不會破壞既有資料。
-- =====================================================================

-- 1. 更新與新增 3/7/14/21/30 天連勝徽章
insert into public.achievements (id, title, description, icon_url, condition_type, condition_value, target_mission_id) values
('streak1', '🥉 初露鋒芒', '連續定課修行 3 天，踏出穩健修行的第一步。', 'Flame', 'consecutive_checkins', 3, null),
('streak2', '🥈 漸入佳境', '連續定課修行 7 天，養成自律修行的優良習慣。', 'Layers', 'consecutive_checkins', 7, null),
('streak14', '🥇 勢不可擋', '連續定課修行 14 天，半月堅持，修行已成日常節奏。', 'CalendarCheck', 'consecutive_checkins', 14, null),
('streak3', '🏆 爐火純青', '連續定課修行 21 天，將修行完美融入靈魂生命。', 'Shield', 'consecutive_checkins', 21, null),
('streak30', '👑 登峰造極', '連續定課修行 30 天，整月不間斷，自律已內化為本能。', 'Award', 'consecutive_checkins', 30, null)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  icon_url = excluded.icon_url,
  condition_type = excluded.condition_type,
  condition_value = excluded.condition_value,
  target_mission_id = excluded.target_mission_id;


-- 2. 連勝加分函式：計算目前連續定課天數，對達標里程碑加分(防重複)。
--    回傳 jsonb：{ "streak": N, "awarded": [ { "threshold":7, "bonus":200 }, ... ] }
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
  -- 里程碑設定：{門檻天數, 加分}
  v_milestones integer[][] := array[ array[3,100], array[7,200], array[14,500], array[21,800], array[30,1000] ];
  i integer;
begin
  if p_student_id is null then
    return jsonb_build_object('streak', 0, 'awarded', v_awarded);
  end if;

  -- 計算目前連續定課天數(與成就解鎖同一套邏輯，台灣時間，含 pending)
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

  -- 逐一檢查里程碑：達標且尚未發過 → 加分(經 _apply_score_delta 同步分數/經驗/成就)
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

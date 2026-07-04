-- =====================================================================
-- 補打卡:一天只能補一次(避免一次補一堆)。
--   在 _grant_shield_on_approve 加一道:今天已經補過(streak_shield_days 有今天建立的)就不再補。
-- 冪等。測試庫 + 正式庫都要跑(取代 schema_fixes_30 的同名函式)。
-- =====================================================================
create or replace function public._grant_shield_on_approve()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_is_makeup boolean; v_becoming_approved boolean;
  v_remaining int; v_restore date; v_today date;
begin
  v_becoming_approved := (new.status = 'approved')
    and (tg_op = 'INSERT' or old.status is distinct from 'approved');
  if not v_becoming_approved then return new; end if;
  select coalesce(t.is_makeup, false) into v_is_makeup from public.tasks t where t.id = new.mission_id;
  if not coalesce(v_is_makeup, false) then return new; end if;

  perform pg_advisory_xact_lock(hashtext('makeup:' || new.student_id));
  select streak_shields into v_remaining from public.profiles where id = new.student_id;
  if coalesce(v_remaining,0) <= 0 then return new; end if;

  v_today := (now() at time zone 'Asia/Taipei')::date;

  -- 🚦 一天只能補一次:今天已經補過(有今天建立的補日)就不再補
  if exists (
    select 1 from public.streak_shield_days
     where student_id = new.student_id
       and (created_at at time zone 'Asia/Taipei')::date = v_today
  ) then
    return new;
  end if;

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
  select max(c.d) into v_restore from candidates c
   where c.d not in (select d from active_days) and (c.d - 1) in (select d from active_days);

  if v_restore is not null then
    insert into public.streak_shield_days(student_id, covered_date)
      values (new.student_id, v_restore) on conflict (student_id, covered_date) do nothing;
    update public.profiles set streak_shields = greatest(0, streak_shields - 1) where id = new.student_id;
  end if;
  return new;
end; $$;

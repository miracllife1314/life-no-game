-- =====================================================================
-- NLP 計分系統 — 上線修復遷移（在既有資料庫的 SQL Editor 執行一次）
-- 補上 mock 引擎原本「偷偷做」、真實 Supabase 缺少的三件事：
--   1. profiles.profile_id 欄位（多期報名模型：一人多列、同 profile_id）
--   2. adjust_score() RPC（手動調分、課程出席加分）
--   3. submissions 計分觸發器（打卡/審核通過自動加分、更新隊伍總分、寫 log、寵物經驗、解成就）
--   4. proof-images Storage bucket（打卡證明圖片）
-- 可重複執行（idempotent）。
-- =====================================================================

-- ---------- 1. 多期報名模型：profiles.profile_id ----------
alter table public.profiles add column if not exists profile_id text;
-- 既有資料回填：每筆現有 profile 自己就是一個「人」
update public.profiles set profile_id = id where profile_id is null;

-- ---------- 2. 內部加分函式（核心邏輯，集中一處）----------
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

  -- 2a. 更新該報名列的分數，取得隊伍與新分數
  update public.profiles
     set score = coalesce(score, 0) + p_amount
   where id = p_student_id
   returning team_id, score into v_team_id, v_new_score;

  -- 2b. 更新隊伍總分
  if v_team_id is not null then
    update public.teams
       set total_score = coalesce(total_score, 0) + p_amount
     where id = v_team_id;
  end if;

  -- 2c. 寫入計分紀錄
  insert into public.score_logs (student_id, amount, reason, submission_id, created_by)
  values (p_student_id, p_amount, p_reason, p_submission_id, p_created_by);

  -- 2d. 寵物經驗 / 等級（每 500 exp 升 1 級，對齊原本前端邏輯；防禦性自動補建）
  if exists (select 1 from public.user_pets where student_id = p_student_id) then
    update public.user_pets
       set total_exp  = greatest(0, coalesce(total_exp, 0) + p_amount),
           level      = floor(greatest(0, coalesce(total_exp, 0) + p_amount) / 500.0),
           updated_at = now()
     where student_id = p_student_id;
  else
    insert into public.user_pets (
      student_id, total_exp, level, current_stage_index, has_pending_evolution, created_at, updated_at
    )
    values (
      p_student_id, 
      greatest(0, p_amount), 
      floor(greatest(0, p_amount) / 500.0), 
      1, 
      false, 
      now(), 
      now()
    );
  end if;

  -- 2e. 依總分自動解鎖成就（total_score 類型）
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

-- ---------- 對外 RPC：adjust_score（手動調分 / 出席加分）----------
create or replace function public.adjust_score(
  p_student_id    text,
  p_amount        integer,
  p_reason        text default '手動調整',
  p_submission_id text default null,
  p_created_by    text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._apply_score_delta(p_student_id, p_amount, p_reason, p_submission_id, p_created_by);
end;
$$;

grant execute on function public.adjust_score(text, integer, text, text, text) to anon, authenticated;

-- ---------- 3. submissions 計分觸發器 ----------
-- 打卡(自動通過)或審核通過時自動加分；撤銷/刪除時自動扣回。
create or replace function public._submission_score_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'approved' and coalesce(new.score_awarded, 0) <> 0 then
      perform public._apply_score_delta(
        new.student_id, new.score_awarded, '完成任務', new.id, new.reviewed_by);
    end if;
    return new;

  elsif tg_op = 'UPDATE' then
    -- 轉為 approved：加分
    if new.status = 'approved' and old.status is distinct from 'approved' then
      perform public._apply_score_delta(
        new.student_id, coalesce(new.score_awarded, 0), '完成任務', new.id, new.reviewed_by);
    -- 由 approved 轉走：扣回
    elsif old.status = 'approved' and new.status is distinct from 'approved' then
      perform public._apply_score_delta(
        new.student_id, -coalesce(old.score_awarded, 0), '任務審核撤銷', new.id, new.reviewed_by);
    end if;
    return new;

  elsif tg_op = 'DELETE' then
    if old.status = 'approved' and coalesce(old.score_awarded, 0) <> 0 then
      perform public._apply_score_delta(
        old.student_id, -old.score_awarded, '任務刪除', old.id, old.reviewed_by);
    end if;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_submission_score on public.submissions;
create trigger trg_submission_score
  after insert or update or delete on public.submissions
  for each row execute function public._submission_score_trigger();

-- ---------- 4. proof-images Storage bucket（打卡證明圖片）----------
insert into storage.buckets (id, name, public)
values ('proof-images', 'proof-images', true)
on conflict (id) do nothing;

drop policy if exists "proof_images_all" on storage.objects;
create policy "proof_images_all" on storage.objects
  for all to anon, authenticated
  using (bucket_id = 'proof-images')
  with check (bucket_id = 'proof-images');

-- =====================================================================
-- 完成。執行後：多期報名、計分、打卡圖片上傳即可在真實伺服器運作。
-- =====================================================================

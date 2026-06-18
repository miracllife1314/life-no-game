-- =====================================================================
-- 補充遷移 11：見證牆入選任務額外加分改為 +200 EXP
-- 1. 當任務被核准且勾選分享至見證牆時，額外獲得 +200 EXP（前為 +300）。
-- 2. 扣回規則調整：先前已加 +300 的歷史貼文若遭取消或刪除，將依據 score_logs 紀錄扣回實際的分數（300 或 200），不溯及既往。
-- =====================================================================

create or replace function public._submission_score_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  was_approved boolean;
  is_approved boolean;
  was_shared boolean;
  is_shared boolean;
  v_mission_id text;
  v_awarded_amount integer;
begin
  if tg_op = 'INSERT' then
    if new.status = 'approved' then
      -- 基礎任務分數
      if coalesce(new.score_awarded, 0) <> 0 then
        perform public._apply_score_delta(
          new.student_id, new.score_awarded, '完成任務', new.id, new.reviewed_by);
      end if;
      -- 見證牆加分 (+200)：需排除自由分享 (task-custom-post)
      if new.share_to_witness = true and new.mission_id <> 'task-custom-post' then
        perform public._apply_score_delta(
          new.student_id, 200, '入選見證牆獎勵', new.id, new.reviewed_by);
      end if;
    end if;
    return new;

  elsif tg_op = 'UPDATE' then
    was_approved := (old.status = 'approved');
    is_approved  := (new.status = 'approved');
    
    -- 排除自由分享 (task-custom-post)
    v_mission_id := coalesce(new.mission_id, old.mission_id);
    
    if v_mission_id <> 'task-custom-post' then
      was_shared := (old.share_to_witness = true);
      is_shared  := (new.share_to_witness = true);
    else
      was_shared := false;
      is_shared  := false;
    end if;

    -- 1. 處理基礎任務分數的變動
    if is_approved and not was_approved then
      perform public._apply_score_delta(
        new.student_id, coalesce(new.score_awarded, 0), '完成任務', new.id, new.reviewed_by);
    elsif was_approved and not is_approved then
      perform public._apply_score_delta(
        new.student_id, -coalesce(old.score_awarded, 0), '任務審核撤銷', new.id, new.reviewed_by);
    end if;

    -- 2. 處理見證牆額外加分的變動
    -- 轉為 [審核通過且有分享] 但原本不是 ➔ 加 200
    if (is_approved and is_shared) and not (was_approved and was_shared) then
      perform public._apply_score_delta(
        new.student_id, 200, '入選見證牆獎勵', new.id, new.reviewed_by);
    -- 原本是 [審核通過且有分享] 但現在不是 ➔ 扣回先前獲得的實際入選分
    elsif (was_approved and was_shared) and not (is_approved and is_shared) then
      select coalesce(sum(amount), 0) into v_awarded_amount
        from public.score_logs
       where submission_id = new.id
         and reason = '入選見證牆獎勵';
      
      -- 如果紀錄中有大於 0 的已加分數，扣回該分數
      if v_awarded_amount > 0 then
        perform public._apply_score_delta(
          new.student_id, -v_awarded_amount, '取消入選見證牆獎勵', new.id, new.reviewed_by);
      else
        -- 備用防呆：預設扣除 200
        perform public._apply_score_delta(
          new.student_id, -200, '取消入選見證牆獎勵', new.id, new.reviewed_by);
      end if;
    end if;

    return new;

  elsif tg_op = 'DELETE' then
    if old.status = 'approved' then
      -- 扣回基礎任務分數
      if coalesce(old.score_awarded, 0) <> 0 then
        perform public._apply_score_delta(
          old.student_id, -old.score_awarded, '任務刪除', old.id, old.reviewed_by);
      end if;
      -- 扣回見證牆加分
      if old.share_to_witness = true and old.mission_id <> 'task-custom-post' then
        select coalesce(sum(amount), 0) into v_awarded_amount
          from public.score_logs
         where submission_id = old.id
           and reason = '入選見證牆獎勵';
        
        if v_awarded_amount > 0 then
          perform public._apply_score_delta(
            old.student_id, -v_awarded_amount, '取消入選見證牆獎勵', old.id, old.reviewed_by);
        else
          -- 備用防呆：預設扣除 200
          perform public._apply_score_delta(
            old.student_id, -200, '取消入選見證牆獎勵', old.id, old.reviewed_by);
        end if;
      end if;
    end if;
    return old;
  end if;

  return null;
end;
$$;

-- =====================================================================
-- 安全強化 階段 1：權限「零件」就位 —— 全部休眠，不改變任何現有行為
--
--   本檔只「建立」以下東西，但都「不通電」：
--     1. 輔助函式 is_admin() / is_captain_of()   → 單獨存在無作用
--     2. 防改分 trigger「函式」                   → 建立但「不掛上」表 → 不生效
--     3. profiles / submissions / score_logs 的 RLS「政策」
--                                                 → 建立但「不啟用 RLS」 → 不生效
--
--   ⚠️ 本檔不會：掛 trigger、不會 ENABLE RLS、不會鎖 adjust_score。
--      所以跑完後：App 行為不變、攻擊仍可（與基準線相同）。通電全部留到階段 2。
--
--   冪等：可重複執行。請在「測試專案 nlp-game-test」SQL Editor 執行；正式區先不要跑。
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 輔助函式（SECURITY DEFINER：自己讀 profiles，避免之後開 RLS 時遞迴卡死）
-- ---------------------------------------------------------------------

-- 目前登入者是否為管理員（大隊長）
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid()
      and role = 'admin'
  );
$$;

-- 目前登入者是否為「某學員所屬小隊」的隊長
create or replace function public.is_captain_of(p_student_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles me
    join public.profiles stu on stu.id = p_student_id
    where me.auth_user_id = auth.uid()
      and me.role = 'captain'
      and me.team_id is not null
      and me.team_id = stu.team_id
  );
$$;

-- ---------------------------------------------------------------------
-- 2. 防改分 trigger「函式」（只建立，階段 2 才掛上 profiles 表才會生效）
--    判斷邏輯：只有「直接以 anon/authenticated 角色打 API 改分數」且非管理員才擋。
--    系統的 SECURITY DEFINER 計分函式以 owner 身分執行 → current_user 不是 anon/authenticated → 自動放行
--    （所以不需猜函式 owner 名稱，最穩）。
-- ---------------------------------------------------------------------
create or replace function public._block_score_tamper()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.score is distinct from old.score) then
    if current_user in ('anon', 'authenticated') and not public.is_admin() then
      raise exception '[安全] 分數僅能由系統審核或管理員調整，禁止直接修改。';
    end if;
  end if;
  return new;
end;
$$;
-- 注意：這裡「故意不」建立 trigger。階段 2 才會執行：
--   create trigger trg_block_score_tamper before update on public.profiles
--     for each row execute function public._block_score_tamper();

-- ---------------------------------------------------------------------
-- 3. RLS 政策（只建立，階段 2 才 ENABLE ROW LEVEL SECURITY 才會生效）
-- ---------------------------------------------------------------------

-- 3a. profiles ----------------------------------------------------------
drop policy if exists "p_profiles_select" on public.profiles;
create policy "p_profiles_select" on public.profiles
  for select to anon, authenticated
  using (true);                                  -- 排行榜/組員名單：全可讀

drop policy if exists "p_profiles_update" on public.profiles;
create policy "p_profiles_update" on public.profiles
  for update to anon, authenticated
  using      (public.is_admin() or auth.uid() = auth_user_id)
  with check (public.is_admin() or auth.uid() = auth_user_id);  -- 只能改自己；管理員全可改

drop policy if exists "p_profiles_insert" on public.profiles;
create policy "p_profiles_insert" on public.profiles
  for insert to anon, authenticated
  with check (public.is_admin());                -- 新增帳號僅管理員（報名走後端 service role）

drop policy if exists "p_profiles_delete" on public.profiles;
create policy "p_profiles_delete" on public.profiles
  for delete to anon, authenticated
  using (public.is_admin());                     -- 刪帳號僅管理員

-- 3b. submissions -------------------------------------------------------
drop policy if exists "p_subs_select" on public.submissions;
create policy "p_subs_select" on public.submissions
  for select to anon, authenticated
  using (true);                                  -- 見證牆/進度：可讀

drop policy if exists "p_subs_insert" on public.submissions;
create policy "p_subs_insert" on public.submissions
  for insert to anon, authenticated
  with check (
    public.is_admin()
    or public.is_captain_of(student_id)          -- 隊長可代隊員打卡
    or exists (select 1 from public.profiles p
                where p.id = submissions.student_id
                  and p.auth_user_id = auth.uid())  -- 只能幫自己打卡
  );

drop policy if exists "p_subs_update" on public.submissions;
create policy "p_subs_update" on public.submissions
  for update to anon, authenticated
  using      (public.is_admin() or public.is_captain_of(student_id))
  with check (public.is_admin() or public.is_captain_of(student_id));  -- 審核：管理員/隊長

drop policy if exists "p_subs_delete" on public.submissions;
create policy "p_subs_delete" on public.submissions
  for delete to anon, authenticated
  using (
    public.is_admin()
    or public.is_captain_of(student_id)
    or exists (select 1 from public.profiles p
                where p.id = submissions.student_id
                  and p.auth_user_id = auth.uid())  -- 學員可刪自己的見證/打卡
  );

-- 3c. score_logs --------------------------------------------------------
--    只給「讀」政策；不給任何寫政策 → 階段2 開 RLS 後，前端完全不能寫，
--    但系統 SECURITY DEFINER 計分 trigger 仍可寫（definer 繞過 RLS）。
drop policy if exists "p_scorelogs_select" on public.score_logs;
create policy "p_scorelogs_select" on public.score_logs
  for select to anon, authenticated
  using (
    public.is_admin()
    or public.is_captain_of(student_id)
    or exists (select 1 from public.profiles p
                where p.id = score_logs.student_id
                  and p.auth_user_id = auth.uid())  -- 只能看自己的分數明細
  );

-- =====================================================================
-- 跑完這支：App 與攻擊現況「完全不變」（零件已就位但未通電）。
-- 下一步（階段 2）才會：掛 trigger + 鎖 adjust_score + ENABLE RLS。
-- =====================================================================

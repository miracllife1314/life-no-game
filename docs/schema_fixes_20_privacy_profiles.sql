-- =====================================================================
-- 安全修復 批次① :profiles 手機/auth_user_id 外洩
--
-- 【鐵則】先在「測試庫」執行並驗證，確認無誤、經確認後，才在正式庫執行。
--
-- 【安全執行順序】(避免中途弄壞排行榜)
--   PART 1：先跑（新增公開視圖，純新增、不影響現況）。
--   → 前端改成「看別人讀視圖、看自己/後台讀 profiles」並上線後，
--   PART 2：最後才跑（收緊 profiles 讀取）。
--
-- 目標：外人/一般學員讀不到他人手機；管理員/本人/該隊隊長仍可讀整列。
-- =====================================================================

-- ===== 前置：確保 helper 函式存在(自包含；已存在則 replace，無副作用) =====
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where auth_user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_captain_of(p_student_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles me join public.profiles stu on stu.id = p_student_id
    where me.auth_user_id = auth.uid() and me.role = 'captain' and me.team_id is not null and me.team_id = stu.team_id);
$$;


-- ===================================================================
-- PART 1 —— 先跑這段（純新增，安全，不會弄壞任何現況）
-- 公開視圖：只露非敏感欄位，藏掉 phone 與 auth_user_id
-- ===================================================================
-- 只藏 phone 與 auth_user_id;其餘欄位保留(程式會用到 profile_id/captain_id 等內部欄位)
-- 註:用 drop+create(不可用 create or replace,因為改了欄位順序會報 42P16)
drop view if exists public.v_public_profiles;

create view public.v_public_profiles as
  select id, name, role, team_id, batch_id, score, active_pet_id,
         captain_id, division_name, director_id, status, created_at,
         profile_id, squad_role
  from public.profiles;

grant select on public.v_public_profiles to anon, authenticated;


-- ===================================================================
-- PART 2 —— 等前端都改好、上線後，才跑這段（這段才會真正收緊）
-- 收緊 profiles 的 SELECT：只有 管理員 / 本人 / 該隊隊長 能讀整列
-- ===================================================================
-- drop policy if exists "p_profiles_select" on public.profiles;
-- create policy "p_profiles_select" on public.profiles
--   for select to anon, authenticated
--   using ( public.is_admin()
--           or auth.uid() = auth_user_id
--           or public.is_captain_of(id) );


-- ===================================================================
-- 回滾（萬一 PART 2 後出問題，跑這段還原成舊的「全開」狀態）
-- ===================================================================
-- drop policy if exists "p_profiles_select" on public.profiles;
-- create policy "p_profiles_select" on public.profiles
--   for select to anon, authenticated using (true);

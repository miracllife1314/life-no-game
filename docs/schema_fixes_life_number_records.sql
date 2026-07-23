-- =====================================================================
-- 生命數字「我的紀錄」搬進 DB(原本存 localStorage,同一裝置換帳號會看到別人的)。
--   每筆綁 student_id;RLS 只讓「本人 + 管理員」讀寫 →
--   跨裝置都看得到自己的,其他人的帳號看不到。
--
-- ⚠️ 只在「揚升庫(life-no-game)」跑(NLP 沒有生命數字功能)。
-- 依賴 is_admin()、profiles.auth_user_id(揚升庫已有)。冪等(可重複貼)。
-- =====================================================================

create table if not exists public.life_number_records (
  id          uuid primary key default gen_random_uuid(),
  student_id  text not null,                 -- 擁有這筆紀錄的帳號(profiles.id)
  name        text not null,
  birthday    text,
  life_number integer,
  created_at  timestamptz not null default now()
);

create index if not exists idx_life_number_records_student
  on public.life_number_records(student_id);

alter table public.life_number_records enable row level security;

-- 本人(該 student_id 的 profile.auth_user_id = 目前登入 auth.uid())或管理員,才可讀/寫。
drop policy if exists life_number_records_owner on public.life_number_records;
create policy life_number_records_owner on public.life_number_records
  for all to anon, authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.profiles p
                where p.id = life_number_records.student_id
                  and p.auth_user_id = auth.uid())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.profiles p
                where p.id = life_number_records.student_id
                  and p.auth_user_id = auth.uid())
  );

-- 確認
select policyname, cmd from pg_policies
 where schemaname = 'public' and tablename = 'life_number_records';

-- =====================================================================
-- Rollback:
--   drop table if exists public.life_number_records;
-- =====================================================================

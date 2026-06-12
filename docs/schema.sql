-- =====================================================================
-- NLP 人性溝通術課程計分系統 — 完整資料庫重建 Schema
-- 適用於全新空白的 Supabase 專案（在 SQL Editor 一次貼上執行）
--
-- 設計重點：
--   1. 本系統「不走 Supabase Auth」（auth.uid() 永遠 null），
--      所以所有資料表的 RLS 對 anon 角色全開。
--   2. 所有 id 皆為 TEXT（系統會混用 'admin1'/'batch-50' 等自訂字串與 UUID），
--      未提供 id 時由 gen_random_uuid()::text 自動產生。
--   3. 程式碼以 JS 手動 join，未使用 PostgREST 巢狀查詢，故不加外鍵約束，
--      欄位型別保持寬鬆（不加 CHECK），以避免插入失敗。
--   4. 可重複執行（idempotent）：CREATE TABLE IF NOT EXISTS / ON CONFLICT。
-- =====================================================================

-- ---------- 核心：成員 / 隊伍 / 梯次 ----------

create table if not exists public.profiles (
  id            text primary key default gen_random_uuid()::text,
  name          text not null,
  role          text default 'student',          -- admin | captain | student
  team_id       text,
  batch_id      text,
  score         integer default 0,
  active_pet_id text,
  phone         text,
  captain_id    text,
  division_name text,
  director_id   text,
  status        text,                             -- active | ended | inactive
  created_at    timestamptz default now()
);

create table if not exists public.teams (
  id             text primary key default gen_random_uuid()::text,
  name           text not null,
  custom_name    text,
  captain_id     text,
  total_score    integer default 0,
  batch_id       text,
  invite_code    text,
  invite_enabled boolean default true,
  max_members    integer default 10,
  created_at     timestamptz default now()
);

create table if not exists public.batches (
  id               text primary key default gen_random_uuid()::text,
  name             text not null,
  start_date       timestamptz,
  end_date         timestamptz,
  status           text default 'draft',          -- draft | active | ended
  rankings_visible boolean default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ---------- 任務 / 任務範本 / 梯次任務 ----------

create table if not exists public.tasks (
  id                text primary key default gen_random_uuid()::text,
  name              text not null,
  description       text,
  type              text,                          -- daily | weekly | temporary | limited
  score             integer default 0,
  requires_approval boolean default false,
  requires_proof    boolean default false,
  publish_time      timestamptz,
  start_time        timestamptz,
  end_time          timestamptz,
  target_type       text,                          -- all | team | individual
  target_team_id    text,
  target_user_id    text,
  batch_id          text,
  category          text,
  created_by        text,
  max_completions   integer,
  created_at        timestamptz default now()
);

create table if not exists public.mission_templates (
  id              text primary key default gen_random_uuid()::text,
  title           text not null,
  description     text,
  mission_type    text,                            -- daily | weekly | special | limited
  points          integer default 0,
  review_type     text default 'auto',             -- auto | leader | admin
  is_active       boolean default true,
  category        text,
  max_completions integer,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists public.batch_mission_templates (
  id            text primary key default gen_random_uuid()::text,
  batch_id      text,
  template_id   text,
  week_offset   integer,
  day_offset    integer,
  duration_days integer,
  is_enabled    boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.missions (
  id              text primary key default gen_random_uuid()::text,
  batch_id        text,
  template_id     text,
  title           text,
  description     text,
  mission_type    text,                            -- daily | weekly | special | limited
  points          integer default 0,
  publish_at      timestamptz,
  deadline_at     timestamptz,
  status          text default 'draft',            -- draft | active | scheduled | published | ended
  review_type     text default 'auto',
  category        text,
  max_completions integer,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ---------- 任務提交（打卡證明）----------
-- 注意：程式碼同時用到 mission_id 與 task_id 兩種寫法，故兩欄皆建。

create table if not exists public.submissions (
  id              text primary key default gen_random_uuid()::text,
  mission_id      text,
  task_id         text,
  student_id      text,
  proof_text      text,
  proof_image_url text,
  proof_link      text,
  status          text default 'pending',          -- pending | approved | rejected
  score_awarded   integer default 0,
  reviewed_by     text,
  reviewed_at     timestamptz,
  created_at      timestamptz default now()
);

create table if not exists public.score_logs (
  id            text primary key default gen_random_uuid()::text,
  student_id    text,
  amount        integer default 0,
  reason        text,
  submission_id text,
  created_by    text,
  created_at    timestamptz default now()
);

-- ---------- 課程 / 出席 ----------

create table if not exists public.courses (
  id           text primary key default gen_random_uuid()::text,
  name         text not null,
  description  text,
  class_date   timestamptz,
  batch_id     text,
  register_url text,
  created_at   timestamptz default now()
);

create table if not exists public.course_attendance (
  id          text primary key default gen_random_uuid()::text,
  course_id   text,
  student_id  text,
  status      text default 'registered',           -- registered | attended
  attended_at timestamptz,
  created_at  timestamptz default now()
);

-- ---------- 成就 ----------

create table if not exists public.achievements (
  id              text primary key default gen_random_uuid()::text,
  title           text not null,
  description     text,
  icon_url        text,
  condition_type  text default 'total_score',
  condition_value integer default 0,
  created_at      timestamptz default now()
);

create table if not exists public.user_achievements (
  id             text primary key default gen_random_uuid()::text,
  student_id     text,
  achievement_id text,
  unlocked_at    timestamptz default now()
);

-- ---------- 公告 / 小隊長筆記 / 隊長候選 ----------

create table if not exists public.announcements (
  id         text primary key default gen_random_uuid()::text,
  title      text not null,
  content    text,
  created_by text,
  batch_id   text,
  created_at timestamptz default now()
);

create table if not exists public.student_notes (
  id         text primary key default gen_random_uuid()::text,
  student_id text,
  captain_id text,
  note       text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.captain_candidates (
  id         text primary key default gen_random_uuid()::text,
  profile_id text,
  status     text default 'eligible',              -- eligible | paused | disabled
  created_at timestamptz default now()
);

-- ---------- 遊戲化：寵物系統 ----------

create table if not exists public.pets (
  id                     text primary key default gen_random_uuid()::text,
  name                   text not null,
  description            text,
  image_url              text,
  evolution_image_url    text,
  unlock_score_threshold integer default 0,
  created_at             timestamptz default now()
);

create table if not exists public.user_pets (
  id                      text primary key default gen_random_uuid()::text,
  student_id              text,
  pet_id                  text,
  pet_level               integer default 1,
  current_skin            text,
  unlocked_at             timestamptz,
  pet_line                text,
  current_stage_index     integer default 0,
  total_exp               integer default 0,
  level                   integer default 1,
  first_reached_lv5_at    timestamptz,
  evolution_eligible_at   timestamptz,
  evolved_at              timestamptz,
  has_pending_evolution   boolean default false,
  selected_evolution_line text,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

create table if not exists public.pet_lines (
  id               text primary key default gen_random_uuid()::text,
  line_key         text,
  name             text,
  description      text,
  core_traits      text,
  is_active        boolean default true,
  image_url        text,
  unlock_level     integer,
  task_template_id text,
  sort_order       integer,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table if not exists public.pet_stages (
  id             text primary key default gen_random_uuid()::text,
  line_key       text,
  stage_index    integer,
  stage_name     text,
  min_level      integer,
  max_level      integer,
  image_url      text,
  animation_type text,
  glow_color     text,
  description    text,
  evolution_text text,
  is_active      boolean default true,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create table if not exists public.pet_evolution_logs (
  id                  text primary key default gen_random_uuid()::text,
  student_id          text,
  from_stage_index    integer,
  to_stage_index      integer,
  from_stage_name     text,
  to_stage_name       text,
  pet_line            text,
  level               integer,
  total_exp           integer,
  days_to_reach_level integer,
  created_at          timestamptz default now()
);

-- ---------- 遊戲化：卡牌系統 ----------

create table if not exists public.cards (
  id           text primary key default gen_random_uuid()::text,
  title        text not null,
  description  text,
  element_type text,                                -- water | fire | wind | earth
  rarity       text,                                -- N | R | SR | SSR
  image_url    text,
  created_at   timestamptz default now()
);

create table if not exists public.decks (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  created_by  text,
  is_template boolean default false,
  created_at  timestamptz default now()
);

create table if not exists public.deck_cards (
  id      text primary key default gen_random_uuid()::text,
  deck_id text,
  card_id text,
  count   integer default 1
);

create table if not exists public.user_decks (
  id         text primary key default gen_random_uuid()::text,
  student_id text,
  deck_id    text,
  is_active  boolean default false,
  created_at timestamptz default now()
);

-- =====================================================================
-- RLS：對 anon / authenticated 全開（本系統無 Auth）
-- =====================================================================

do $$
declare
  t text;
  tbls text[] := array[
    'profiles','teams','batches','tasks','mission_templates',
    'batch_mission_templates','missions','submissions','score_logs',
    'courses','course_attendance','achievements','user_achievements',
    'announcements','student_notes','captain_candidates','pets','user_pets',
    'pet_lines','pet_stages','pet_evolution_logs','cards','decks',
    'deck_cards','user_decks'
  ];
begin
  foreach t in array tbls loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "allow_all_anon" on public.%I', t);
    execute format(
      'create policy "allow_all_anon" on public.%I for all to anon, authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- 確保 anon / authenticated 角色具備資料表權限
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;

-- =====================================================================
-- Storage：寵物圖片上傳用的公開 bucket
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('pet-images', 'pet-images', true)
on conflict (id) do nothing;

drop policy if exists "pet_images_all" on storage.objects;
create policy "pet_images_all" on storage.objects
  for all to anon, authenticated
  using (bucket_id = 'pet-images')
  with check (bucket_id = 'pet-images');

-- =====================================================================
-- 種子資料：3 個管理員帳號（讓你能立即登入後台，其餘資料進後台自建）
-- 登入方式為手機號碼。
-- =====================================================================

insert into public.profiles (id, name, phone, role, score, status, division_name, batch_id, team_id, created_at)
values
  ('admin1',         '林大統', '0911111111', 'admin', 15000, 'active', '大統大隊', null, null, now()),
  ('admin-dingyang', '劉定洋', '0922222222', 'admin', 20000, 'active', '定洋大隊', null, null, now()),
  ('admin-panchan',  '張品嬋', '0933333333', 'admin', 20000, 'active', '定洋大隊', null, null, now())
on conflict (id) do nothing;

-- =====================================================================
-- 完成。共建立 25 張資料表 + RLS + 權限 + pet-images bucket + 3 管理員。
-- =====================================================================

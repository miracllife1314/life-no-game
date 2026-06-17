-- =====================================================================
-- 測試資料庫一次建表：在「新的測試 Supabase 專案」SQL Editor 貼上整段、按 Run
-- （依相依順序合併所有 schema 檔；皆 idempotent，可重複執行）
-- =====================================================================


-- ========== schema.sql ==========
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


-- ========== schema_fixes.sql ==========
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


-- ========== schema_fixes_2.sql ==========
-- =====================================================================
-- 補充遷移 2：確保每位學員都有 user_pets 列（寵物經驗條的資料來源）
-- 症狀：打卡分數有加（score_logs / profiles.score 有動），但「升級進度 EXP」
--       一直停在 0/500，因為該學員沒有 user_pets 列，計分觸發器更新不到。
-- 在 SQL Editor 執行一次（idempotent）。
-- =====================================================================

-- 1. 回填：為現有沒有寵物的學員建立 user_pets（經驗 = 目前分數）
insert into public.user_pets
  (student_id, total_exp, level, current_stage_index, has_pending_evolution, created_at, updated_at)
select
  p.id,
  coalesce(p.score, 0),
  floor(coalesce(p.score, 0) / 500.0),
  0,
  false,
  now(),
  now()
from public.profiles p
where p.role = 'student'
  and not exists (select 1 from public.user_pets up where up.student_id = p.id);

-- 2. 新學員自動建立 user_pets
create or replace function public._create_user_pet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'student'
     and not exists (select 1 from public.user_pets up where up.student_id = new.id) then
    insert into public.user_pets
      (student_id, total_exp, level, current_stage_index, has_pending_evolution, created_at, updated_at)
    values
      (new.id, coalesce(new.score, 0), floor(coalesce(new.score, 0) / 500.0), 0, false, now(), now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_create_user_pet on public.profiles;
create trigger trg_create_user_pet
  after insert on public.profiles
  for each row execute function public._create_user_pet();

-- =====================================================================
-- 完成。執行後現有學員立刻有寵物經驗，之後打卡 EXP 會隨分數增加。
-- =====================================================================


-- ========== schema_fixes_3.sql ==========
-- =====================================================================
-- 補充遷移 3：見證牆「主動分享」旗標
-- 需求：自動簽到不要上見證牆；只有「需審核」的提交、且學員勾選分享時才上牆。
-- 在 SQL Editor 執行一次（idempotent）。空間極小（一個 boolean）。
-- =====================================================================

alter table public.submissions
  add column if not exists share_to_witness boolean default false;

-- 既有的免證明簽到等資料保持 false（不上牆）；自訂分享貼文於程式端設為 true。

-- =====================================================================
-- 完成。
-- =====================================================================


-- ========== schema_fixes_4.sql ==========
-- =====================================================================
-- 補充遷移 4：修正寵物初始階段索引（混沌之卵 = stage_index 1，不是 0）
-- 症狀：寵物升到 Lv5+ 卻不出現「進化選項」。
-- 原因：pet_stages 的蛋是 stage_index 1、程式也預期蛋=1、進化後=2+，
--       但 user_pets 的初始 current_stage_index 被設成 0 → 條件 (=== 1) 不成立。
-- 在 SQL Editor 執行一次（idempotent）。
-- =====================================================================

-- 1. 既有的蛋（未選進化路線、index 0）修正為 1
update public.user_pets
   set current_stage_index = 1
 where current_stage_index = 0
   and pet_line is null;

-- 2. 新學員自動建立 user_pets 時，初始階段改為 1（混沌之卵）
create or replace function public._create_user_pet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'student'
     and not exists (select 1 from public.user_pets up where up.student_id = new.id) then
    insert into public.user_pets
      (student_id, total_exp, level, current_stage_index, has_pending_evolution, created_at, updated_at)
    values
      (new.id, coalesce(new.score, 0), floor(coalesce(new.score, 0) / 500.0), 1, false, now(), now());
  end if;
  return new;
end;
$$;

-- =====================================================================
-- 完成。Lv5+ 的蛋即可看到進化方向選項。
-- =====================================================================


-- ========== schema_fixes_5.sql ==========
-- =====================================================================
-- 補充遷移 5：小隊任務角色欄位
-- 後台/隊長後台新增了「指派小隊任務角色」功能，需要 profiles.squad_role 欄位。
-- 在 SQL Editor 執行一次（idempotent）。
-- =====================================================================

alter table public.profiles
  add column if not exists squad_role text;

-- =====================================================================
-- 完成。
-- =====================================================================


-- ========== schema_fixes_5_squad_role.sql ==========
-- =====================================================================
-- 補充遷移 5：新增 squad_role 欄位以支援職責指派同步
-- =====================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS squad_role text;

-- =====================================================================
-- 完成。
-- =====================================================================


-- ========== schema_fixes_6_dynamic_squad_roles.sql ==========
-- =====================================================================
-- 補充遷移 6：自訂小隊職責 (squad_roles)
-- =====================================================================

create table if not exists public.squad_roles (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  duties text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 設定權限 (與其它表格一致，暫時全開或根據需要設定 RLS)
alter table public.squad_roles enable row level security;

-- 允許所有人讀取
create policy "Enable read access for all users on squad_roles"
  on public.squad_roles for select using (true);

-- 允許所有人新增/修改/刪除 (後端與前端會靠權限阻擋非管理員)
create policy "Enable insert access for all users on squad_roles"
  on public.squad_roles for insert with check (true);

create policy "Enable update access for all users on squad_roles"
  on public.squad_roles for update using (true);

create policy "Enable delete access for all users on squad_roles"
  on public.squad_roles for delete using (true);

-- 寫入基礎預設職責 (可選)
insert into public.squad_roles (id, name, duties) values
  ('6bc3f1f2-1b12-42c2-8418-5d1d6a13f7de', '提燈人', array['協助引導隊員打卡', '記錄分享會要點']),
  ('a0a035d8-c703-4c91-9de1-2a6c1e5d762e', '破曉行者', array['帶頭進行每日打卡', '每日分享轉念心法']),
  ('b1f83c14-23db-4e17-baf0-5db5e1564f5f', '金剛護法', array['維護學習紀律', '協助解答技術問題'])
on conflict do nothing;

-- =====================================================================
-- 完成。
-- =====================================================================


-- ========== schema_fixes_7_witness_social.sql ==========
-- =====================================================================
-- 補充遷移 7：見證牆「按讚 / 留言」改存資料庫
-- 原本讚與留言只存在瀏覽器 localStorage（換裝置就不見、別人看不到、無法管理）。
-- 改為兩張資料表，讓互動跨裝置共享。
-- 在 Supabase 的 SQL Editor 執行一次（可重複執行，idempotent）。
-- =====================================================================

-- 按讚：一個人對一則貼文最多一個讚（unique 防重複）
create table if not exists public.witness_likes (
  id            text primary key default gen_random_uuid()::text,
  submission_id text not null,
  user_id       text not null,
  created_at    timestamptz not null default now(),
  unique (submission_id, user_id)
);

-- 留言
create table if not exists public.witness_comments (
  id            text primary key default gen_random_uuid()::text,
  submission_id text not null,
  user_id       text not null,
  user_name     text,
  content       text not null,
  created_at    timestamptz not null default now()
);

-- 查詢加速
create index if not exists idx_witness_likes_sub    on public.witness_likes (submission_id);
create index if not exists idx_witness_comments_sub on public.witness_comments (submission_id);

-- RLS：與本系統其他資料表一致，對 anon / authenticated 全開
alter table public.witness_likes    enable row level security;
alter table public.witness_comments enable row level security;

drop policy if exists "witness_likes_all" on public.witness_likes;
create policy "witness_likes_all" on public.witness_likes
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "witness_comments_all" on public.witness_comments;
create policy "witness_comments_all" on public.witness_comments
  for all to anon, authenticated using (true) with check (true);

grant all on public.witness_likes    to anon, authenticated;
grant all on public.witness_comments to anon, authenticated;

-- =====================================================================
-- 完成。執行後，見證牆的讚與留言會存進資料庫、跨裝置共享。
-- =====================================================================


-- ========== schema_fixes_8_course_sort.sql ==========
-- =====================================================================
-- 補充遷移 8：課程排序欄位
-- 後台課程編輯新增「排序」功能，需要 courses.sort_order 欄位（數字越小越前面）。
-- 在 Supabase 的 SQL Editor 執行一次（可重複執行，idempotent）。
-- =====================================================================

alter table public.courses
  add column if not exists sort_order integer not null default 0;

-- =====================================================================
-- 完成。執行後即可在後台課程編輯設定排序。
-- =====================================================================


-- ========== schema_fixes_9_exp_700.sql ==========
-- =====================================================================
-- 補充遷移 9：調整升級經驗門檻與特定任務加分比例
-- 1. 將升級門檻由 500 EXP 調整為 700 EXP。
-- 2. 調整任務分數：邀約入門課 (1000 -> 500), 推薦初階 (2000 -> 1500)。
-- 在 Supabase 的 SQL Editor 執行一次。
-- =====================================================================

-- 1. 更新計分 Trigger 函式：_apply_score_delta()
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

  -- 更新該報名列的分數，取得隊伍與新分數
  update public.profiles
     set score = coalesce(score, 0) + p_amount
   where id = p_student_id
   returning team_id, score into v_team_id, v_new_score;

  -- 更新隊伍總分
  if v_team_id is not null then
    update public.teams
       set total_score = coalesce(total_score, 0) + p_amount
     where id = v_team_id;
  end if;

  -- 寫入計分紀錄
  insert into public.score_logs (student_id, amount, reason, submission_id, created_by)
  values (p_student_id, p_amount, p_reason, p_submission_id, p_created_by);

  -- 寵物經驗 / 等級（每 700 exp 升 1 級；防禦性自動補建）
  if exists (select 1 from public.user_pets where student_id = p_student_id) then
    update public.user_pets
       set total_exp  = greatest(0, coalesce(total_exp, 0) + p_amount),
           level      = floor(greatest(0, coalesce(total_exp, 0) + p_amount) / 700.0),
           updated_at = now()
     where student_id = p_student_id;
  else
    insert into public.user_pets (
      student_id, total_exp, level, current_stage_index, has_pending_evolution, created_at, updated_at
    )
    values (
      p_student_id, 
      greatest(0, p_amount), 
      floor(greatest(0, p_amount) / 700.0), 
      1, 
      false, 
      now(), 
      now()
    );
  end if;

  -- 依總分自動解鎖成就（total_score 類型）
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

-- 2. 更新新學員自動建立寵物 Trigger 函式：_create_user_pet()
create or replace function public._create_user_pet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'student'
     and not exists (select 1 from public.user_pets up where up.student_id = new.id) then
    insert into public.user_pets
      (student_id, total_exp, level, current_stage_index, has_pending_evolution, created_at, updated_at)
    values
      (new.id, coalesce(new.score, 0), floor(coalesce(new.score, 0) / 700.0), 1, false, now(), now());
  end if;
  return new;
end;
$$;

-- 3. 重新計算資料庫中現有寵物的等級
update public.user_pets
   set level = floor(total_exp / 700.0);

-- 4. 調整特定任務分數設定（範本 & 目前已分發的任務）
update public.mission_templates
   set points = 500
 where title = '邀約入門課';

update public.mission_templates
   set points = 1500
 where title = '推薦初階';

update public.missions
   set points = 500
 where title = '邀約入門課';

update public.missions
   set points = 1500
 where title = '推薦初階';

-- =====================================================================
-- 完成。
-- =====================================================================


-- ========== schema_fixes_10_witness_bonus.sql ==========
-- =====================================================================
-- 補充遷移 10：見證牆入選任務額外加分 (+300 EXP)
-- 1. 當任務被核准且勾選分享至見證牆時，額外獲得 +300 EXP。
-- 2. 支援動態切換：若取消分享、退回或刪除任務時，則自動扣回 300 EXP。
-- 3. 排除自由分享 (task-custom-post) 避免無限洗分。
-- 在 Supabase 的 SQL Editor 執行一次。
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
begin
  if tg_op = 'INSERT' then
    if new.status = 'approved' then
      -- 基礎任務分數
      if coalesce(new.score_awarded, 0) <> 0 then
        perform public._apply_score_delta(
          new.student_id, new.score_awarded, '完成任務', new.id, new.reviewed_by);
      end if;
      -- 見證牆加分 (+300)：需排除自由分享 (task-custom-post)
      if new.share_to_witness = true and new.mission_id <> 'task-custom-post' then
        perform public._apply_score_delta(
          new.student_id, 300, '入選見證牆獎勵', new.id, new.reviewed_by);
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
    -- 轉為 [審核通過且有分享] 但原本不是 ➔ 加 300
    if (is_approved and is_shared) and not (was_approved and was_shared) then
      perform public._apply_score_delta(
        new.student_id, 300, '入選見證牆獎勵', new.id, new.reviewed_by);
    -- 原本是 [審核通過且有分享] 但現在不是 ➔ 扣 300
    elsif (was_approved and was_shared) and not (is_approved and is_shared) then
      perform public._apply_score_delta(
        new.student_id, -300, '取消入選見證牆獎勵', new.id, new.reviewed_by);
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
        perform public._apply_score_delta(
          old.student_id, -300, '取消入選見證牆獎勵', old.id, old.reviewed_by);
      end if;
    end if;
    return old;
  end if;

  return null;
end;
$$;


-- ========== fix_submissions_rls.sql ==========
-- =====================================================
-- 修復 submissions 表的 RLS 讓匿名（anon key）也能 INSERT/SELECT
-- 原因：本系統不走 Supabase Auth，auth.uid() 永遠是 null，
--       舊的 policy 要求 student_id = auth.uid() 會全部被擋
-- =====================================================

-- 1. 先清除所有舊的相關 policy（避免重複執行報錯）
DROP POLICY IF EXISTS "學員可新增自己的任務證明" ON public.submissions;
DROP POLICY IF EXISTS "學員可查看自己的任務證明" ON public.submissions;
DROP POLICY IF EXISTS "允許打卡提交" ON public.submissions;
DROP POLICY IF EXISTS "允許查看所有提交" ON public.submissions;

-- 2. 新增允許 anon role 也能 INSERT 的 policy
CREATE POLICY "允許打卡提交" ON public.submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 3. 新增允許 anon role 也能 SELECT 的 policy
CREATE POLICY "允許查看所有提交" ON public.submissions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 說明：此設定適合開發/測試環境或無 Auth 的課程系統。
-- 若未來要加 Auth，請改回 student_id = auth.uid() 的嚴格版本。


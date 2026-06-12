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

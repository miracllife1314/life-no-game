-- =====================================================================
-- P0-8 攻略設定搬進 DB(原本只存大隊長自己的 localStorage,學員永遠看預設值)。
--   建通用設定表 app_config(key/value JSONB),攻略清單存在 key='guide_list'。
--   公開讀(學員要看)＋只有 is_admin() 能寫(後台編輯),比照 Tier1 後台專用表。
--
-- ⚠️ 兩個 Supabase(NLP + 揚升)各跑一次。
-- 冪等(可重複貼)。is_admin() 需已存在(安全-階段2 已建);若尚未建,先跑那批。
-- =====================================================================

-- ── 表:通用 key/value 設定(未來其他全站設定也可放這)
create table if not exists public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ── RLS:公開讀 + 只有 is_admin() 能寫(比照 tasks/announcements)
alter table public.app_config enable row level security;

drop policy if exists app_config_read on public.app_config;
create policy app_config_read on public.app_config
  for select using (true);

drop policy if exists app_config_admin_write on public.app_config;
create policy app_config_admin_write on public.app_config
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── 確認
select key, jsonb_typeof(value) as value_type, updated_at from public.app_config;

-- =====================================================================
-- Rollback:
--   drop table if exists public.app_config;
-- =====================================================================

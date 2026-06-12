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

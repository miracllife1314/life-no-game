-- =====================================================================
-- 簡易監控:client_logs(前端把「失敗/變慢」事件記下來,大隊長後台看得到)
--
-- 目的:像今天「上傳失敗 / 登入很慢」這種,以前要等學員回報才知道;
--   有了這張表 + 後台「系統健康」面板,系統會主動把問題記下來、你一眼看到。
-- 記什麼:upload_fail(圖片上傳失敗)/ submit_fail(提交失敗)/ slow_load(載入過慢)。
-- 隱私:只記事件類型/原因/姓名/時間,無心得內容、無敏感資料。
-- 權限:任何人(學員端)可「寫入」;只有大隊長(is_admin)可「讀取」。
-- 冪等:可重複執行。
-- =====================================================================

create table if not exists public.client_logs (
  id uuid primary key default gen_random_uuid(),
  type text not null,                 -- upload_fail / submit_fail / slow_load
  detail text,                        -- 原因或數值(例如 '8.3s, student')
  user_name text,                     -- 哪位(方便你追)
  created_at timestamptz not null default now()
);

alter table public.client_logs enable row level security;

-- 學員端寫入(只記事件,無敏感資料)
drop policy if exists "client_logs_insert" on public.client_logs;
create policy "client_logs_insert" on public.client_logs
  for insert to anon, authenticated with check (true);

-- 只有大隊長能讀
drop policy if exists "client_logs_select_admin" on public.client_logs;
create policy "client_logs_select_admin" on public.client_logs
  for select to anon, authenticated using (public.is_admin());

create index if not exists idx_client_logs_created_at on public.client_logs(created_at desc);

-- (可選)自動只留最近 30 天 —— 之後若想控制表大小再加排程;目前資料量很小不用。

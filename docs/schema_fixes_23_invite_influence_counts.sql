-- =====================================================================
-- 歷屆「邀約王者 / 影響力之神」跨期統計 RPC
--
-- 問題:邀約/影響力榜是數「審核通過、且任務名含 邀約 / 推薦|成交 的提交筆數」。
--   但學員端只載入「當期」的 submissions/missions → 歷屆榜算不出別期,人數不完整。
-- 解法:用伺服器端 RPC 跨「所有期數」統計,前端歷屆榜直接用它的結果(學員也看得到完整歷屆)。
--
-- 回傳:每個 student_id(= 某期的學員 profile)在所有期數累計的
--   invite_count(邀約)、influence_count(推薦/成交)審核通過筆數。
--   (與既有「歷屆神人榜」一致:同一個人不同期 = 不同 profile = 各自一列。)
-- 安全:只回「人數統計 + id」,無個資;開放 anon/authenticated 執行。
-- 冪等:可重複執行。
-- =====================================================================

create or replace function public.invite_influence_counts()
returns table(student_id text, invite_count int, influence_count int)
language sql stable security definer set search_path = public as $$
  select s.student_id::text,
    count(*) filter (where m.title ilike '%邀約%')::int,
    count(*) filter (where m.title ~ '推薦|成交')::int
  from public.submissions s
  join public.missions m on m.id = s.mission_id
  where s.status = 'approved'
    and (m.title ilike '%邀約%' or m.title ~ '推薦|成交')
  group by s.student_id;
$$;

grant execute on function public.invite_influence_counts() to anon, authenticated;

-- 驗證:select * from public.invite_influence_counts() order by invite_count desc;

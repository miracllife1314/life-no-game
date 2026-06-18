-- =====================================================================
-- 正式庫：清理重複任務（同 bug：套用期數任務範本重複新增）
-- =====================================================================
-- ⚠️ 在「正式庫」(epolsiukauqfwxmjojia) Supabase SQL Editor 執行。
-- 安全鎖：只刪「同一期 + 同標題 + 同發布日期」的重複，且「自己沒有任何打卡」的那幾筆；
--         每組一定保留 1 筆（優先保留有打卡的，否則保留最早建立的）。
-- 先跑【步驟1 乾跑】看會刪哪些、幾筆，確認沒問題再跑【步驟2 真刪】。
-- 執行前請先在 Supabase 後台做一次資料庫備份（Database → Backups）。
-- =====================================================================

-- ---------- 步驟 1：乾跑（只看，不刪）----------
-- 列出每組重複，標出哪筆保留(keep)、哪筆要刪(DELETE)
WITH ranked AS (
  SELECT m.id, m.batch_id, m.title,
         (m.publish_at::date) AS day,
         COALESCE(s.cnt, 0)   AS sub_cnt,
         ROW_NUMBER() OVER (
           PARTITION BY m.batch_id, m.title, (m.publish_at::date)
           ORDER BY COALESCE(s.cnt, 0) DESC, m.created_at ASC
         ) AS rn,
         COUNT(*) OVER (
           PARTITION BY m.batch_id, m.title, (m.publish_at::date)
         ) AS grp_size
  FROM public.missions m
  LEFT JOIN (
    SELECT mission_id, count(*) AS cnt
    FROM public.submissions GROUP BY mission_id
  ) s ON s.mission_id = m.id
)
SELECT
  CASE WHEN rn = 1 THEN '✅ 保留'
       WHEN sub_cnt > 0 THEN '⚠️ 重複但有打卡(不刪,需人工看)'
       ELSE '🗑️ 將刪除' END AS action,
  batch_id, title, day, sub_cnt, id
FROM ranked
WHERE grp_size > 1
ORDER BY batch_id, title, day, rn;

-- 統計：將刪除幾筆
WITH ranked AS (
  SELECT m.id,
         COALESCE(s.cnt, 0) AS sub_cnt,
         ROW_NUMBER() OVER (
           PARTITION BY m.batch_id, m.title, (m.publish_at::date)
           ORDER BY COALESCE(s.cnt, 0) DESC, m.created_at ASC
         ) AS rn
  FROM public.missions m
  LEFT JOIN (
    SELECT mission_id, count(*) AS cnt
    FROM public.submissions GROUP BY mission_id
  ) s ON s.mission_id = m.id
)
SELECT count(*) AS "將刪除筆數"
FROM ranked WHERE rn > 1 AND sub_cnt = 0;


-- ---------- 步驟 2：真刪（確認步驟1沒問題、已備份後再跑）----------
-- 安全鎖：rn > 1（不是該組保留者）AND sub_cnt = 0（自己 0 打卡）
WITH ranked AS (
  SELECT m.id,
         COALESCE(s.cnt, 0) AS sub_cnt,
         ROW_NUMBER() OVER (
           PARTITION BY m.batch_id, m.title, (m.publish_at::date)
           ORDER BY COALESCE(s.cnt, 0) DESC, m.created_at ASC
         ) AS rn
  FROM public.missions m
  LEFT JOIN (
    SELECT mission_id, count(*) AS cnt
    FROM public.submissions GROUP BY mission_id
  ) s ON s.mission_id = m.id
)
DELETE FROM public.missions
WHERE id IN (SELECT id FROM ranked WHERE rn > 1 AND sub_cnt = 0);


-- ---------- 步驟 3：刪後確認剩餘重複組數（應為 0）----------
SELECT count(*) AS "剩餘重複組數" FROM (
  SELECT 1 FROM public.missions
  GROUP BY batch_id, title, (publish_at::date)
  HAVING count(*) > 1
) x;

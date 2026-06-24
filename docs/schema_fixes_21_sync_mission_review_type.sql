-- =====================================================================
-- 修復:任務本體(missions)的 review_type 與其範本(mission_templates)不一致
-- 症狀:後台「任務管理」顯示的審核權限,與學員實際打卡到的任務本體不同步,
--       導致「後台寫管理員審核,小隊長卻審得了」(或相反)。
-- 原因:範本被改過審核權限後,既有的任務本體沒有跟著更新。
-- 作法:把每個任務本體的 review_type 對齊它的範本(以後台顯示為準)。
--
-- 影響(2026-06-25 掃描正式庫結果):
--   邀約 NLP 入門課 (batch-webwuxp) : leader → admin (小隊長將不能再審)
--   完成次感元個案   (batch-slycz6e) : admin  → leader(小隊長將可以審)
-- =====================================================================

-- 先看會改哪些(可選,先確認):
-- SELECT m.id, m.title, m.review_type AS 本體, mt.review_type AS 範本, m.batch_id
-- FROM missions m JOIN mission_templates mt ON m.template_id = mt.id
-- WHERE m.review_type IS DISTINCT FROM mt.review_type;

UPDATE missions m
SET review_type = mt.review_type
FROM mission_templates mt
WHERE m.template_id = mt.id
  AND m.review_type IS DISTINCT FROM mt.review_type;

-- 執行後再跑一次上面的 SELECT,應回傳 0 筆(全部一致)。

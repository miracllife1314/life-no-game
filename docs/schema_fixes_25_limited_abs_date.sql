-- =====================================================================
-- 限時任務「指定日期」模式:讓期數任務設定可直接填「幾月幾號~幾月幾號」,
--   不再只能用「開訓第幾天」推算(那是最容易算錯、害學員看不到的地方)。
--
-- 作法:給 batch_mission_templates 加兩個可空日期欄位。
--   兩者皆有值 → 該限時任務改用絕對日期;否則維持原本「開訓第幾天」邏輯。
-- 冪等:可重複執行。
-- ⚠️ 測試庫 + 正式庫都要各跑一次。
-- =====================================================================

alter table public.batch_mission_templates
  add column if not exists abs_publish_date  date,
  add column if not exists abs_deadline_date date;

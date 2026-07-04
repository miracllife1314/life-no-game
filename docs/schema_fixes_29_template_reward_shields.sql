-- =====================================================================
-- 期數任務也能送護盾:任務模板(mission_templates)加「reward_shields」。
--   套用到期數、產生任務(missions)時會一併帶入 → 學員完成該期數任務即獲得護盾。
--   (missions / tasks 的 reward_shields 已在 schema_fixes_28 建好;此檔補模板端。)
-- 冪等。測試庫 + 正式庫都要跑。
-- =====================================================================
alter table public.mission_templates add column if not exists reward_shields int not null default 0;

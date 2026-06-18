-- =====================================================================
-- 補充遷移 14：匯入 23 款全維度成就種子資料到 achievements 表
-- =====================================================================

insert into public.achievements (id, title, description, icon_url, condition_type, condition_value, target_mission_id) values
-- 1. 修行分數達標
('ach1', 'NLP 初行者', '修行分數突破 1,000 分，踏出溝通大師的第一步。', 'Activity', 'total_score', 1000, null),
('ach2', '心智密碼解鎖者', '修行分數突破 2,500 分，深度解鎖大腦思考迴路。', 'Sparkles', 'total_score', 2500, null),
('ach3', '卓越溝通大師', '修行分數突破 5,000 分，達到極佳的親和感建立境界。', 'Trophy', 'total_score', 5000, null),
('ach4', '心流喚醒者', '修行分數突破 7,500 分，進入溝通與感知的高度心流狀態。', 'Zap', 'total_score', 7500, null),
('ach5', '破繭智者', '修行分數突破 10,000 分，打破既有認知框架，洞悉大腦運作本質。', 'Brain', 'total_score', 10000, null),
('ach6', '共鳴領航員', '修行分數突破 15,000 分，能與周遭人事產生強大共鳴與引導。', 'Target', 'total_score', 15000, null),
('ach7', '無界幻遊使', '修行分數突破 20,000 分，超越空間與語言限制，達到無縫溝通。', 'Compass', 'total_score', 20000, null),
('ach8', '心智煉金術師', '修行分數突破 25,000 分，點石成金，將一切經驗轉化為成長養分。', 'Gem', 'total_score', 25000, null),
('ach9', 'NLP 宗師', '修行分數突破 30,000 分，臻於化境，一代溝通宗師誕生。', 'Crown', 'total_score', 30000, null),

-- 2. 連續定課修行
('streak1', '定課好習慣', '連續定課修行 3 天，踏出穩健修行的第一步。', 'Flame', 'consecutive_checkins', 3, null),
('streak2', '定課達人', '連續定課修行 7 天，養成自律修行的優良習慣。', 'Layers', 'consecutive_checkins', 7, null),
('streak3', '定課守護者', '連續定課修行 21 天，將修行完美融入靈魂生命。', 'Shield', 'consecutive_checkins', 21, null),

-- 3. 見證牆入選
('wit1', '智慧初顯', '心得貼文首次入選見證牆，分享您的覺察智慧。', 'MessageSquare', 'witness_post_count', 1, null),
('wit2', '智慧燈塔', '入選見證牆達 5 次，您的智慧心得溫暖並指引著同修。', 'Heart', 'witness_post_count', 5, null),

-- 4. 神獸進化
('pet1', '靈獸出世', '神獸首次成功進化到第 2 階段，開啟靈性共鳴。', 'Key', 'pet_stage', 2, null),
('pet2', '聖獸覺醒', '神獸成功進化至第 3 階段，綻放強大氣場與光芒。', 'Share2', 'pet_stage', 3, null),
('pet3', '終極神話', '神獸達成第 4 階段終極進化，展現無與倫比的至高形態！', 'GraduationCap', 'pet_stage', 4, null),

-- 5. 邀約入門課
('invite1', '利他小天使', '成功邀約 1 人參加 NLP 入門課，播下改變的種子。', 'UserPlus', 'mission_count', 1, '2d77f56d-58a2-4a58-8ecb-257c9a1374f3'),
('invite2', '利他播種者', '成功邀約 5 人參加 NLP 入門課，分享正向能量。', 'Users', 'mission_count', 5, '2d77f56d-58a2-4a58-8ecb-257c9a1374f3'),
('invite3', '利他傳播大師', '成功邀約 10 人參加 NLP 入門課，發揮強大社會影響力。', 'BookOpen', 'mission_count', 10, '2d77f56d-58a2-4a58-8ecb-257c9a1374f3'),

-- 6. 推薦初階
('recom1', '推廣先鋒', '成功推薦 1 人報名 NLP 初階課，引導他人踏上蛻變之旅。', 'Target', 'mission_count', 1, '1bcc0eeb-0e10-4b15-8709-3dcfa10157b2'),
('recom2', '心智啟蒙者', '成功推薦 3 人報名 NLP 初階課，協助他人改寫心智模式。', 'Gem', 'mission_count', 3, '1bcc0eeb-0e10-4b15-8709-3dcfa10157b2'),
('recom3', '傳奇引路人', '成功推薦 5 人報名 NLP 初階課，成為同修生命中的貴人。', 'Crown', 'mission_count', 5, '1bcc0eeb-0e10-4b15-8709-3dcfa10157b2')

on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  icon_url = excluded.icon_url,
  condition_type = excluded.condition_type,
  condition_value = excluded.condition_value,
  target_mission_id = excluded.target_mission_id;

import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const isProd = process.argv.includes('--prod');
const suffix = isProd ? '' : '_LOCAL';

const supabaseUrl = env[`NEXT_PUBLIC_SUPABASE_URL${suffix}`] || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env[`SUPABASE_SERVICE_ROLE_KEY${suffix}`] || env.SUPABASE_SERVICE_ROLE_KEY || env[`NEXT_PUBLIC_SUPABASE_ANON_KEY${suffix}`] || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log(`📡 匯入成就環境：${isProd ? '🔴 正式區 (PROD)' : '🟢 測試區 (TEST)'}`);
console.log(`📡 連線網址：${supabaseUrl}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const achievements = [
  // 1. 修行分數達標 (9個)
  { id: 'ach1', title: 'NLP 初行者', description: '修行分數突破 1,000 分，踏出溝通大師的第一步。', icon_url: 'Activity', condition_type: 'total_score', condition_value: 1000 },
  { id: 'ach2', title: '心智密碼解鎖者', description: '修行分數突破 2,500 分，深度解鎖大腦思考迴路。', icon_url: 'Sparkles', condition_type: 'total_score', condition_value: 2500 },
  { id: 'ach3', title: '卓越溝通大師', description: '修行分數突破 5,000 分，達到極佳的親和感建立境界。', icon_url: 'Trophy', condition_type: 'total_score', condition_value: 5000 },
  { id: 'ach4', title: '心流喚醒者', description: '修行分數突破 7,500 分，進入溝通與感知的高度心流狀態。', icon_url: 'Zap', condition_type: 'total_score', condition_value: 7500 },
  { id: 'ach5', title: '破繭智者', description: '修行分數突破 10,000 分，打破既有認知框架，洞悉大腦運作本質。', icon_url: 'Brain', condition_type: 'total_score', condition_value: 10000 },
  { id: 'ach6', title: '共鳴領航員', description: '修行分數突破 15,000 分，能與周遭人事產生強大共鳴與引導。', icon_url: 'Target', condition_type: 'total_score', condition_value: 15000 },
  { id: 'ach7', title: '無界幻遊使', description: '修行分數突破 20,000 分，超越空間與語言限制，達到無縫溝通。', icon_url: 'Compass', condition_type: 'total_score', condition_value: 20000 },
  { id: 'ach8', title: '心智煉金術師', description: '修行分數突破 25,000 分，點石成金，將一切經驗轉化為成長養分。', icon_url: 'Gem', condition_type: 'total_score', condition_value: 25000 },
  { id: 'ach9', title: 'NLP 宗師', description: '修行分數突破 30,000 分，臻於化境，一代溝通宗師誕生。', icon_url: 'Crown', condition_type: 'total_score', condition_value: 30000 },

  // 2. 連續定課修行 (3個)
  { id: 'streak1', title: '定課好習慣', description: '連續定課修行 3 天，踏出穩健修行的第一步。', icon_url: 'Flame', condition_type: 'consecutive_checkins', condition_value: 3 },
  { id: 'streak2', title: '定課達人', description: '連續定課修行 7 天，養成自律修行的優良習慣。', icon_url: 'Layers', condition_type: 'consecutive_checkins', condition_value: 7 },
  { id: 'streak3', title: '定課守護者', description: '連續定課修行 21 天，將修行完美融入靈魂生命。', icon_url: 'Shield', condition_type: 'consecutive_checkins', condition_value: 21 },

  // 3. 見證牆入選 (2個)
  { id: 'wit1', title: '智慧初顯', description: '心得貼文首次入選見證牆，分享您的覺察智慧。', icon_url: 'MessageSquare', condition_type: 'witness_post_count', condition_value: 1 },
  { id: 'wit2', title: '智慧燈塔', description: '入選見證牆達 5 次，您的智慧心得溫暖並指引著同修。', icon_url: 'Heart', condition_type: 'witness_post_count', condition_value: 5 },

  // 4. 神獸進化 (3個)
  { id: 'pet1', title: '靈獸出世', description: '神獸首次成功進化到第 2 階段，開啟靈性共鳴。', icon_url: 'Key', condition_type: 'pet_stage', condition_value: 2 },
  { id: 'pet2', title: '聖獸覺醒', description: '神獸成功進化至第 3 階段，綻放強大氣場與光芒。', icon_url: 'Share2', condition_type: 'pet_stage', condition_value: 3 },
  { id: 'pet3', title: '終極神話', description: '神獸達成第 4 階段終極進化，展現無與倫比的至高形態！', icon_url: 'GraduationCap', condition_type: 'pet_stage', condition_value: 4 },

  // 5. 邀約入門課 (3個)
  { id: 'invite1', title: '利他小天使', description: '成功邀約 1 人參加 NLP 入門課，播下改變的種子。', icon_url: 'UserPlus', condition_type: 'mission_count', condition_value: 1, target_mission_id: '2d77f56d-58a2-4a58-8ecb-257c9a1374f3' },
  { id: 'invite2', title: '利他播種者', description: '成功邀約 5 人參加 NLP 入門課，分享正向能量。', icon_url: 'Users', condition_type: 'mission_count', condition_value: 5, target_mission_id: '2d77f56d-58a2-4a58-8ecb-257c9a1374f3' },
  { id: 'invite3', title: '利他傳播大師', description: '成功邀約 10 人參加 NLP 入門課，發揮強大社會影響力。', icon_url: 'BookOpen', condition_type: 'mission_count', condition_value: 10, target_mission_id: '2d77f56d-58a2-4a58-8ecb-257c9a1374f3' },

  // 6. 推薦初階 (3個)
  { id: 'recom1', title: '推廣先鋒', description: '成功推薦 1 人報名 NLP 初階課，引導他人踏上蛻變之旅。', icon_url: 'Target', condition_type: 'mission_count', condition_value: 1, target_mission_id: '1bcc0eeb-0e10-4b15-8709-3dcfa10157b2' },
  { id: 'recom2', title: '心智啟蒙者', description: '成功推薦 3 人報名 NLP 初階課，協助他人改寫心智模式。', icon_url: 'Gem', condition_type: 'mission_count', condition_value: 3, target_mission_id: '1bcc0eeb-0e10-4b15-8709-3dcfa10157b2' },
  { id: 'recom3', title: '傳奇引路人', description: '成功推薦 5 人報名 NLP 初階課，成為同修生命中的貴人。', icon_url: 'Crown', condition_type: 'mission_count', condition_value: 5, target_mission_id: '1bcc0eeb-0e10-4b15-8709-3dcfa10157b2' }
];

async function seed() {
  console.log('Seeding achievements using fetch...');
  // Ensure all objects have the exact same keys (PGRST102 key alignment)
  const preparedAchievements = achievements.map(ach => ({
    id: ach.id,
    title: ach.title,
    description: ach.description || null,
    icon_url: ach.icon_url || null,
    condition_type: ach.condition_type,
    condition_value: ach.condition_value,
    target_mission_id: ach.target_mission_id || null
  }));

  const response = await fetch(`${supabaseUrl}/rest/v1/achievements`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(preparedAchievements)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error inserting achievements:', response.status, errorText);
  } else {
    console.log('Achievements successfully seeded:', preparedAchievements.length, 'records added or updated.');
  }
}

seed();

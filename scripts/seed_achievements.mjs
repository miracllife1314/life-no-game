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
const supabaseKey = env[`NEXT_PUBLIC_SUPABASE_ANON_KEY${suffix}`] || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log(`📡 匯入成就環境：${isProd ? '🔴 正式區 (PROD)' : '🟢 測試區 (TEST)'}`);
console.log(`📡 連線網址：${supabaseUrl}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const achievements = [
  { id: 'ach1', title: 'NLP 初行者', description: '修行分數突破 1,000 分，踏出溝通大師的第一步。', icon_url: 'Flame', condition_type: 'total_score', condition_value: 1000 },
  { id: 'ach2', title: '心智密碼解鎖者', description: '修行分數突破 2,500 分，深度解鎖大腦思考迴路。', icon_url: 'Sparkles', condition_type: 'total_score', condition_value: 2500 },
  { id: 'ach3', title: '卓越溝通大師', description: '修行分數突破 5,000 分，達到極佳的親和感建立境界。', icon_url: 'Trophy', condition_type: 'total_score', condition_value: 5000 },
  { id: 'ach4', title: '心流喚醒者', description: '修行分數突破 7,500 分，進入溝通與感知的高度心流狀態。', icon_url: 'Zap', condition_type: 'total_score', condition_value: 7500 },
  { id: 'ach5', title: '破繭智者', description: '修行分數突破 10,000 分，打破既有認知框架，洞悉大腦運作本質。', icon_url: 'Brain', condition_type: 'total_score', condition_value: 10000 },
  { id: 'ach6', title: '共鳴領航員', description: '修行分數突破 15,000 分，能與周遭人事產生強大共鳴與引導。', icon_url: 'Target', condition_type: 'total_score', condition_value: 15000 },
  { id: 'ach7', title: '無界幻遊使', description: '修行分數突破 20,000 分，超越空間與語言限制，達到無縫溝通。', icon_url: 'Infinity', condition_type: 'total_score', condition_value: 20000 },
  { id: 'ach8', title: '心智煉金術師', description: '修行分數突破 25,000 分，點石成金，將一切經驗轉化為成長養分。', icon_url: 'Gem', condition_type: 'total_score', condition_value: 25000 },
  { id: 'ach9', title: 'NLP 宗師', description: '修行分數突破 30,000 分，臻於化境，一代溝通宗師誕生。', icon_url: 'Crown', condition_type: 'total_score', condition_value: 30000 }
];

async function seed() {
  console.log('Seeding achievements using fetch...');
  const response = await fetch(`${supabaseUrl}/rest/v1/achievements`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(achievements)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error inserting achievements:', response.status, errorText);
  } else {
    console.log('Achievements successfully seeded:', achievements.length, 'records added or updated.');
  }
}

seed();

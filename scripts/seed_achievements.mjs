import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2];
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const achievements = [
  { id: 'ach1', title: 'NLP 初行者', description: '修行分數突破 1,000 分，踏出溝通大師的第一步。', icon_url: 'Flame', condition_type: 'total_score', condition_value: 1000 },
  { id: 'ach2', title: '心智密碼解鎖者', description: '修行分數突破 2,500 分，深度解鎖大腦思考迴路。', icon_url: 'Sparkles', condition_type: 'total_score', condition_value: 2500 },
  { id: 'ach3', title: '卓越溝通大師', description: '修行分數突破 5,000 分，達到極佳的親和感建立境界。', icon_url: 'Trophy', condition_type: 'total_score', condition_value: 5000 }
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

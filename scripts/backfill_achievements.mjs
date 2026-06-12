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

async function fetchAll(endpoint) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${endpoint}: ${await res.text()}`);
  return res.json();
}

async function backfill() {
  console.log('Fetching profiles and achievements...');
  const profiles = await fetchAll('profiles');
  const achievements = await fetchAll('achievements');
  
  const toInsert = [];
  
  for (const profile of profiles) {
    for (const ach of achievements) {
      if (ach.condition_type === 'total_score' && profile.score >= ach.condition_value) {
        toInsert.push({
          student_id: profile.id,
          achievement_id: ach.id,
          unlocked_at: new Date().toISOString()
        });
      }
    }
  }
  
  if (toInsert.length === 0) {
    console.log('No achievements to unlock.');
    return;
  }
  
  console.log(`Found ${toInsert.length} achievements to unlock. Inserting...`);
  
  const response = await fetch(`${supabaseUrl}/rest/v1/user_achievements`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(toInsert)
  });
  
  if (!response.ok) {
    console.error('Error inserting user_achievements:', response.status, await response.text());
  } else {
    console.log(`Successfully backfilled ${toInsert.length} user_achievements.`);
  }
}

backfill().catch(console.error);

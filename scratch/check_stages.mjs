import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const SUPABASE_URL = get('NEXT_PUBLIC_SUPABASE_URL');
const KEY = get('SUPABASE_SERVICE_ROLE_KEY') || get('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function checkStages() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/pet_stages?select=*`, { headers });
  const data = await res.json();
  const holyLion = data.find(s => s.stage_name === '聖獅皇');
  console.log('\n--- 聖獅皇 階段資料 ---');
  console.log(JSON.stringify(holyLion, null, 2));
}

checkStages().catch(console.error);

import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const SUPABASE_URL = get('NEXT_PUBLIC_SUPABASE_URL');
const KEY = get('SUPABASE_SERVICE_ROLE_KEY') || get('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function checkAdmin1() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.admin1`, { headers });
  const data = await res.json();
  console.log('\n--- admin1 Profile 資料 ---');
  console.log(JSON.stringify(data, null, 2));
}

checkAdmin1().catch(console.error);

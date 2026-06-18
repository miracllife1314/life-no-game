import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();

const SUPABASE_URL = get('NEXT_PUBLIC_SUPABASE_URL');
const ANON_KEY = get('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Missing Production connection details in .env.local!');
  process.exit(1);
}

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function test() {
  console.log('📡 Querying Production Database Profiles...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,name,role,status&limit=10`, { headers });
  const data = await res.json();
  console.log('Production Profiles (First 10):', data);
}

test().catch(console.error);

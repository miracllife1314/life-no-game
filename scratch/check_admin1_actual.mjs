import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();

const SUPABASE_URL = get('NEXT_PUBLIC_SUPABASE_URL_LOCAL') || get('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_KEY = get('SUPABASE_SERVICE_ROLE_KEY') || get('SUPABASE_SERVICE_ROLE_KEY_LOCAL');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing connection details!');
  process.exit(1);
}

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json'
};

async function check() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.admin1`, { headers });
  const data = await res.json();
  console.log('Actual Profile for admin1 in database:', data);
}

check().catch(console.error);

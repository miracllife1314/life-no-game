import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();

const SUPABASE_URL = get('NEXT_PUBLIC_SUPABASE_URL_LOCAL') || get('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_KEY = get('SUPABASE_SERVICE_ROLE_KEY') || get('SUPABASE_SERVICE_ROLE_KEY_LOCAL');

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json'
};

async function listUsers() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,name,role,phone,auth_user_id&limit=20`, { headers });
  const data = await res.json();
  console.log('List of first 20 profiles in DB:', data);
}

listUsers().catch(console.error);

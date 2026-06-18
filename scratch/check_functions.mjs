import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();

const SUPABASE_URL = get('NEXT_PUBLIC_SUPABASE_URL_LOCAL') || get('NEXT_PUBLIC_SUPABASE_URL');
const ANON_KEY = get('NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL') || get('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function testRpc(name, body = {}) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    console.log(`📞 RPC ${name} status: ${res.status}`);
    const text = await res.text();
    console.log(`   Response: ${text.slice(0, 200)}`);
  } catch (err) {
    console.log(`❌ RPC ${name} failed: ${err.message}`);
  }
}

async function run() {
  await testRpc('is_admin');
  await testRpc('is_captain_of', { student_id: 'student-yuting' });
  await testRpc('adjust_score', { p_student_id: 'student-yuting', p_amount: 0 });
}

run();

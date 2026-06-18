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

async function run() {
  console.log('📡 Fetching login token_hash from local API...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Evan', phone: '0920720355' })
  });
  
  const { token_hash } = await loginRes.json();
  console.log('🔑 Got token_hash:', token_hash);
  
  if (!token_hash) {
    console.error('❌ Failed to get token_hash!');
    return;
  }
  
  console.log('⚡ Verifying token_hash on Supabase GoTrue Auth...');
  const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      token_hash,
      type: 'email'
    })
  });
  
  console.log(`📞 Verify response status: ${verifyRes.status}`);
  const data = await verifyRes.json();
  
  if (verifyRes.ok) {
    console.log('✅ OTP verification successful!');
    console.log('👤 Logged in user ID:', data.user?.id);
    console.log('✉️ Logged in email:', data.user?.email);
    console.log('🎫 JWT Session access_token exists:', !!data.access_token);
  } else {
    console.error('❌ OTP verification failed:', data);
  }
}

run().catch(console.error);

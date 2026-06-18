import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();

const URL = get('NEXT_PUBLIC_SUPABASE_URL_LOCAL');
const ANON = get('NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL');

const u = { name: '林建良', phone: '0909244996' };

const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };

async function test() {
  console.log('1. Logging in via /api/auth/login...');
  let r = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: u.name, phone: u.phone })
  });
  console.log('Login status:', r.status);
  const loginRes = await j(r);
  console.log('Login response:', loginRes);

  if (!loginRes.token_hash) {
    console.error('No token_hash returned!');
    return;
  }

  console.log('2. Verifying token_hash on Supabase Auth...');
  r = await fetch(`${URL}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'email', token_hash: loginRes.token_hash })
  });
  console.log('Verify status:', r.status);
  const verifyRes = await j(r);
  console.log('Verify response:', verifyRes);
}

test().catch(console.error);

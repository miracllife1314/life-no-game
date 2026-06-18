import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const URL = get('NEXT_PUBLIC_SUPABASE_URL_LOCAL');
const ANON = get('NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL');
const SR = get('SUPABASE_SERVICE_ROLE_KEY_LOCAL');

const srH = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const aH = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const sr = (m, p, b) => fetch(`${URL}/rest/v1/${p}`, { method: m, headers: { ...srH, Prefer: 'return=representation' }, ...(b ? { body: JSON.stringify(b) } : {}) });
const scoreOf = async (id) => (await j(await sr('GET', `profiles?id=eq.${id}&select=score,role,status`)))?.[0];

async function main() {
  const admin = (await j(await sr('GET', 'profiles?role=eq.admin&select=name,phone&limit=1')))?.[0];
  const caps = await j(await sr('GET', 'profiles?role=eq.captain&team_id=not.is.null&select=name,phone,team_id'));
  let cap = null, stu = null;
  for (const c of (caps || [])) {
    const mates = await j(await sr('GET', `profiles?role=eq.student&team_id=eq.${c.team_id}&select=id,name,phone&limit=1`));
    if (mates?.[0]) { cap = c; stu = mates[0]; break; }
  }

  console.log('Selected Student:', stu);
  console.log('Selected Captain:', cap);

  const base0 = await scoreOf(stu.id);
  console.log('Initial base0:', base0);

  // 1. role test
  let r = await fetch(`${URL}/rest/v1/profiles?id=eq.${stu.id}`, { method: 'PATCH', headers: aH, body: JSON.stringify({ role: 'admin' }) });
  let now = await scoreOf(stu.id);
  console.log('1. role test status:', r.status, 'now:', now);

  // 2. score test
  r = await fetch(`${URL}/rest/v1/profiles?id=eq.${stu.id}`, { method: 'PATCH', headers: aH, body: JSON.stringify({ score: 99999 }) });
  now = await scoreOf(stu.id);
  console.log('2. score test status:', r.status, 'now:', now);

  // 3. adjust_score test
  r = await fetch(`${URL}/rest/v1/rpc/adjust_score`, { method: 'POST', headers: aH, body: JSON.stringify({ p_student_id: stu.id, p_amount: 500, p_reason: 'x', p_created_by: stu.id }) });
  now = await scoreOf(stu.id);
  console.log('3. adjust_score test status:', r.status, 'now:', now);
  console.log('Assertion: r.status >= 400 is', r.status >= 400, 'now.score === base0.score is', now.score === base0.score);
}

main().catch(console.error);

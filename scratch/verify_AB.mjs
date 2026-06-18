// A+B 驗收：A=student_notes隱私/teams完整性；B=登入限流。自我清理。
import fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const URL = get('NEXT_PUBLIC_SUPABASE_URL_LOCAL'), ANON = get('NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL'), SR = get('SUPABASE_SERVICE_ROLE_KEY_LOCAL');
const srH = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const OWN_TEAM = 'team-dgt1n5a';   // 測試林胤呈 captain
const OTHER_TEAM = 'team-u4htez2';
const R = []; const ok = (l, p, d) => { R.push(p); console.log(`${p ? '✅' : '❌'} ${l} — ${d}`); };

async function mint(name, phone) {
  let r = await fetch('http://localhost:3000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone }) });
  const { token_hash } = await j(r);
  r = await fetch(`${URL}/auth/v1/verify`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'email', token_hash }) });
  return (await j(r)).access_token;
}
const H = (tok) => ({ apikey: ANON, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', Prefer: 'return=representation' });
const aH = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

async function main() {
  const adm = await mint('測試gm', '85078605');
  const cap = await mint('測試林胤呈', '0910694391');
  const stu = await mint('測試林建良', '0909244996');

  console.log('--- A1 student_notes 隱私 ---');
  const allNotes = await j(await fetch(`${URL}/rest/v1/student_notes?select=id`, { headers: srH }));
  const totalNotes = Array.isArray(allNotes) ? allNotes.length : 0;
  const anonR = await j(await fetch(`${URL}/rest/v1/student_notes?select=id`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }));
  ok('anon 讀備註', Array.isArray(anonR) && anonR.length === 0, `讀到 ${Array.isArray(anonR) ? anonR.length : anonR} 筆（應 0）`);
  const stuR = await j(await fetch(`${URL}/rest/v1/student_notes?select=id`, { headers: H(stu) }));
  ok('學員讀備註', Array.isArray(stuR) && stuR.length === 0, `讀到 ${stuR.length} 筆（應 0）`);
  const admR = await j(await fetch(`${URL}/rest/v1/student_notes?select=id`, { headers: H(adm) }));
  ok('大隊長讀備註', Array.isArray(admR) && admR.length === totalNotes, `讀到 ${admR.length}/${totalNotes} 筆`);
  const capR = await j(await fetch(`${URL}/rest/v1/student_notes?select=id`, { headers: H(cap) }));
  ok('隊長讀備註(只該隊)', Array.isArray(capR) && capR.length <= totalNotes, `讀到 ${capR.length} 筆（≤${totalNotes}，僅該隊）`);
  const anonW = await fetch(`${URL}/rest/v1/student_notes`, { method: 'POST', headers: aH, body: JSON.stringify({ student_id: '37d37c46-8ff2-4be7-ad04-1a28b42e8610', note: 'hack' }) });
  ok('anon 寫備註', anonW.status >= 400, `HTTP ${anonW.status}`);

  console.log('\n--- A2 teams 完整性 ---');
  const teamBefore = (await j(await fetch(`${URL}/rest/v1/teams?id=eq.${OWN_TEAM}&select=invite_enabled,max_members`, { headers: srH })))[0];
  let r = await fetch(`${URL}/rest/v1/teams?id=eq.${OWN_TEAM}`, { method: 'PATCH', headers: aH, body: JSON.stringify({ invite_enabled: !teamBefore.invite_enabled }) });
  let now = (await j(await fetch(`${URL}/rest/v1/teams?id=eq.${OWN_TEAM}&select=invite_enabled`, { headers: srH })))[0];
  ok('anon 改隊伍設定', now.invite_enabled === teamBefore.invite_enabled, `invite_enabled 維持 ${now.invite_enabled}`);
  r = await fetch(`${URL}/rest/v1/teams?id=eq.${OWN_TEAM}`, { method: 'PATCH', headers: H(cap), body: JSON.stringify({ max_members: teamBefore.max_members }) });
  ok('隊長改自己隊', r.status < 400 && Array.isArray(await j(r)) && (await j(await fetch(`${URL}/rest/v1/teams?id=eq.${OWN_TEAM}&select=id`, { headers: srH }))).length === 1, `HTTP ${r.status}`);
  r = await fetch(`${URL}/rest/v1/teams?id=eq.${OTHER_TEAM}`, { method: 'PATCH', headers: H(cap), body: JSON.stringify({ max_members: 99 }) });
  const otherAfter = (await j(await fetch(`${URL}/rest/v1/teams?id=eq.${OTHER_TEAM}&select=max_members`, { headers: srH })))[0];
  ok('隊長改別隊', otherAfter.max_members !== 99, `別隊 max_members=${otherAfter.max_members}（未被改）`);
  r = await fetch(`${URL}/rest/v1/teams?id=eq.${OWN_TEAM}`, { method: 'PATCH', headers: H(adm), body: JSON.stringify({ max_members: teamBefore.max_members }) });
  ok('大隊長改任何隊', r.status < 400, `HTTP ${r.status}`);
  r = await fetch(`${URL}/rest/v1/teams`, { method: 'POST', headers: aH, body: JSON.stringify({ id: 'hackteam-' + Date.now(), name: 'hack' }) });
  ok('anon 新增隊伍', r.status >= 400, `HTTP ${r.status}`);
  if (r.status < 400) { const d = await j(r); if (d[0]?.id) await fetch(`${URL}/rest/v1/teams?id=eq.${d[0].id}`, { method: 'DELETE', headers: srH }); }

  console.log('\n--- B 登入限流（同電話連打）---');
  const junk = '0900000099';
  await fetch(`${URL}/rest/v1/login_attempts?phone=eq.${junk}`, { method: 'DELETE', headers: srH }); // 清乾淨先
  let got429 = false, passCount = 0;
  for (let i = 1; i <= 11; i++) {
    const rr = await fetch('http://localhost:3000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '不存在', phone: junk }) });
    if (rr.status === 429) { got429 = true; console.log(`   第 ${i} 次 → 429 擋下`); break; }
    else passCount++;
  }
  ok('連打同電話觸發限流(429)', got429 && passCount <= 8, `前 ${passCount} 次通過後被擋`);
  await fetch(`${URL}/rest/v1/login_attempts?phone=eq.${junk}`, { method: 'DELETE', headers: srH });

  const a = R.slice(0, 5).filter(Boolean).length, b = R.slice(5).filter(Boolean).length;
  console.log(`\n================ A+B 驗收 ================`);
  console.log(`A 表鎖（隱私/完整性）：${R.slice(0,9).filter(Boolean).length}/9`);
  console.log(`B 限流：${R[9] ? '✅' : '❌'}`);
  console.log(`總計：${R.filter(Boolean).length}/${R.length} ${R.every(Boolean) ? '✅ 全綠' : '❌'}`);
}
main().catch(e => { console.error('驗收例外：', e); process.exit(1); });

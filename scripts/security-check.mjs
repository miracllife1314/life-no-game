// =====================================================================
// 一鍵安全自檢：npm run security-check
//
//   驗證「F12 攻擊全擋 + 三身分功能正常 + 隱私/完整性鎖 + 登入限流」是否仍成立。
//   - 自動探測測試帳號（不寫死名字 → 改名也不會壞）。
//   - 只連「測試庫」；偵測到正式庫會直接中止（保護正式資料）。
//   - 自我清理；全綠 exit 0，有破口 exit 1。
//
//   前置：先 `npm run dev`（讓 /api/auth/login 路由可用）。
//   用法：npm run security-check            （預設找 localhost:3000 / 3001）
//         npm run security-check -- http://localhost:3001
// =====================================================================
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const URL = get('NEXT_PUBLIC_SUPABASE_URL_LOCAL');
const ANON = get('NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL');
const SR = get('SUPABASE_SERVICE_ROLE_KEY_LOCAL');

// ---- 安全閘：只能跑測試庫 ----
const PROD_HOST = 'epolsiukauqfwxmjojia';
if (!URL || !ANON || !SR) { console.error('❌ 缺少 _LOCAL 連線變數（本工具只跑測試庫）。'); process.exit(1); }
if (URL.includes(PROD_HOST)) { console.error('🛑 偵測到正式庫，已中止（本工具只能跑測試庫）。'); process.exit(1); }

const srH = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const aH = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const sr = (m, p, b) => fetch(`${URL}/rest/v1/${p}`, { method: m, headers: { ...srH, Prefer: 'return=representation' }, ...(b ? { body: JSON.stringify(b) } : {}) });
const userH = (tok) => ({ apikey: ANON, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', Prefer: 'return=representation' });

const results = [];
const check = (label, pass, detail) => { results.push({ label, pass }); console.log(`  ${pass ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`); };

// ---- 找 dev server ----
async function findApp(argUrl) {
  const cands = argUrl ? [argUrl] : ['http://localhost:3000', 'http://localhost:3001'];
  for (const base of cands) {
    try { const r = await fetch(base, { method: 'GET' }); if (r.status) return base; } catch {}
  }
  return null;
}

async function mint(base, name, phone) {
  let r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone }) });
  if (r.status !== 200) return null;
  const { token_hash } = await j(r);
  if (!token_hash) return null;
  r = await fetch(`${URL}/auth/v1/verify`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'email', token_hash }) });
  const d = await j(r);
  return d.access_token || null;
}

const scoreOf = async (id) => (await j(await sr('GET', `profiles?id=eq.${id}&select=score,role,status`)))?.[0];

async function cleanSubs(studentId, missionId) {
  const subs = await j(await sr('GET', `submissions?student_id=eq.${studentId}&mission_id=eq.${missionId}&select=id`));
  for (const s of (subs || [])) {
    await sr('PATCH', `submissions?id=eq.${s.id}`, { score_awarded: 0 });
    await sr('DELETE', `submissions?id=eq.${s.id}`);
    await sr('DELETE', `score_logs?submission_id=eq.${s.id}`);
  }
}

async function main() {
  console.log('🔒 安全自檢 — 測試庫', URL, '\n');
  const base = await findApp(process.argv[2]);
  if (!base) { console.error('❌ 找不到 dev server（請先 npm run dev）。'); process.exit(1); }
  console.log('   App:', base);

  // 清限流，避免自檢被自己擋
  await fetch(`${URL}/rest/v1/login_attempts?id=gt.0`, { method: 'DELETE', headers: srH }).catch(() => {});

  // ---- 自動探測帳號 ----
  const admin = (await j(await sr('GET', 'profiles?role=eq.admin&select=name,phone&limit=1')))?.[0];
  const caps = await j(await sr('GET', 'profiles?role=eq.captain&team_id=not.is.null&select=name,phone,team_id'));
  let cap = null, stu = null;
  for (const c of (caps || [])) {
    const mates = await j(await sr('GET', `profiles?role=eq.student&team_id=eq.${c.team_id}&select=id,name,phone&limit=1`));
    if (mates?.[0]) { cap = c; stu = mates[0]; break; }
  }
  const autoM = (await j(await sr('GET', 'missions?review_type=eq.auto&points=gt.0&select=id,points&limit=1')))?.[0];
  const apprM = (await j(await sr('GET', 'missions?review_type=neq.auto&points=gt.0&select=id&limit=1')))?.[0];
  if (!admin || !cap || !stu || !autoM || !apprM) { console.error('❌ 探測測試資料失敗（需要 admin / captain+隊員 / auto任務 / 審核任務）。'); process.exit(1); }

  // ===== PART 1：F12 攻擊（anon，全擋）=====
  console.log('\n【1】F12 攻擊（anon，應全擋）');
  const base0 = await scoreOf(stu.id);
  let r = await fetch(`${URL}/rest/v1/profiles?id=eq.${stu.id}`, { method: 'PATCH', headers: aH, body: JSON.stringify({ role: 'admin' }) });
  let now = await scoreOf(stu.id);
  check('改 role→admin 被擋', now.role !== 'admin'); if (now.role === 'admin') await sr('PATCH', `profiles?id=eq.${stu.id}`, { role: base0.role });
  r = await fetch(`${URL}/rest/v1/profiles?id=eq.${stu.id}`, { method: 'PATCH', headers: aH, body: JSON.stringify({ score: 99999 }) });
  now = await scoreOf(stu.id);
  check('改 score 被擋', now.score === base0.score); if (now.score !== base0.score) await sr('PATCH', `profiles?id=eq.${stu.id}`, { score: base0.score });
  r = await fetch(`${URL}/rest/v1/profiles?id=eq.${stu.id}`, { method: 'DELETE', headers: aH });
  check('匿名刪學員 被擋', !!(await scoreOf(stu.id)));
  r = await fetch(`${URL}/rest/v1/submissions`, { method: 'POST', headers: aH, body: JSON.stringify({ mission_id: apprM.id, student_id: stu.id, status: 'approved', score_awarded: 9999 }) });
  check('偽造 approved 被擋', r.status >= 400); if (r.status < 400) { const d = await j(r); if (d[0]?.id) await sr('DELETE', `submissions?id=eq.${d[0].id}`); }
  r = await fetch(`${URL}/rest/v1/score_logs`, { method: 'POST', headers: aH, body: JSON.stringify({ student_id: stu.id, amount: 9999, reason: 'x', created_by: stu.id }) });
  check('直寫 score_logs 被擋', r.status >= 400);
  r = await fetch(`${URL}/rest/v1/rpc/adjust_score`, { method: 'POST', headers: aH, body: JSON.stringify({ p_student_id: stu.id, p_amount: 500, p_reason: 'x', p_created_by: stu.id }) });
  now = await scoreOf(stu.id);
  check('匿名 adjust_score 被擋', r.status >= 400 && now.score === base0.score); if (now.score !== base0.score) await sr('PATCH', `profiles?id=eq.${stu.id}`, { score: base0.score });

  // ===== PART 2：功能（真實身分）=====
  console.log('\n【2】功能（學員 / 大隊長 / 隊長）');
  const stuTok = await mint(base, stu.name, stu.phone);
  const admTok = await mint(base, admin.name, admin.phone);
  const capTok = await mint(base, cap.name, cap.phone);
  if (!stuTok || !admTok || !capTok) { check('三身分登入', false, '有帳號登入失敗'); }
  else {
    const sH = userH(stuTok), adH = userH(admTok), cH = userH(capTok);
    // 學員打卡（auto → approved + 分數）
    await cleanSubs(stu.id, autoM.id);
    const s1 = (await scoreOf(stu.id)).score;
    r = await fetch(`${URL}/rest/v1/submissions`, { method: 'POST', headers: sH, body: JSON.stringify({ mission_id: autoM.id, student_id: stu.id, status: 'pending', score_awarded: 0 }) });
    const ins = await j(r);
    check('學員自動打卡加分', r.status < 400 && ins[0]?.status === 'approved' && (await scoreOf(stu.id)).score === s1 + autoM.points);
    await cleanSubs(stu.id, autoM.id);
    // 學員偽造 → 被消毒
    await cleanSubs(stu.id, apprM.id);
    const s2 = (await scoreOf(stu.id)).score;
    r = await fetch(`${URL}/rest/v1/submissions`, { method: 'POST', headers: sH, body: JSON.stringify({ mission_id: apprM.id, student_id: stu.id, status: 'approved', score_awarded: 9999 }) });
    const ins2 = await j(r);
    check('學員偽造打卡被消毒', ins2[0]?.status === 'pending' && ins2[0]?.score_awarded === 0 && (await scoreOf(stu.id)).score === s2);
    const pendId = ins2[0]?.id;
    // 學員改自己分數 → 擋
    r = await fetch(`${URL}/rest/v1/profiles?id=eq.${stu.id}`, { method: 'PATCH', headers: sH, body: JSON.stringify({ score: 88888 }) });
    check('學員改自己分數被擋', (await scoreOf(stu.id)).score !== 88888);
    // 學員讀排行榜/見證牆
    const pr = await j(await fetch(`${URL}/rest/v1/profiles?select=id&limit=3`, { headers: sH }));
    check('學員讀排行榜/見證牆', Array.isArray(pr) && pr.length > 0);
    // 大隊長調分
    const a1 = (await scoreOf(stu.id)).score;
    r = await fetch(`${URL}/rest/v1/rpc/adjust_score`, { method: 'POST', headers: adH, body: JSON.stringify({ p_student_id: stu.id, p_amount: 10, p_reason: 'selfcheck', p_created_by: stu.id }) });
    check('大隊長手動調分', r.status < 400 && (await scoreOf(stu.id)).score === a1 + 10);
    await fetch(`${URL}/rest/v1/rpc/adjust_score`, { method: 'POST', headers: adH, body: JSON.stringify({ p_student_id: stu.id, p_amount: -10, p_reason: 'selfcheck', p_created_by: stu.id }) });
    // 隊長審核 pending
    if (pendId) {
      const c1 = (await scoreOf(stu.id)).score;
      r = await fetch(`${URL}/rest/v1/submissions?id=eq.${pendId}`, { method: 'PATCH', headers: cH, body: JSON.stringify({ status: 'approved', score_awarded: 300, reviewed_by: stu.id }) });
      check('隊長審核通過加分', r.status < 400 && (await scoreOf(stu.id)).score > c1);
    } else check('隊長審核通過加分', false, '無 pending');
    await cleanSubs(stu.id, apprM.id);
  }

  // ===== PART 3：隱私/完整性鎖 + 限流 =====
  console.log('\n【3】隱私/完整性 + 登入限流');
  const an = await j(await fetch(`${URL}/rest/v1/student_notes?select=id`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }));
  check('anon 讀不到 student_notes', Array.isArray(an) && an.length === 0);
  r = await fetch(`${URL}/rest/v1/student_notes`, { method: 'POST', headers: aH, body: JSON.stringify({ student_id: stu.id, note: 'x' }) });
  check('anon 寫不了 student_notes', r.status >= 400); if (r.status < 400) { const d = await j(r); if (d[0]?.id) await sr('DELETE', `student_notes?id=eq.${d[0].id}`); }
  const tn = (await j(await sr('GET', `teams?id=eq.${cap.team_id}&select=name`)))[0].name;
  await fetch(`${URL}/rest/v1/teams?id=eq.${cap.team_id}`, { method: 'PATCH', headers: aH, body: JSON.stringify({ name: 'hack' }) });
  const tn2 = (await j(await sr('GET', `teams?id=eq.${cap.team_id}&select=name`)))[0].name;
  check('anon 改不了 teams', tn2 === tn); if (tn2 !== tn) await sr('PATCH', `teams?id=eq.${cap.team_id}`, { name: tn });
  // 限流：同電話連打
  const junk = '0900000099';
  await fetch(`${URL}/rest/v1/login_attempts?phone=eq.${junk}`, { method: 'DELETE', headers: srH });
  let blocked = false;
  for (let i = 1; i <= 11; i++) {
    const rr = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'x', phone: junk }) });
    if (rr.status === 429) { blocked = true; break; }
  }
  check('登入速率限制(429)', blocked);
  await fetch(`${URL}/rest/v1/login_attempts?phone=eq.${junk}`, { method: 'DELETE', headers: srH });

  // 收尾還原 + 清限流
  await sr('PATCH', `profiles?id=eq.${stu.id}`, { score: base0.score, role: base0.role });
  await fetch(`${URL}/rest/v1/login_attempts?id=gt.0`, { method: 'DELETE', headers: srH }).catch(() => {});

  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  console.log(`\n================ 結果：${passed}/${total} ================`);
  if (passed === total) { console.log('✅ 全部通過，安全狀態正常。'); process.exit(0); }
  else { console.log('❌ 有項目失敗：'); results.filter(r => !r.pass).forEach(r => console.log('   - ' + r.label)); process.exit(1); }
}
main().catch(e => { console.error('自檢例外：', e); process.exit(1); });

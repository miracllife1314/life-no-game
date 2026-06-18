// 階段2 通電後完整驗收：Part1 攻擊應全擋、Part2 三身分功能應全正常。自我清理。
import fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const URL = get('NEXT_PUBLIC_SUPABASE_URL_LOCAL');
const ANON = get('NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL');
const SR = get('SUPABASE_SERVICE_ROLE_KEY_LOCAL');

const STU = { name: '測試林建良', phone: '0909244996', id: '37d37c46-8ff2-4be7-ad04-1a28b42e8610' };
const ADMIN = { name: '測試GM01', phone: '53780976' };
const CAP = { name: '測試林胤呈', phone: '0910694391' };
const AUTO_M = 'e63fda6c-ec9a-4557-9feb-177f2fc2ff6f';   // 50分 auto
const APPR_M = 'a71f4c02-93d7-4b56-b24b-42321bd61c88';   // 300分 需審核

const srH = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const sr = (m, p, b) => fetch(`${URL}/rest/v1/${p}`, { method: m, headers: { ...srH, Prefer: 'return=representation' }, ...(b ? { body: JSON.stringify(b) } : {}) });
const scoreOf = async (id) => (await j(await fetch(`${URL}/rest/v1/profiles?id=eq.${id}&select=score,role,status`, { headers: srH })))[0];

async function mint(u) {
  let r = await fetch('http://localhost:3000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: u.name, phone: u.phone }) });
  const { token_hash } = await j(r);
  r = await fetch(`${URL}/auth/v1/verify`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'email', token_hash }) });
  const d = await j(r);
  return d.access_token;
}
const asUser = (tok) => ({ apikey: ANON, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', Prefer: 'return=representation' });
const call = (h, m, p, b) => fetch(`${URL}/rest/v1/${p}`, { method: m, headers: h, ...(b ? { body: JSON.stringify(b) } : {}) });

const R = [];
const ok = (label, pass, detail) => { R.push(pass); console.log(`${pass ? '✅' : '❌'} ${label} — ${detail}`); };

async function cleanSubs(studentId, missionId) {
  // 用 SR 清掉該學員該任務的所有 submission（連帶 trigger 退分），再清殘留 log
  const subs = await j(await fetch(`${URL}/rest/v1/submissions?student_id=eq.${studentId}&mission_id=eq.${missionId}&select=id`, { headers: srH }));
  for (const s of (subs || [])) {
    await sr('PATCH', `submissions?id=eq.${s.id}`, { score_awarded: 0 }); // 先歸零避免退分殘留
    await sr('DELETE', `submissions?id=eq.${s.id}`);
    await sr('DELETE', `score_logs?submission_id=eq.${s.id}`);
  }
}

async function main() {
  console.log('📡', URL);
  const base = await scoreOf(STU.id);
  console.log(`🎯 ${STU.name} 基準 score=${base.score} role=${base.role}\n`);

  // ============ PART 1：攻擊（anon，應全擋）============
  console.log('--- PART 1：F12 攻擊（anon key，應全部被擋）---');
  const aH = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

  let r = await call(aH, 'PATCH', `profiles?id=eq.${STU.id}`, { role: 'admin' });
  let now = await scoreOf(STU.id);
  ok('A 竄改 role→admin', now.role !== 'admin', `role=${now.role} (HTTP ${r.status})`);

  r = await call(aH, 'PATCH', `profiles?id=eq.${STU.id}`, { score: 99999 });
  now = await scoreOf(STU.id);
  ok('B 竄改 score→99999', now.score === base.score, `score=${now.score} (HTTP ${r.status})`);

  r = await call(aH, 'DELETE', `profiles?id=eq.${STU.id}`);
  now = await scoreOf(STU.id);
  ok('C 匿名刪除學員', !!now, `學員仍存在=${!!now} (HTTP ${r.status})`);

  r = await call(aH, 'POST', 'submissions', { mission_id: APPR_M, student_id: STU.id, proof_text: 'x', status: 'approved', score_awarded: 9999 });
  ok('D 偽造 approved 灌分', r.status >= 400, `HTTP ${r.status}`);
  if (r.status < 400) { const d = await j(r); if (d[0]?.id) await sr('DELETE', `submissions?id=eq.${d[0].id}`); }

  r = await call(aH, 'POST', 'score_logs', { student_id: STU.id, amount: 10000, reason: 'hack', created_by: STU.id });
  ok('E 直接寫 score_logs', r.status >= 400, `HTTP ${r.status}`);

  r = await call(aH, 'POST', 'rpc/adjust_score', { p_student_id: STU.id, p_amount: 500, p_reason: 'hack', p_created_by: STU.id });
  now = await scoreOf(STU.id);
  ok('F 匿名呼叫 adjust_score', r.status >= 400 && now.score === base.score, `HTTP ${r.status} score=${now.score}`);

  // ============ PART 2：功能（真實身分，應全正常）============
  console.log('\n--- PART 2：功能（真實登入身分）---');
  const stuTok = await mint(STU), adminTok = await mint(ADMIN), capTok = await mint(CAP);
  const sH = asUser(stuTok), adH = asUser(adminTok), cH = asUser(capTok);

  // S1 學員自動打卡 → 應 approved+50、分數+50
  await cleanSubs(STU.id, AUTO_M);
  const s1base = (await scoreOf(STU.id)).score;
  r = await call(sH, 'POST', 'submissions', { mission_id: AUTO_M, student_id: STU.id, proof_text: '打卡', status: 'pending', score_awarded: 0 });
  let ins = await j(r);
  let after = (await scoreOf(STU.id)).score;
  ok('S1 學員自動打卡加分', r.status < 400 && ins[0]?.status === 'approved' && ins[0]?.score_awarded === 50 && after === s1base + 50, `status=${ins[0]?.status} score_awarded=${ins[0]?.score_awarded} 分數 ${s1base}→${after}`);
  await cleanSubs(STU.id, AUTO_M);

  // S2 學員偽造 approved 高分 → 被消毒成 pending/0、分數不變
  await cleanSubs(STU.id, APPR_M);
  const s2base = (await scoreOf(STU.id)).score;
  r = await call(sH, 'POST', 'submissions', { mission_id: APPR_M, student_id: STU.id, proof_text: '偽造', status: 'approved', score_awarded: 9999 });
  ins = await j(r);
  after = (await scoreOf(STU.id)).score;
  ok('S2 學員偽造打卡被消毒', ins[0]?.status === 'pending' && ins[0]?.score_awarded === 0 && after === s2base, `status=${ins[0]?.status} score_awarded=${ins[0]?.score_awarded} 分數 ${s2base}→${after}`);
  // 留著這筆 pending 給 C1 審核用
  const pendingSubId = ins[0]?.id;

  // S3 學員竄改自己分數 → 被擋
  r = await call(sH, 'PATCH', `profiles?id=eq.${STU.id}`, { score: 88888 });
  after = (await scoreOf(STU.id)).score;
  ok('S3 學員改自己分數被擋', after !== 88888, `score=${after} (HTTP ${r.status})`);

  // S4 學員讀取排行榜/見證牆
  const pr = await call(sH, 'GET', 'profiles?select=id&limit=5');
  const wr = await call(sH, 'GET', 'submissions?select=id&limit=5');
  const pc = (await j(pr)), wc = (await j(wr));
  ok('S4 學員讀排行榜/見證牆', pr.status === 200 && Array.isArray(pc) && pc.length > 0 && wr.status === 200 && Array.isArray(wc) && wc.length > 0, `profiles=${pc.length} submissions=${wc.length}`);

  // A1 大隊長 adjust_score → 正常
  const a1base = (await scoreOf(STU.id)).score;
  r = await call(adH, 'POST', 'rpc/adjust_score', { p_student_id: STU.id, p_amount: 50, p_reason: '測試調分', p_created_by: STU.id });
  after = (await scoreOf(STU.id)).score;
  ok('A1 大隊長手動調分', r.status < 400 && after === a1base + 50, `HTTP ${r.status} 分數 ${a1base}→${after}`);
  await call(adH, 'POST', 'rpc/adjust_score', { p_student_id: STU.id, p_amount: -50, p_reason: '還原', p_created_by: STU.id });

  // A2 大隊長改學員狀態（敏感欄位）→ 正常
  r = await call(adH, 'PATCH', `profiles?id=eq.${STU.id}`, { status: 'active' });
  ok('A2 大隊長改學員資料', r.status < 400 && Array.isArray(await j(r)), `HTTP ${r.status}`);

  // C1 隊長審核通過 S2 的 pending → 應加 300
  if (pendingSubId) {
    const c1base = (await scoreOf(STU.id)).score;
    r = await call(cH, 'PATCH', `submissions?id=eq.${pendingSubId}`, { status: 'approved', score_awarded: 300, reviewed_by: STU.id, reviewed_at: new Date(0).toISOString() });
    after = (await scoreOf(STU.id)).score;
    ok('C1 隊長審核通過加分', r.status < 400 && after === c1base + 300, `HTTP ${r.status} 分數 ${c1base}→${after}`);
  } else ok('C1 隊長審核通過加分', false, '無 pending 可測');
  await cleanSubs(STU.id, APPR_M);

  // 還原確認
  const fin = await scoreOf(STU.id);
  console.log(`\n🎯 測試後 ${STU.name} score=${fin.score} role=${fin.role}（基準 ${base.score}/${base.role}）`);
  // 還原 role（若被攻擊 A 改掉——理論上沒有）
  if (fin.role !== base.role) await sr('PATCH', `profiles?id=eq.${STU.id}`, { role: base.role });

  const attacks = R.slice(0, 6).filter(Boolean).length;
  const funcs = R.slice(6).filter(Boolean).length;
  console.log(`\n================ 階段2 驗收 ================`);
  console.log(`攻擊被擋：${attacks}/6 ${attacks === 6 ? '✅' : '❌'}`);
  console.log(`功能正常：${funcs}/${R.length - 6} ${funcs === R.length - 6 ? '✅' : '❌'}`);
}
main().catch(e => { console.error('驗收例外：', e); process.exit(1); });

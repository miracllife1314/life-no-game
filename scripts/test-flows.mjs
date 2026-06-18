// =====================================================================
// 功能流程驗證：node scripts/test-flows.mjs
//
//   對應使用者要驗的 5 件事，對「測試庫」實際跑一遍 DB 流程並驗證結果：
//     1. 學員免審核打卡 → approved + 加分
//     2. 學員需審核打卡 → pending + 不加分
//     3. 隊長審核：通過加分 / 退回不加分
//     4. 神獸進化 → 階段(stage)推進
//     5. 後台期數/人事：新增→修改→刪除
//   只連測試庫；用真實身分(token)走 RLS；自我清理；全綠 exit 0。
//   前置：先 npm run dev。
// =====================================================================
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const URL = get('NEXT_PUBLIC_SUPABASE_URL_LOCAL');
const ANON = get('NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL');
const SR = get('SUPABASE_SERVICE_ROLE_KEY_LOCAL');

const PROD_HOST = 'epolsiukauqfwxmjojia';
if (!URL || !ANON || !SR) { console.error('❌ 缺少 _LOCAL 連線變數（本工具只跑測試庫）。'); process.exit(1); }
if (URL.includes(PROD_HOST)) { console.error('🛑 偵測到正式庫，已中止。'); process.exit(1); }

const srH = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const sr = (m, p, b) => fetch(`${URL}/rest/v1/${p}`, { method: m, headers: { ...srH, Prefer: 'return=representation' }, ...(b ? { body: JSON.stringify(b) } : {}) });
const userH = (tok) => ({ apikey: ANON, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', Prefer: 'return=representation' });

const results = [];
const check = (label, pass, detail) => { results.push({ label, pass }); console.log(`  ${pass ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`); };

async function findApp(argUrl) {
  const cands = argUrl ? [argUrl] : ['http://localhost:3000', 'http://localhost:3001'];
  for (const base of cands) { try { const r = await fetch(base); if (r.status) return base; } catch {} }
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
  console.log('🧪 功能流程驗證 — 測試庫', URL, '\n');
  const base = await findApp(process.argv[2]);
  if (!base) { console.error('❌ 找不到 dev server（請先 npm run dev）。'); process.exit(1); }
  await fetch(`${URL}/rest/v1/login_attempts?id=gt.0`, { method: 'DELETE', headers: srH }).catch(() => {});

  // ---- 探測帳號 + 任務 ----
  const admin = (await j(await sr('GET', 'profiles?role=eq.admin&select=id,name,phone&limit=1')))?.[0];
  const caps = await j(await sr('GET', 'profiles?role=eq.captain&team_id=not.is.null&select=id,name,phone,team_id'));
  let cap = null, stu = null;
  for (const c of (caps || [])) {
    const mates = await j(await sr('GET', `profiles?role=eq.student&team_id=eq.${c.team_id}&select=id,name,phone&limit=1`));
    if (mates?.[0]) { cap = c; stu = mates[0]; break; }
  }
  const autoM = (await j(await sr('GET', 'missions?review_type=eq.auto&points=gt.0&select=id,points&limit=1')))?.[0];
  const apprM = (await j(await sr('GET', 'missions?review_type=neq.auto&points=gt.0&select=id,points&limit=1')))?.[0];
  if (!admin || !cap || !stu || !autoM || !apprM) { console.error('❌ 探測測試資料失敗。'); process.exit(1); }

  const stuTok = await mint(base, stu.name, stu.phone);
  const admTok = await mint(base, admin.name, admin.phone);
  const capTok = await mint(base, cap.name, cap.phone);
  if (!stuTok || !admTok || !capTok) { console.error('❌ 登入失敗，無法測試。'); process.exit(1); }
  const sH = userH(stuTok), adH = userH(admTok), cH = userH(capTok);
  const base0 = await scoreOf(stu.id);

  // ===== 1. 學員免審核打卡 =====
  console.log('\n【1】學員免審核打卡（auto）');
  await cleanSubs(stu.id, autoM.id);
  const s1 = (await scoreOf(stu.id)).score;
  let r = await fetch(`${URL}/rest/v1/submissions`, { method: 'POST', headers: sH, body: JSON.stringify({ mission_id: autoM.id, student_id: stu.id, status: 'pending', score_awarded: 0 }) });
  let ins = await j(r);
  const after1 = (await scoreOf(stu.id)).score;
  check('打卡後自動 approved', r.status < 400 && ins[0]?.status === 'approved');
  check(`分數 +${autoM.points}（= 排行榜更新）`, after1 === s1 + autoM.points, `${s1}→${after1}`);
  await cleanSubs(stu.id, autoM.id);

  // ===== 2. 學員需審核打卡 =====
  console.log('\n【2】學員需審核打卡（approval）');
  await cleanSubs(stu.id, apprM.id);
  const s2 = (await scoreOf(stu.id)).score;
  r = await fetch(`${URL}/rest/v1/submissions`, { method: 'POST', headers: sH, body: JSON.stringify({ mission_id: apprM.id, student_id: stu.id, status: 'pending', score_awarded: 0 }) });
  ins = await j(r);
  const pendId = ins[0]?.id;
  check('狀態為 pending(等待審核)', ins[0]?.status === 'pending');
  check('送出時不先加分', (await scoreOf(stu.id)).score === s2, `分數維持 ${s2}`);

  // ===== 3. 隊長審核 =====
  console.log('\n【3】隊長審核');
  if (pendId) {
    const c1 = (await scoreOf(stu.id)).score;
    r = await fetch(`${URL}/rest/v1/submissions?id=eq.${pendId}`, { method: 'PATCH', headers: cH, body: JSON.stringify({ status: 'approved', score_awarded: apprM.points, reviewed_by: cap.id }) });
    const c2 = (await scoreOf(stu.id)).score;
    check(`審核通過 → 加分 +${apprM.points}`, r.status < 400 && c2 === c1 + apprM.points, `${c1}→${c2}`);
  } else check('審核通過 → 加分', false, '無 pending 可審');
  await cleanSubs(stu.id, apprM.id);
  // 退回不加分：新開一筆 pending，退回後分數不變
  const s3 = (await scoreOf(stu.id)).score;
  r = await fetch(`${URL}/rest/v1/submissions`, { method: 'POST', headers: sH, body: JSON.stringify({ mission_id: apprM.id, student_id: stu.id, status: 'pending', score_awarded: 0 }) });
  const pend2 = (await j(r))[0]?.id;
  if (pend2) {
    await fetch(`${URL}/rest/v1/submissions?id=eq.${pend2}`, { method: 'PATCH', headers: cH, body: JSON.stringify({ status: 'rejected', score_awarded: 0, reviewed_by: cap.id }) });
    check('審核退回 → 不加分', (await scoreOf(stu.id)).score === s3, `分數維持 ${s3}`);
  } else check('審核退回 → 不加分', false, '建立 pending 失敗');
  await cleanSubs(stu.id, apprM.id);

  // ===== 4. 神獸進化 =====
  console.log('\n【4】神獸進化（stage 推進）');
  let pet = (await j(await sr('GET', `user_pets?student_id=eq.${stu.id}&select=id,current_stage_index,pet_line`)))?.[0];
  let createdPet = false;
  if (!pet) {
    pet = (await j(await sr('POST', 'user_pets', { student_id: stu.id, total_exp: 0, level: 0, pet_line: null, current_stage_index: 1, has_pending_evolution: false })))?.[0];
    createdPet = true;
  }
  if (pet) {
    const beforeStage = pet.current_stage_index || 1;
    // 模擬 handleEvolvePet：推進到下一階（用學員自身 token 走 RLS）
    r = await fetch(`${URL}/rest/v1/user_pets?id=eq.${pet.id}`, { method: 'PATCH', headers: sH, body: JSON.stringify({ pet_line: 'dragon', current_stage_index: beforeStage + 1, evolved_at: new Date().toISOString() }) });
    const after = (await j(await sr('GET', `user_pets?id=eq.${pet.id}&select=current_stage_index,pet_line`)))?.[0];
    check('進化後 stage +1', r.status < 400 && after?.current_stage_index === beforeStage + 1, `階段 ${beforeStage}→${after?.current_stage_index}`);
    check('神獸線(pet_line)有寫入', after?.pet_line === 'dragon');
    // 還原
    if (createdPet) await sr('DELETE', `user_pets?id=eq.${pet.id}`);
    else await sr('PATCH', `user_pets?id=eq.${pet.id}`, { current_stage_index: beforeStage, pet_line: pet.pet_line, evolved_at: null });
  } else check('進化後 stage +1', false, '無法取得/建立神獸');

  // ===== 5. 後台期數/人事（admin 身分）=====
  console.log('\n【5】後台期數 + 人事 CRUD（admin）');
  const bId = 'batch-test-' + Math.random().toString(36).slice(2, 8);
  r = await fetch(`${URL}/rest/v1/batches`, { method: 'POST', headers: adH, body: JSON.stringify({ id: bId, name: '【自動測試】期數', start_date: '2026-01-01', end_date: '2026-02-01', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
  const createdBatch = r.status < 400 && (await sr('GET', `batches?id=eq.${bId}&select=id`)) && (await j(await sr('GET', `batches?id=eq.${bId}&select=id`)))?.length === 1;
  check('新增期數', createdBatch, r.status >= 400 ? `HTTP ${r.status}` : '');
  // 修改
  await fetch(`${URL}/rest/v1/batches?id=eq.${bId}`, { method: 'PATCH', headers: adH, body: JSON.stringify({ name: '【自動測試】改名' }) });
  const renamed = (await j(await sr('GET', `batches?id=eq.${bId}&select=name`)))?.[0]?.name === '【自動測試】改名';
  check('修改期數名稱', renamed);
  // 新增一名測試學員到該期 → 修改 → 刪除
  const pId = 'usr-test-' + Math.random().toString(36).slice(2, 8);
  r = await fetch(`${URL}/rest/v1/profiles`, { method: 'POST', headers: adH, body: JSON.stringify({ id: pId, name: '【自動測試】學員', phone: '0900000088', role: 'student', batch_id: bId, score: 0, status: 'active', created_at: new Date().toISOString() }) });
  const createdProfile = r.status < 400 && (await j(await sr('GET', `profiles?id=eq.${pId}&select=id`)))?.length === 1;
  check('新增學員', createdProfile, r.status >= 400 ? `HTTP ${r.status}` : '');
  await fetch(`${URL}/rest/v1/profiles?id=eq.${pId}`, { method: 'PATCH', headers: adH, body: JSON.stringify({ name: '【自動測試】學員改' }) });
  const pRenamed = (await j(await sr('GET', `profiles?id=eq.${pId}&select=name`)))?.[0]?.name === '【自動測試】學員改';
  check('修改學員', pRenamed);
  await fetch(`${URL}/rest/v1/profiles?id=eq.${pId}`, { method: 'DELETE', headers: adH });
  const pDeleted = (await j(await sr('GET', `profiles?id=eq.${pId}&select=id`)))?.length === 0;
  check('刪除學員', pDeleted);
  await fetch(`${URL}/rest/v1/batches?id=eq.${bId}`, { method: 'DELETE', headers: adH });
  const bDeleted = (await j(await sr('GET', `batches?id=eq.${bId}&select=id`)))?.length === 0;
  check('刪除期數', bDeleted);

  // ===== 6. 遊戲化成就系統 =====
  console.log('\n【6】遊戲化成就解鎖與通知狀態 (V3)');
  const testAchId = 'ach-test-' + Math.random().toString(36).slice(2, 8);
  // 新增測試成就：需要完成 autoM.id 任務 1 次
  r = await fetch(`${URL}/rest/v1/achievements`, {
    method: 'POST',
    headers: adH,
    body: JSON.stringify({
      id: testAchId,
      title: '【自動測試】特定任務次數成就',
      description: '測試解鎖自動打卡任務解鎖成就',
      icon_url: 'Brain',
      condition_type: 'mission_count',
      condition_value: 1,
      target_mission_id: autoM.id
    })
  });
  check('新增測試成就', r.status < 400);

  // 清除舊打卡與成就解鎖紀錄
  await sr('DELETE', `user_achievements?achievement_id=eq.${testAchId}`);
  await cleanSubs(stu.id, autoM.id);

  // 學員免審核打卡 -> 自動 approved 觸發解鎖
  r = await fetch(`${URL}/rest/v1/submissions`, {
    method: 'POST',
    headers: sH,
    body: JSON.stringify({
      mission_id: autoM.id,
      student_id: stu.id,
      status: 'pending',
      score_awarded: 0
    })
  });
  
  // 檢查成就解鎖與 notified 預設狀態
  let userAchs = await j(await sr('GET', `user_achievements?student_id=eq.${stu.id}&achievement_id=eq.${testAchId}`));
  check('任務數達標 -> 成就解鎖', userAchs?.length === 1);
  check('解鎖後 notified 預設為 false', userAchs?.[0]?.notified === false);

  // 學員呼叫 mark_achievements_notified RPC
  if (userAchs?.length === 1) {
    r = await fetch(`${URL}/rest/v1/rpc/mark_achievements_notified`, {
      method: 'POST',
      headers: sH,
      body: JSON.stringify({ p_student_id: stu.id })
    });
    userAchs = await j(await sr('GET', `user_achievements?student_id=eq.${stu.id}&achievement_id=eq.${testAchId}`));
    check('呼叫 RPC 後 notified 設為 true', r.status < 400 && userAchs?.[0]?.notified === true);
  } else {
    check('呼叫 RPC 後 notified 設為 true', false, '成就未成功解鎖');
  }

  // 清理測試成就與紀錄
  await sr('DELETE', `user_achievements?achievement_id=eq.${testAchId}`);
  await fetch(`${URL}/rest/v1/achievements?id=eq.${testAchId}`, { method: 'DELETE', headers: adH });

  // ---- 收尾：強制清理殘留 + 還原分數 ----
  await sr('DELETE', `profiles?id=eq.${pId}`);
  await sr('DELETE', `batches?id=eq.${bId}`);
  await cleanSubs(stu.id, autoM.id);
  await cleanSubs(stu.id, apprM.id);
  // 用合法計分路徑(adjust_score)把測試造成的淨變動補回 base0，再刪掉這筆還原 log（觸發器一致、不會設到錯值）
  const finalScore = (await scoreOf(stu.id)).score;
  const delta = finalScore - base0.score;
  if (delta !== 0) {
    await fetch(`${URL}/rest/v1/rpc/adjust_score`, { method: 'POST', headers: adH, body: JSON.stringify({ p_student_id: stu.id, p_amount: -delta, p_reason: '【測試還原】', p_created_by: admin.id }) });
    await sr('DELETE', `score_logs?student_id=eq.${stu.id}&reason=eq.${encodeURIComponent('【測試還原】')}`);
  }
  await fetch(`${URL}/rest/v1/login_attempts?id=gt.0`, { method: 'DELETE', headers: srH }).catch(() => {});

  const passed = results.filter(r => r.pass).length, total = results.length;
  console.log(`\n================ 結果：${passed}/${total} ================`);
  if (passed === total) { console.log('✅ 五大流程全部通過。'); process.exit(0); }
  else { console.log('❌ 有項目失敗：'); results.filter(r => !r.pass).forEach(r => console.log('   - ' + r.label)); process.exit(1); }
}
main().catch(e => { console.error('測試例外：', e); process.exit(1); });

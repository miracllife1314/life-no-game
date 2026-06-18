// =====================================================================
// P0 安全鎖「基準線」測試（測試庫 _LOCAL）
//   - 模擬 F12 攻擊者：全程只用 anon key（跟瀏覽器主控台同等權限）
//   - 同時驗證「自動加分 trigger」是否正常
//   - 自我清理：每個寫入動作做完都還原；最後再跑 npm run restore 兜底
//
// 用法：node scratch/security_baseline_test.mjs
// =====================================================================
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const URL = get('NEXT_PUBLIC_SUPABASE_URL_LOCAL') || get('NEXT_PUBLIC_SUPABASE_URL');
const KEY = get('NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL') || get('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

const TARGET = '37d37c46-8ff2-4be7-ad04-1a28b42e8610'; // 測試林建良
const stamp = Date.now();

const api = async (method, path, body) => {
  const res = await fetch(`${URL}/rest/v1/${path}`, { method, headers: h, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, text, json };
};
const readScore = async () => (await api('GET', `profiles?id=eq.${TARGET}&select=score,role`)).json?.[0];

const FUNC = [];   // 功能測試結果
const ATK = [];    // 攻擊測試結果
const mark = (arr, name, ok, detail) => { arr.push({ name, ok, detail }); console.log(`${ok ? '✅' : '❌'} ${name} — ${detail}`); };

async function run() {
  console.log('📡 測試庫:', URL);
  const before = await readScore();
  console.log(`🎯 目標 測試林建良 攻擊前：score=${before.score}, role=${before.role}\n`);

  // ============ 功能：自動加分 trigger（第5項）============
  console.log('--- 功能驗證：自動加分 trigger ---');
  const SUBID = `sec-func-${stamp}`;
  const ins = await api('POST', 'submissions', {
    id: SUBID, mission_id: 'task-custom-post', student_id: TARGET,
    proof_text: '安全測試-合法打卡', status: 'approved', score_awarded: 100,
  });
  const afterAward = await readScore();
  mark(FUNC, '自動加分（合法 approved+100 → 分數應 +100）',
    afterAward?.score === before.score + 100,
    `score ${before.score} → ${afterAward?.score}`);
  const logRow = (await api('GET', `score_logs?submission_id=eq.${SUBID}&select=amount,reason`)).json;
  mark(FUNC, '計分日誌自動寫入（score_logs 應新增 1 筆 +100）',
    Array.isArray(logRow) && logRow.length === 1 && logRow[0].amount === 100,
    JSON.stringify(logRow));
  // 清理：刪除這筆合法打卡 → trigger 應退回 -100
  await api('DELETE', `submissions?id=eq.${SUBID}`);
  const afterRefund = await readScore();
  mark(FUNC, '刪除打卡自動退分（分數應回到原值）',
    afterRefund?.score === before.score,
    `score → ${afterRefund?.score}`);

  // ============ 攻擊：F12 注入（第6項）============
  console.log('\n--- 攻擊測試：模擬 F12 主控台（anon key）---');

  // A. 直接竄改 role 成 admin
  {
    const r = await api('PATCH', `profiles?id=eq.${TARGET}`, { role: 'admin' });
    const now = await readScore();
    const vulnerable = r.status < 400 && now.role === 'admin';
    mark(ATK, 'A. 竄改自己 role 為 admin', !vulnerable, vulnerable ? `得逞！role=${now.role}` : `被擋 HTTP ${r.status}`);
    if (vulnerable) await api('PATCH', `profiles?id=eq.${TARGET}`, { role: before.role }); // 還原
  }
  // B. 直接竄改 score 為 99999
  {
    const r = await api('PATCH', `profiles?id=eq.${TARGET}`, { score: 99999 });
    const now = await readScore();
    const vulnerable = r.status < 400 && now.score === 99999;
    mark(ATK, 'B. 直接竄改 score 為 99999', !vulnerable, vulnerable ? `得逞！score=${now.score}` : `被擋 HTTP ${r.status}`);
    if (vulnerable) await api('PATCH', `profiles?id=eq.${TARGET}`, { score: before.score }); // 還原
  }
  // C. 刪除資料（用隔離假帳號，避免動到真學員）
  {
    const DUMMY = `sec-dummy-${stamp}`;
    await api('POST', 'profiles', { id: DUMMY, name: '安全測試假帳號', phone: '0000000000', role: 'student' });
    const r = await api('DELETE', `profiles?id=eq.${DUMMY}`);
    const gone = (await api('GET', `profiles?id=eq.${DUMMY}&select=id`)).json;
    const vulnerable = r.status < 400 && Array.isArray(gone) && gone.length === 0;
    mark(ATK, 'C. 匿名刪除 profiles 資料', !vulnerable, vulnerable ? '得逞！可任意刪除' : `被擋 HTTP ${r.status}`);
    await api('DELETE', `profiles?id=eq.${DUMMY}`); // 確保清掉
  }
  // D. 偽造 approved 高分打卡（核心：灌分）
  {
    const FID = `sec-atk-${stamp}`;
    const r = await api('POST', 'submissions', {
      id: FID, mission_id: 'task-custom-post', student_id: TARGET,
      proof_text: '偽造 approved', status: 'approved', score_awarded: 9999,
    });
    const now = await readScore();
    const got = r.json?.[0];
    // 漏洞判定：被資料庫接受、且狀態維持 approved/分數維持 9999、且分數真的灌進去
    const corrected = got && (got.status !== 'approved' || got.score_awarded === 0);
    const scored = now.score !== before.score;
    const vulnerable = r.status < 400 && !corrected && scored;
    mark(ATK, 'D. 偽造 approved 打卡灌 9999 分', !vulnerable,
      vulnerable ? `得逞！score ${before.score} → ${now.score}` :
      corrected ? `被資料庫修正(status=${got?.status},score=${got?.score_awarded})` : `被擋 HTTP ${r.status}`);
    // 還原
    await api('DELETE', `submissions?id=eq.${FID}`);
    await api('PATCH', `profiles?id=eq.${TARGET}`, { score: before.score });
  }
  // E. 直接寫 score_logs
  {
    const r = await api('POST', 'score_logs', { id: `sec-log-${stamp}`, student_id: TARGET, amount: 10000, reason: '直接注入', created_by: TARGET });
    const vulnerable = r.status < 400 && Array.isArray(r.json) && r.json.length > 0;
    mark(ATK, 'E. 直接寫入 score_logs 灌分', !vulnerable, vulnerable ? '得逞！可直接寫日誌' : `被擋 HTTP ${r.status}`);
    if (vulnerable) await api('DELETE', `score_logs?id=eq.sec-log-${stamp}`);
  }
  // F. 呼叫 adjust_score RPC
  {
    const r = await api('POST', 'rpc/adjust_score', { p_student_id: TARGET, p_amount: 500, p_reason: '偽造 RPC', p_created_by: TARGET });
    const now = await readScore();
    const vulnerable = r.status < 400 && now.score !== before.score;
    mark(ATK, 'F. 呼叫 adjust_score 提權加分', !vulnerable, vulnerable ? `得逞！score=${now.score}` : `被擋 HTTP ${r.status}`);
    if (vulnerable) await api('PATCH', `profiles?id=eq.${TARGET}`, { score: before.score });
  }

  // 最終確認：目標已還原
  const final = await readScore();
  console.log(`\n🎯 測試後 測試林建良：score=${final.score}, role=${final.role}（應與攻擊前一致 ${before.score}/${before.role}）`);

  // ============ 總結 ============
  console.log('\n================ 報告摘要 ================');
  console.log('功能測試（應全 ✅）：', FUNC.filter(x => x.ok).length + '/' + FUNC.length, '通過');
  console.log('攻擊被擋（現況預期多為 ❌＝未擋）：', ATK.filter(x => x.ok).length + '/' + ATK.length, '被擋');
  console.log('JSON:', JSON.stringify({ target: before, final, FUNC, ATK }, null, 0));
}
run().catch(e => { console.error('測試發生例外：', e); process.exit(1); });

import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();

const SUPABASE_URL = get('NEXT_PUBLIC_SUPABASE_URL_LOCAL') || get('NEXT_PUBLIC_SUPABASE_URL');
const ANON_KEY = get('NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL') || get('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function verify() {
  console.log('📡 [資料庫狀態檢測] 連線目標:', SUPABASE_URL);
  
  const report = {
    profiles_rls: '未知',
    submissions_rls: '未知',
    score_logs_rls: '未知',
    is_admin_exists: '不存在',
    is_captain_of_exists: '不存在',
    block_score_trigger: '未掛上',
    adjust_score_locked: '未鎖定',
    attack_blocked_count: '0/6'
  };

  // 1. 檢測 is_admin() 是否存在
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, { method: 'POST', headers });
    if (res.status === 200) {
      report.is_admin_exists = '存在';
    } else if (res.status === 404) {
      report.is_admin_exists = '不存在';
    } else {
      report.is_admin_exists = `錯誤 (HTTP ${res.status})`;
    }
  } catch (e) {
    report.is_admin_exists = `異常 (${e.message})`;
  }

  // 2. 檢測 is_captain_of() 是否存在 (考慮參數 p_student_id)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_captain_of`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_student_id: 'student-yuting' })
    });
    if (res.status === 200 || res.status === 400 || res.status === 401) {
      report.is_captain_of_exists = '存在';
    } else if (res.status === 404) {
      report.is_captain_of_exists = '不存在';
    } else {
      report.is_captain_of_exists = `錯誤 (HTTP ${res.status})`;
    }
  } catch (e) {
    report.is_captain_of_exists = `異常 (${e.message})`;
  }

  // 3. 檢測 score_logs 是否已啟用 RLS
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/score_logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        student_id: 'student-yuting',
        amount: 0,
        reason: 'inspection test',
        created_by: 'inspect'
      })
    });
    const text = await res.text();
    if (res.status === 401 || res.status === 403 || text.includes('violates row-level security')) {
      report.score_logs_rls = '已啟用且有效限制';
    } else {
      report.score_logs_rls = '未啟用或無限制 (HTTP ' + res.status + ')';
    }
  } catch (e) {
    report.score_logs_rls = `異常 (${e.message})`;
  }

  // 4. 檢測 profiles RLS 與 防改分 Trigger 是否已掛上
  try {
    // 試圖更新 score 欄位
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.admin1`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ score: 99999 })
    });
    const text = await res.text();
    if (text.includes('[安全]') || text.includes('禁止直接修改') || text.includes('無權變更敏感欄位')) {
      report.block_score_trigger = '已掛上 (成功攔截改分)';
    } else {
      report.block_score_trigger = '未掛上 (直接修改成功或查無錯誤，HTTP ' + res.status + ')';
    }
  } catch (e) {
    report.block_score_trigger = `異常 (${e.message})`;
  }

  // 5. 檢測 profiles RLS 狀態 (是否限制特定寫入)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.admin1`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name: '林大統_TEST' })
    });
    const text = await res.text();
    if (res.status === 401 || res.status === 403 || text.includes('violates row-level security policy')) {
      report.profiles_rls = '已啟用且有效限制';
    } else if (res.status === 200 || res.status === 204) {
      report.profiles_rls = '未啟用或允許匿名更新';
    } else {
      report.profiles_rls = `未知狀態 (HTTP ${res.status})`;
    }
  } catch (e) {
    report.profiles_rls = `異常 (${e.message})`;
  }

  // 6. 檢測 submissions RLS 狀態
  try {
    // 嘗試進行 DELETE
    const res = await fetch(`${SUPABASE_URL}/rest/v1/submissions?id=eq.nonexistent`, {
      method: 'DELETE',
      headers
    });
    const text = await res.text();
    if (res.status === 401 || res.status === 403 || text.includes('violates row-level security policy')) {
      report.submissions_rls = '已啟用且有效限制';
    } else {
      report.submissions_rls = '未啟用或允許匿名刪除 (HTTP ' + res.status + ')';
    }
  } catch (e) {
    report.submissions_rls = `異常 (${e.message})`;
  }

  // 7. 檢測 adjust_score 是否已鎖定
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/adjust_score`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_student_id: 'student-yuting',
        p_amount: 100,
        p_reason: 'Inspect adjust_score lock',
        p_created_by: 'student-yuting'
      })
    });
    const text = await res.text();
    if (res.status === 401 || res.status === 403 || text.includes('permission denied') || text.includes('[安全] 僅管理員或該隊隊長可調整分數。')) {
      report.adjust_score_locked = '已鎖定';
    } else if (res.status === 200 || res.status === 204) {
      report.adjust_score_locked = '未鎖定 (調分成功)';
    } else {
      report.adjust_score_locked = `未知 (HTTP ${res.status})`;
    }
  } catch (e) {
    report.adjust_score_locked = `異常 (${e.message})`;
  }

  // 8. 跑攻擊測試阻擋數量
  let blocked = 0;
  // 測試 1: 直接改分數
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.admin1`, { method: 'PATCH', headers, body: JSON.stringify({ score: 99999 }) });
    if (res.status >= 400 || (await res.text()).includes('[安全]')) blocked++;
  } catch {}
  // 測試 2: 直接改 role
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.admin1`, { method: 'PATCH', headers, body: JSON.stringify({ role: 'admin' }) });
    if (res.status >= 400 || (await res.text()).includes('[安全]')) blocked++;
  } catch {}
  // 測試 3: 刪除 profiles
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.admin1`, { method: 'DELETE', headers });
    if (res.status >= 400) blocked++;
  } catch {}
  // 測試 4: 偽造 approved 打卡
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/submissions`, { method: 'POST', headers, body: JSON.stringify({ mission_id: 'task-custom-post', student_id: 'admin1', status: 'approved', score_awarded: 9999 }) });
    const text = await res.text();
    if (res.status >= 400 || text.includes('pending')) blocked++;
  } catch {}
  // 測試 5: 寫入 score_logs
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/score_logs`, { method: 'POST', headers, body: JSON.stringify({ student_id: 'admin1', amount: 9999 }) });
    if (res.status >= 400) blocked++;
  } catch {}
  // 測試 6: 呼叫 adjust_score
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/adjust_score`, { method: 'POST', headers, body: JSON.stringify({ p_student_id: 'admin1', p_amount: 9999, p_created_by: 'student-yuting' }) });
    if (res.status >= 400 || (await res.text()).includes('[安全]')) blocked++;
  } catch {}

  report.attack_blocked_count = `${blocked}/6`;

  console.log('\n=== 📊 測試庫實際狀態報告 ===');
  console.log('1. profiles RLS狀態:', report.profiles_rls);
  console.log('2. submissions RLS狀態:', report.submissions_rls);
  console.log('3. score_logs RLS狀態:', report.score_logs_rls);
  console.log('4. is_admin() 存在性:', report.is_admin_exists);
  console.log('5. is_captain_of() 存在性:', report.is_captain_of_exists);
  console.log('6. 防改分 Trigger 掛上狀態:', report.block_score_trigger);
  console.log('7. adjust_score 鎖定狀態:', report.adjust_score_locked);
  console.log('8. 攻擊測試被擋結果:', report.attack_blocked_count);
  console.log('==============================\n');
}

verify().catch(console.error);

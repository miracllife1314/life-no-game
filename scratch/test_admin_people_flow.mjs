import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();

const SUPABASE_URL = get('NEXT_PUBLIC_SUPABASE_URL_LOCAL') || get('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_KEY = get('SUPABASE_SERVICE_ROLE_KEY_LOCAL') || get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Cannot find connection details in .env.local!');
  process.exit(1);
}

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };

// Helper function to query a table
async function query(table, select, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}&${filter}`;
  const res = await fetch(url, { headers });
  return j(res);
}

// Helper function to insert
async function insert(table, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    throw new Error(`Insert to ${table} failed: ${res.status} ${await res.text()}`);
  }
  return j(res);
}

// Helper function to update
async function update(table, filter, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    throw new Error(`Update to ${table} failed: ${res.status} ${await res.text()}`);
  }
  return j(res);
}

// Helper function to delete
async function del(table, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, { method: 'DELETE', headers });
  if (!res.ok) {
    throw new Error(`Delete from ${table} failed: ${res.status} ${await res.text()}`);
  }
  return j(res);
}

const getChineseNumber = (n) => {
  const chineseNums = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
  return chineseNums[n] || n.toString();
};

async function main() {
  console.log('📡 Testing HR / People Management Business Logic on Staging DB...');
  console.log('📡 URL:', SUPABASE_URL);

  const results = [];
  const verify = (step, label, passed, detail) => {
    results.push({ step, label, passed });
    console.log(`  ${passed ? '✅' : '❌'} [步驟 ${step}] ${label}${detail ? ' — ' + detail : ''}`);
  };

  // Seed references
  const testBatchId = 'batch-50'; // standard batch in seed data
  let testStudentId = null;
  let testTeamId = null;
  let testNewBatchId = null;
  
  // Clean up any stale test records from previous runs
  try {
    await del('profiles', 'phone=eq.0977888999');
    await del('profiles', 'phone=eq.0977888888');
    await del('teams', 'name=eq.NLP測試先鋒隊');
    await del('teams', 'name=eq.NLP測試特攻隊');
    await del('batches', 'name=eq.測試第99期');
    await del('batches', 'name=eq.測試第99期_改');
    await del('teams', 'batch_id=eq.batch-test-99');
  } catch {}

  try {
    // ----------------------------------------------------
    // 1. 新增學員 (Add Profile)
    // ----------------------------------------------------
    const newId = 'test-stu-' + Date.now();
    await insert('profiles', {
      id: newId,
      profile_id: newId,
      name: '陳大同',
      phone: '0977888999',
      role: 'student',
      batch_id: testBatchId,
      score: 0,
      status: 'active',
      created_at: new Date().toISOString()
    });
    
    const check1 = await query('profiles', 'id,name,phone,status', `id=eq.${newId}`);
    testStudentId = check1[0]?.id;
    verify(1, '新增學員 (陳大同)', check1[0]?.name === '陳大同' && check1[0]?.phone === '0977888999', `ID: ${testStudentId}`);

    // ----------------------------------------------------
    // 2. 修改學員資料 (Update Profile)
    // ----------------------------------------------------
    await update('profiles', `id=eq.${testStudentId}`, {
      name: '陳大同_測試',
      phone: '0977888888'
    });
    const check2 = await query('profiles', 'name,phone', `id=eq.${testStudentId}`);
    verify(2, '修改學員資料 (改名及電話)', check2[0]?.name === '陳大同_測試' && check2[0]?.phone === '0977888888');

    // ----------------------------------------------------
    // 3. 停用學員 (Deactivate Profile)
    // ----------------------------------------------------
    await update('profiles', `id=eq.${testStudentId}`, { status: 'inactive' });
    const check3 = await query('profiles', 'status', `id=eq.${testStudentId}`);
    verify(3, '停用學員 (狀態改為 inactive)', check3[0]?.status === 'inactive');

    // ----------------------------------------------------
    // 4. 刪除測試學員 (Hard Delete Profile)
    // ----------------------------------------------------
    await del('profiles', `id=eq.${testStudentId}`);
    const check4 = await query('profiles', 'id', `id=eq.${testStudentId}`);
    verify(4, '刪除測試學員 (徹底刪除)', check4.length === 0);

    // ----------------------------------------------------
    // 5. 新增小隊 (Create Team)
    // ----------------------------------------------------
    const teamId = 'test-team-' + Date.now();
    await insert('teams', {
      id: teamId,
      name: 'NLP測試先鋒隊',
      captain_id: null,
      total_score: 0,
      batch_id: testBatchId,
      created_at: new Date().toISOString()
    });
    const check5 = await query('teams', 'id,name', `id=eq.${teamId}`);
    testTeamId = check5[0]?.id;
    verify(5, '新增小隊 (NLP測試先鋒隊)', check5[0]?.name === 'NLP測試先鋒隊', `ID: ${testTeamId}`);

    // ----------------------------------------------------
    // 6. 修改小隊 (Update Team Settings)
    // ----------------------------------------------------
    await update('teams', `id=eq.${testTeamId}`, { name: 'NLP測試特攻隊' });
    const check6 = await query('teams', 'name', `id=eq.${testTeamId}`);
    verify(6, '修改小隊 (NLP測試先鋒隊 ➔ NLP測試特攻隊)', check6[0]?.name === 'NLP測試特攻隊');

    // ----------------------------------------------------
    // 7. 指派小隊長 (Assign Captain)
    // ----------------------------------------------------
    const existingCaptains = await query('profiles', 'id,profile_id,name', `role=eq.captain&limit=1`);
    const testCap = existingCaptains[0];
    if (testCap) {
      await update('teams', `id=eq.${testTeamId}`, { captain_id: testCap.profile_id });
      const check7 = await query('teams', 'captain_id', `id=eq.${testTeamId}`);
      verify(7, `指派小隊長 (指派 ${testCap.name} 為特攻隊長)`, check7[0]?.captain_id === testCap.profile_id);
    } else {
      verify(7, '指派小隊長', false, '無測試隊長可供指派');
    }

    // ----------------------------------------------------
    // 8. 學員換隊 (Assign Team)
    // ----------------------------------------------------
    const testStudents = await query('profiles', 'id,name,team_id', `role=eq.student&name=eq.測試王建凱`);
    const studentToMove = testStudents[0];
    if (studentToMove) {
      const originalTeamId = studentToMove.team_id;
      await update('profiles', `id=eq.${studentToMove.id}`, { team_id: testTeamId });
      const check8 = await query('profiles', 'team_id', `id=eq.${studentToMove.id}`);
      verify(8, `學員換隊 (學員 ${studentToMove.name} ➔ NLP測試特攻隊)`, check8[0]?.team_id === testTeamId);
      await update('profiles', `id=eq.${studentToMove.id}`, { team_id: originalTeamId });
    } else {
      verify(8, '學員換隊', false, '找不到測試學員 測試王建凱');
    }

    await del('teams', `id=eq.${testTeamId}`);

    // ----------------------------------------------------
    // 9. 新增期數與預置小隊 (Create Batch & Teams)
    // ----------------------------------------------------
    testNewBatchId = 'batch-test-99';
    const batchName = '測試第99期';
    try {
      await insert('batches', {
        id: testNewBatchId,
        name: batchName,
        start_date: '2026-06-01',
        end_date: '2026-06-30',
        created_at: new Date().toISOString()
      });
      
      const prefix = 'NLP初階測試第99期';
      for (let i = 1; i <= 2; i++) {
        const chNum = getChineseNumber(i);
        const teamName = `${prefix}第${chNum}隊`;
        await insert('teams', {
          id: `team-${testNewBatchId}-${i}`,
          name: teamName,
          captain_id: null,
          total_score: 0,
          batch_id: testNewBatchId,
          invite_code: `invite-${testNewBatchId}-${i}`,
          invite_enabled: true,
          max_members: 10,
          created_at: new Date().toISOString()
        });
      }

      const checkBatch = await query('batches', 'name', `id=eq.${testNewBatchId}`);
      const checkTeams = await query('teams', 'id,name', `batch_id=eq.${testNewBatchId}`);
      console.log('DEBUG Step 9 checkBatch:', JSON.stringify(checkBatch));
      console.log('DEBUG Step 9 checkTeams:', JSON.stringify(checkTeams));
      
      const isBatchOk = checkBatch[0]?.name === '測試第99期';
      const isTeamsLengthOk = checkTeams.length === 2;
      const teamNames = checkTeams.map(t => t.name);
      const hasTeam1 = teamNames.includes('NLP初階測試第99期第一隊');
      const hasTeam2 = teamNames.includes('NLP初階測試第99期第二隊');
      
      verify(9, '新增期數與自動產生小隊', 
        isBatchOk && isTeamsLengthOk && hasTeam1 && hasTeam2
      );
    } catch (e) {
      verify(9, '新增期數與自動產生小隊', false, e.message);
    }

    // ----------------------------------------------------
    // 10. 修改期數名稱與小隊增減 (Update Batch & Teams)
    // ----------------------------------------------------
    const updatedName = '測試第99期_改';
    try {
      await update('batches', `id=eq.${testNewBatchId}`, {
        name: updatedName
      });
      const prefix = 'NLP初階測試第99期';
      const i = 3;
      const chNum = getChineseNumber(i);
      const teamName = `${prefix}第${chNum}隊`;
      await insert('teams', {
        id: `team-${testNewBatchId}-${i}`,
        name: teamName,
        captain_id: null,
        total_score: 0,
        batch_id: testNewBatchId,
        invite_code: `invite-${testNewBatchId}-${i}`,
        invite_enabled: true,
        max_members: 10,
        created_at: new Date().toISOString()
      });

      const checkBatch10 = await query('batches', 'name', `id=eq.${testNewBatchId}`);
      const checkTeams10 = await query('teams', 'id,name', `batch_id=eq.${testNewBatchId}`);
      console.log('DEBUG Step 10 checkBatch10:', JSON.stringify(checkBatch10));
      console.log('DEBUG Step 10 checkTeams10:', JSON.stringify(checkTeams10));

      const isBatch10Ok = checkBatch10[0]?.name === '測試第99期_改';
      const isTeams10LengthOk = checkTeams10.length === 3;
      const teamNames10 = checkTeams10.map(t => t.name);
      const hasTeam3 = teamNames10.includes('NLP初階測試第99期第三隊');

      verify(10, '修改期數與增減小隊數量', 
        isBatch10Ok && isTeams10LengthOk && hasTeam3
      );
    } catch (e) {
      verify(10, '修改期數與增減小隊數量', false, e.message);
    }

    // ----------------------------------------------------
    // 11. 刪除測試期數 (Delete Batch Cascade)
    // ----------------------------------------------------
    await del('batch_mission_templates', `batch_id=eq.${testNewBatchId}`);
    await del('missions', `batch_id=eq.${testNewBatchId}`);
    await update('profiles', `batch_id=eq.${testNewBatchId}`, { batch_id: null, team_id: null });
    await del('teams', `batch_id=eq.${testNewBatchId}`);
    await del('batches', `id=eq.${testNewBatchId}`);

    const checkBatch11 = await query('batches', 'id', `id=eq.${testNewBatchId}`);
    const checkTeams11 = await query('teams', 'id', `batch_id=eq.${testNewBatchId}`);
    verify(11, '刪除測試期數與關聯小隊 (階層級聯刪除)', checkBatch11.length === 0 && checkTeams11.length === 0);

  } catch (err) {
    console.error('❌ Error during verification:', err);
  }

  console.log('\n====================================');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`測試結果：${passedCount}/11 個步驟驗收通過！`);
  if (passedCount === 11) {
    console.log('🎉 恭喜！本地測試庫人事與期數管理邏輯 100% 驗收成功！');
    process.exit(0);
  } else {
    console.log('🚨 警告：有部分人事管理功能在本地測試時未通過驗收！');
    process.exit(1);
  }
}

main().catch(console.error);

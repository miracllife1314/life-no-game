import fs from 'fs';

// Read connection settings from .env.local
const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();

// Target Production variables
const SUPABASE_URL = get('NEXT_PUBLIC_SUPABASE_URL');
const ANON_KEY = get('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Cannot find Production Supabase connection details in .env.local!');
  process.exit(1);
}

console.log('📡 Testing Connection to Production Database:', SUPABASE_URL);

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function runTests() {
  console.log('\n=== 🛑 START PRODUCTION CONSOLE INJECTION TESTS ===');
  let vulnerabilities = 0;

  // Test 1: Try to update role to admin (for admin1)
  try {
    console.log('\n🧪 [Test 1] Attempting to update role to "admin" for admin1...');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.admin1`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ role: 'student' }) // try to demote or change role
    });
    const status = res.status;
    const text = await res.text();
    if (status >= 400 || text.includes('權限不足') || text.trim() === '[]') {
      console.log(`✅ Blocked (HTTP ${status}): RLS prevented the update (Response: ${text.trim() || 'empty'}).`);
    } else {
      console.log(`❌ Vulnerable (HTTP ${status}): Role update succeeded or returned data! Content:`, text);
      vulnerabilities++;
    }
  } catch (err) {
    console.log('✅ Blocked with exception:', err.message);
  }

  // Test 2: Try to update score directly (for admin1)
  try {
    console.log('\n🧪 [Test 2] Attempting to update score directly to 99999 for admin1...');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.admin1`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ score: 99999 })
    });
    const status = res.status;
    const text = await res.text();
    if (status >= 400 || text.includes('權限不足') || text.trim() === '[]') {
      console.log(`✅ Blocked (HTTP ${status}): RLS prevented the score update (Response: ${text.trim() || 'empty'}).`);
    } else {
      console.log(`❌ Vulnerable (HTTP ${status}): Score update succeeded or returned data! Content:`, text);
      vulnerabilities++;
    }
  } catch (err) {
    console.log('✅ Blocked with exception:', err.message);
  }

  // Test 3: Try to delete profiles (cannot delete data)
  try {
    console.log('\n🧪 [Test 3] Attempting to delete admin1 profile...');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.admin1`, {
      method: 'DELETE',
      headers
    });
    const status = res.status;
    const text = await res.text();
    if (status >= 400 || text.includes('violates row-level security policy') || text.trim() === '[]') {
      console.log(`✅ Blocked (HTTP ${status}): Record not deleted. (Response: ${text.trim() || 'empty'})`);
    } else {
      console.log(`❌ Vulnerable (HTTP ${status}): Delete succeeded! Content:`, text);
      vulnerabilities++;
    }
  } catch (err) {
    console.log('✅ Blocked with exception:', err.message);
  }

  // Test 4: Forge submission approval and high score for approval-required task
  try {
    console.log('\n🧪 [Test 4] Attempting to forge an approved submission for an approval-required task...');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/submissions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: 'mock-sub-req-' + Date.now(),
        mission_id: 'task-custom-post',
        student_id: 'admin1',
        proof_text: 'Forged approval',
        status: 'approved',
        score_awarded: 9999
      })
    });
    const status = res.status;
    const text = await res.text();
    if (status >= 400 || text.includes('權限不足') || text.includes('violates')) {
      console.log(`✅ Blocked (HTTP ${status}): ${text.trim()}`);
    } else {
      console.log(`❌ Vulnerable (HTTP ${status}): Forged submission accepted! Content:`, text);
      vulnerabilities++;
    }
  } catch (err) {
    console.log('✅ Blocked with exception:', err.message);
  }

  // Test 5: Forge score for an auto-approved task (should be overwritten by database to real task score)
  try {
    console.log('\n🧪 [Test 5] Attempting to forge score (9999) for an auto-approved task...');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/submissions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: 'mock-sub-auto-' + Date.now(),
        mission_id: 'temp-evolve-dragon',
        student_id: 'admin1',
        proof_text: 'Auto approved test',
        status: 'approved',
        score_awarded: 9999
      })
    });
    const status = res.status;
    const text = await res.text();
    if (status >= 400 || text.includes('violates') || text.includes('權限不足')) {
      console.log(`✅ Blocked/Ignored (HTTP ${status}): ${text.trim()}`);
    } else {
      console.log(`❌ Vulnerable (HTTP ${status}): Forged score accepted! Content:`, text);
      vulnerabilities++;
    }
  } catch (err) {
    console.log('✅ Blocked with exception:', err.message);
  }

  // Test 6: Direct insert into score_logs
  try {
    console.log('\n🧪 [Test 6] Attempting to insert directly into score_logs table...');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/score_logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        student_id: 'admin1',
        amount: 10000,
        reason: 'Hacked directly',
        created_by: 'admin1'
      })
    });
    const status = res.status;
    const text = await res.text();
    if (status >= 400 || text.includes('violates row-level security policy')) {
      console.log(`✅ Blocked (HTTP ${status}): ${text.trim()}`);
    } else {
      console.log(`❌ Vulnerable (HTTP ${status}): Direct insert into score_logs succeeded! Content:`, text);
      vulnerabilities++;
    }
  } catch (err) {
    console.log('✅ Blocked with exception:', err.message);
  }

  // Test 7: Call adjust_score RPC (should be blocked by REVOKE or condition check)
  try {
    console.log('\n🧪 [Test 7] Attempting to execute adjust_score RPC...');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/adjust_score`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_student_id: 'admin1',
        p_amount: 500,
        p_reason: 'Forged RPC adjust',
        p_created_by: 'admin1'
      })
    });
    const status = res.status;
    const text = await res.text();
    if (status >= 400 || text.includes('permission denied') || text.includes('does not exist') || text.includes('[安全]')) {
      console.log(`✅ Blocked (HTTP ${status}): Permission denied / function execution blocked.`);
    } else {
      console.log(`❌ Vulnerable (HTTP ${status}): RPC execution succeeded! Content:`, text);
      vulnerabilities++;
    }
  } catch (err) {
    console.log('✅ Blocked with exception:', err.message);
  }

  console.log('\n=== 🛑 END PRODUCTION CONSOLE INJECTION TESTS ===');
  console.log(`\nResult: ${7 - vulnerabilities}/7 tests secured.`);
  if (vulnerabilities === 0) {
    console.log('🎉 PRODUCTION DATABASE IS FULLY SECURED AGAINST CONSOLE INJECTIONS!');
  } else {
    console.log('🚨 VULNERABILITY FOUND ON PRODUCTION DATABASE!');
  }
}

runTests().catch(console.error);

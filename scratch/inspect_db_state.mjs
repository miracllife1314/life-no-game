import fs from 'fs';

// Read connection settings from .env.local
const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();

const SUPABASE_URL = get('NEXT_PUBLIC_SUPABASE_URL_LOCAL') || get('NEXT_PUBLIC_SUPABASE_URL');
const ANON_KEY = get('NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL') || get('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function inspect() {
  console.log('📡 Connecting to:', SUPABASE_URL);

  // 1. Fetch OpenAPI spec to check exposed RPCs (is_admin, is_captain_of, adjust_score)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers });
    const spec = await res.json();
    const paths = Object.keys(spec.paths || {});
    
    console.log('\n=== 🔍 Exposed RPC Functions in OpenAPI Spec ===');
    const rpcs = paths.filter(p => p.startsWith('/rpc/'));
    rpcs.forEach(r => console.log('  -', r));
    
    const hasIsAdmin = paths.includes('/rpc/is_admin');
    const hasIsCaptainOf = paths.includes('/rpc/is_captain_of');
    const hasAdjustScore = paths.includes('/rpc/adjust_score');
    
    console.log('\n- is_admin() exists in spec:', hasIsAdmin);
    console.log('- is_captain_of() exists in spec:', hasIsCaptainOf);
    console.log('- adjust_score exists in spec:', hasAdjustScore);

  } catch (err) {
    console.error('❌ Error fetching OpenAPI spec:', err.message);
  }

  // 2. Check actual RLS behavior on profiles, submissions, score_logs
  // If RLS is enabled and active without allow_all_anon, we can check how it responds.
  // Wait, let's check if the policies allow reading, writing, or if they are open.
  // Let's perform some check requests.
  
  // Test RLS on profiles: can we modify a profile?
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.student-yuting`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({ role: 'student' }) // safe update
    });
    console.log('\n- profiles update status:', res.status);
    const text = await res.text();
    console.log('  profiles update response:', text);
  } catch (err) {
    console.log('- profiles update failed:', err.message);
  }

  // Test RLS on score_logs: can we write directly?
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/score_logs`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({
        student_id: 'student-yuting',
        amount: 0,
        reason: 'test RLS inspection',
        created_by: 'inspect-script'
      })
    });
    console.log('- score_logs insert status:', res.status);
    console.log('  score_logs insert response:', await res.text());
  } catch (err) {
    console.log('- score_logs insert failed:', err.message);
  }

  // Test RLS on submissions: can we delete?
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/submissions?id=eq.nonexistent-id`, {
      method: 'DELETE',
      headers: { ...headers, 'Prefer': 'return=representation' }
    });
    console.log('- submissions delete status:', res.status);
    console.log('  submissions delete response:', await res.text());
  } catch (err) {
    console.log('- submissions delete failed:', err.message);
  }
}

inspect().catch(console.error);

import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const URL = get('NEXT_PUBLIC_SUPABASE_URL_LOCAL');
const ANON = get('NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL');
const SR = get('SUPABASE_SERVICE_ROLE_KEY_LOCAL');

const srH = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const aH = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

async function main() {
  // Find a student
  const resProfiles = await fetch(`${URL}/rest/v1/profiles?role=eq.student&limit=1`, { headers: srH });
  const profiles = await resProfiles.json();
  const stu = profiles[0];
  if (!stu) {
    console.error('No student found in DB');
    return;
  }
  
  console.log(`Student name: ${stu.name}, ID: ${stu.id}, current score: ${stu.score}`);

  // Try anonymous adjust_score
  console.log('Sending anonymous adjust_score...');
  const r = await fetch(`${URL}/rest/v1/rpc/adjust_score`, {
    method: 'POST',
    headers: aH,
    body: JSON.stringify({
      p_student_id: stu.id,
      p_amount: 500,
      p_reason: 'anonymous hack debug',
      p_created_by: stu.id
    })
  });
  
  console.log('Response status:', r.status);
  console.log('Response body:', await r.text());

  // Get score after
  const resAfter = await fetch(`${URL}/rest/v1/profiles?id=eq.${stu.id}`, { headers: srH });
  const after = await resAfter.json();
  console.log('Score after:', after[0]?.score);
}

main().catch(console.error);

import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const SUPABASE_URL = get('NEXT_PUBLIC_SUPABASE_URL');
const KEY = get('SUPABASE_SERVICE_ROLE_KEY') || get('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function checkUserPets() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, { headers });
  const profiles = await res.json();
  const adminProfile = profiles.find(p => p.role === 'admin');

  console.log('\n--- 大隊長 (Admin) Profile ---');
  console.log(JSON.stringify(adminProfile, null, 2));

  const res2 = await fetch(`${SUPABASE_URL}/rest/v1/user_pets?select=*`, { headers });
  const userPets = await res2.json();

  if (adminProfile) {
    const adminPet = userPets.find(up => up.student_id === adminProfile.id);
    console.log('\n--- 大隊長 (Admin) Pet ---');
    console.log(JSON.stringify(adminPet, null, 2));
  } else {
    console.log('\n❌ 找不到管理員 Profile');
  }

  console.log('\n--- 所有的 User Pets 紀錄 ---');
  console.log(JSON.stringify(userPets, null, 2));
}

checkUserPets().catch(console.error);

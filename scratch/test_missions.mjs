import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2];
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`
};

async function checkData() {
  try {
    // 1. Fetch profiles
    const profilesRes = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*`, { headers });
    const profiles = await profilesRes.json();
    console.log('--- PROFILES ---');
    console.log(profiles.map(p => ({ id: p.id, name: p.name, role: p.role, batch_id: p.batch_id })));

    // Find a student
    const student = profiles.find(p => p.role !== 'admin');
    if (!student) {
      console.log('No student profile found.');
      return;
    }
    console.log(`\nChecking student ${student.name} with batch_id: ${student.batch_id}`);

    // 2. Fetch missions for student's batch
    const missionsRes = await fetch(`${supabaseUrl}/rest/v1/missions?batch_id=eq.${student.batch_id}`, { headers });
    const missions = await missionsRes.json();
    console.log('\n--- MISSIONS FOR THIS BATCH ---');
    console.log(missions.map(m => ({
      id: m.id,
      title: m.title,
      template_id: m.template_id,
      batch_id: m.batch_id,
      status: m.status
    })));
  } catch (err) {
    console.error(err);
  }
}

checkData();

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
    // 1. Fetch pet lines
    const linesRes = await fetch(`${supabaseUrl}/rest/v1/pet_lines`, { headers });
    const petLines = await linesRes.json();
    console.log('--- SUPABASE PET LINES ---');
    console.log(petLines.map(pl => ({
      id: pl.id,
      line_key: pl.line_key,
      line_name: pl.line_name,
      task_template_id: pl.task_template_id
    })));

    // 2. Fetch mission templates
    const templatesRes = await fetch(`${supabaseUrl}/rest/v1/mission_templates`, { headers });
    const templates = await templatesRes.json();
    console.log('\n--- SUPABASE MISSION TEMPLATES ---');
    console.log(templates.map(t => ({
      id: t.id,
      title: t.title,
      category: t.category
    })));
  } catch (err) {
    console.error(err);
  }
}

checkData();

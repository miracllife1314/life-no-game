const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env variables!');
  process.exit(1);
}

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`
};

async function checkEvolutions() {
  try {
    // 1. Fetch pet lines
    const linesUrl = `${supabaseUrl}/rest/v1/pet_lines?select=*`;
    const linesRes = await fetch(linesUrl, { headers });
    const lines = await linesRes.json();
    console.log('--- Pet Lines ---');
    console.dir(lines, { depth: null });

    // 2. Fetch all evolution templates
    const templatesUrl = `${supabaseUrl}/rest/v1/mission_templates?select=*`;
    const templatesRes = await fetch(templatesUrl, { headers });
    const templates = await templatesRes.json();
    
    // Filter templates starting with 'temp-evolve'
    const evolutionTemplates = templates.filter(t => t.id.startsWith('temp-evolve') || t.category === '神獸進化');
    console.log('\n--- Evolution Mission Templates ---');
    console.dir(evolutionTemplates, { depth: null });
    
    // 3. Match them up
    console.log('\n--- Mapping & Diagnostics ---');
    for (const line of lines) {
      console.log(`Line: ${line.name} (${line.line_key})`);
      console.log(`  Task Template ID: ${line.task_template_id}`);
      const matched = templates.find(t => t.id === line.task_template_id);
      if (matched) {
        console.log(`  Matched Template: "${matched.title}"`);
        console.log(`  Description: ${matched.description}`);
        console.log(`  Points: ${matched.points}`);
        console.log(`  Category: ${matched.category}`);
        console.log(`  Mission Type: ${matched.mission_type}`);
      } else {
        console.log(`  ⚠️ WARNING: No matching mission template found in DB for ID: ${line.task_template_id}`);
      }
      console.log('--------------------------------------');
    }
  } catch (err) {
    console.error('Error fetching data:', err);
  }
}

checkEvolutions();

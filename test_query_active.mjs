const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env variables!');
  process.exit(1);
}

const url = `${supabaseUrl}/rest/v1/missions?batch_id=eq.batch-wqdl2z9&order=publish_at.asc&limit=10`;
const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`
};

async function test() {
  try {
    const response = await fetch(url, { headers });
    const data = await response.json();
    console.log('Earliest 10 missions in DB:', data.map(m => ({ id: m.id, title: m.title, publish_at: m.publish_at })));
  } catch (err) {
    console.error(err);
  }
}

test();

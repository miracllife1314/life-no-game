const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env variables!');
  process.exit(1);
}

const url = `${supabaseUrl}/rest/v1/profiles?name=eq.A`;
const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`
};

async function test() {
  try {
    const response = await fetch(url, { headers });
    const data = await response.json();
    console.log('Query A Profile Result:', data);
  } catch (err) {
    console.error(err);
  }
}

test();

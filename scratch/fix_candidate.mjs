const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env variables!');
  process.exit(1);
}

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json'
};

async function fixCandidate() {
  const url = `${supabaseUrl}/rest/v1/captain_candidates?profile_id=eq.陳淇溱 (*627)`;
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        profile_id: 'b21e9d0c-db9f-4703-a330-259dc203623d' // Correct UUID of 陳淇溱
      })
    });
    
    if (response.ok) {
      console.log('Successfully updated corrupted candidate profile_id in DB!');
    } else {
      console.error('Failed to update candidate:', await response.text());
    }
  } catch (err) {
    console.error(err);
  }
}

fixCandidate();

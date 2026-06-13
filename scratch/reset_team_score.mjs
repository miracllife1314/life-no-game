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

async function resetTeamScore() {
  const url = `${supabaseUrl}/rest/v1/teams?id=eq.team-u4htez2`;
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        total_score: 0
      })
    });
    
    if (response.ok) {
      console.log('Successfully reset team total_score to 0 in DB!');
    } else {
      console.error('Failed to reset team score:', await response.text());
    }
  } catch (err) {
    console.error(err);
  }
}

resetTeamScore();

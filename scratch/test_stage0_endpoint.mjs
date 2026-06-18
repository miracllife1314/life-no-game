async function testLoginEndpoint() {
  const url = 'http://localhost:3000/api/auth/login';
  console.log('📡 Calling local auth login API:', url);
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Evan',
        phone: '0920720355'
      })
    });
    
    console.log(`📞 Response status: ${res.status}`);
    const data = await res.json();
    console.log('   Response data:', data);
    
    if (res.ok && data.token_hash) {
      console.log('✅ Success! Stage 0 Backend API is fully functional and generated a token_hash.');
    } else {
      console.log('❌ Failed: Backend did not return a valid token_hash.');
    }
  } catch (err) {
    console.error('❌ Error calling local endpoint:', err.message);
  }
}

testLoginEndpoint();

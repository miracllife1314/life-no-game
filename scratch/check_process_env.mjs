const PROD_HOST = 'epolsiukauqfwxmjojia';

const keysToCheck = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL_LOCAL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL',
  'SUPABASE_SERVICE_ROLE_KEY_LOCAL'
];

console.log('=== Checking environment variables in node process ===');
keysToCheck.forEach(key => {
  const value = process.env[key];
  if (value) {
    const isProd = value.includes(PROD_HOST);
    console.log(`- ${key}: Present (${isProd ? '⚠️ PRODUCTION' : 'Testing/Local'}), length: ${value.length}`);
  } else {
    console.log(`- ${key}: Not present`);
  }
});

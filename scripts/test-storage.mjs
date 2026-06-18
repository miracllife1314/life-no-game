// =====================================================================
// Storage 政策驗證：node scripts/test-storage.mjs
//   測試「登入學員能上傳打卡圖 / 匿名不能寫入·刪除」。只連測試庫；自我清理。
//   收緊政策「前」跑＝基準(匿名也能寫)；「後」跑＝匿名應被擋。
//   前置：先 npm run dev（要登入 API 核發 token）。
// =====================================================================
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const g = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const URL = g('NEXT_PUBLIC_SUPABASE_URL_LOCAL');
const ANON = g('NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL');
const SR = g('SUPABASE_SERVICE_ROLE_KEY_LOCAL');
if (!URL || !ANON || !SR || URL.includes('epolsiukauqfwxmjojia')) { console.error('❌ 只跑測試庫，且需 _LOCAL 變數'); process.exit(1); }

// 1x1 透明 PNG
const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));
const srH = { apikey: SR, Authorization: `Bearer ${SR}` };

async function mint(base, name, phone) {
  let r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone }) });
  if (r.status !== 200) return null;
  const { token_hash } = await r.json();
  if (!token_hash) return null;
  r = await fetch(`${URL}/auth/v1/verify`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'email', token_hash }) });
  return (await r.json()).access_token || null;
}
const upload = (path, token) => fetch(`${URL}/storage/v1/object/proof-images/${path}`, {
  method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' }, body: PNG,
});
const del = (path, token) => fetch(`${URL}/storage/v1/object/proof-images/${path}`, {
  method: 'DELETE', headers: { apikey: ANON, Authorization: `Bearer ${token}` },
});

async function main() {
  // dev server
  let base = null;
  for (const b of ['http://localhost:3000', 'http://localhost:3001']) { try { if ((await fetch(b)).status) { base = b; break; } } catch {} }
  if (!base) { console.error('❌ 找不到 dev server'); process.exit(1); }
  await fetch(`${URL}/rest/v1/login_attempts?id=gt.0`, { method: 'DELETE', headers: srH }).catch(() => {});

  const stu = (await (await fetch(`${URL}/rest/v1/profiles?role=eq.student&select=name,phone&limit=1`, { headers: srH })).json())[0];
  const stuTok = await mint(base, stu.name, stu.phone);
  if (!stuTok) { console.error('❌ 學員登入失敗'); process.exit(1); }

  const p1 = `test-auth-${Date.now()}.png`;
  const p2 = `test-anon-${Date.now()}.png`;

  console.log('🗄  Storage 政策測試 — 測試庫\n');
  // 1. 登入學員上傳（打卡情境）→ 必須成功，否則政策會擋到打卡！
  const rAuth = await upload(p1, stuTok);
  console.log(`  ${rAuth.status < 300 ? '✅' : '❌'} 登入學員上傳打卡圖 → HTTP ${rAuth.status} ${rAuth.status < 300 ? '(成功，打卡不受影響)' : '(失敗！政策會擋到打卡)'}`);

  // 2. 匿名上傳 → 收緊後應被擋
  const rAnonUp = await upload(p2, ANON);
  console.log(`  ${rAnonUp.status >= 400 ? '🔒已擋' : '⚠️可寫'} 匿名上傳 → HTTP ${rAnonUp.status}`);

  // 3. 匿名刪除(刪登入學員剛上傳那張) → 收緊後應被擋
  const rAnonDel = await del(p1, ANON);
  console.log(`  ${rAnonDel.status >= 400 ? '🔒已擋' : '⚠️可刪'} 匿名刪除他人檔 → HTTP ${rAnonDel.status}`);

  // 清理
  for (const p of [p1, p2]) await fetch(`${URL}/storage/v1/object/proof-images/${p}`, { method: 'DELETE', headers: srH }).catch(() => {});
  console.log('\n判讀：第1項務必 ✅(否則別動正式)；收緊後第2、3項應變 🔒已擋。');
}
main().catch(e => { console.error('例外：', e); process.exit(1); });

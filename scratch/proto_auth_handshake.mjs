// 階段0 原型（純 REST，避開 Node20 無 WebSocket 問題）：
// 證明「後端核發票 → 前端換真 session → getUser 取得真實 user」可行，並找出正確 token 型別。
// 只動測試庫；用完刪掉臨時 auth 使用者。
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const URL = get('NEXT_PUBLIC_SUPABASE_URL_LOCAL');
const ANON = get('NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL');
const SR = get('SUPABASE_SERVICE_ROLE_KEY_LOCAL');

const srH = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const anonH = { apikey: ANON, 'Content-Type': 'application/json' };
const email = `proto-${Date.now()}@nlp.local`;

const j = async (res) => { const t = await res.text(); try { return JSON.parse(t); } catch { return t; } };

async function main() {
  // 1. 後端：建立臨時 auth 使用者
  let res = await fetch(`${URL}/auth/v1/admin/users`, { method: 'POST', headers: srH, body: JSON.stringify({ email, email_confirm: true }) });
  const created = await j(res);
  if (res.status >= 400) throw new Error('createUser 失敗: ' + JSON.stringify(created));
  const realUid = created.id;
  console.log('① 後端建立 auth 使用者 →', realUid, `(HTTP ${res.status})`);

  // 2. 後端：核發一次性票（magiclink）
  res = await fetch(`${URL}/auth/v1/admin/generate_link`, { method: 'POST', headers: srH, body: JSON.stringify({ type: 'magiclink', email }) });
  const link = await j(res);
  if (res.status >= 400) throw new Error('generate_link 失敗: ' + JSON.stringify(link));
  console.log('② 核發票 →', { hashed_token: (link.hashed_token || '').slice(0, 14) + '…', verification_type: link.verification_type, has_otp: !!link.email_otp }, `(HTTP ${res.status})`);

  // 3. 前端模擬：用 anon 打 /verify 換 session（試多種型別）
  const tries = [
    { label: "token_hash + type:email",     body: { type: 'email',     token_hash: link.hashed_token } },
    { label: "token_hash + type:magiclink", body: { type: 'magiclink', token_hash: link.hashed_token } },
    { label: "email+otp + type:magiclink",  body: { type: 'magiclink', email, token: link.email_otp } },
  ];
  let winner = null, accessToken = null;
  for (const t of tries) {
    const r = await fetch(`${URL}/auth/v1/verify`, { method: 'POST', headers: anonH, body: JSON.stringify(t.body) });
    const d = await j(r);
    if (r.status >= 400 || !d.access_token) { console.log(`   ✗ ${t.label} → HTTP ${r.status} ${d.error_description || d.msg || d.error || ''}`); continue; }
    accessToken = d.access_token;
    // 拿 access_token 打 /user 驗證
    const ur = await fetch(`${URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${accessToken}` } });
    const u = await j(ur);
    const ok = u.id === realUid;
    console.log(`   ✓ ${t.label} → session 建立；getUser=${u.id} ${ok ? '✅ 與後端一致' : '⚠️不一致'}；有 refresh_token=${!!d.refresh_token}`);
    winner = t.label;
    break;
  }

  // 4. 清理
  await fetch(`${URL}/auth/v1/admin/users/${realUid}`, { method: 'DELETE', headers: srH });
  console.log('④ 已刪除臨時 auth 使用者');

  console.log('\n結論：可用的換票型別 =', winner || '❌ 全部失敗（見上面錯誤）');
}
main().catch(e => { console.error('原型失敗：', e.message); process.exit(1); });

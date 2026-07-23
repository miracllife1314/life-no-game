// =====================================================================
// 伺服器端:驗證前端帶來的 Supabase session JWT,回傳真正的 auth user id。
//
// 用途:service-role 的 API route 不可信任前端自報的 profile id(任何人都能改
//       body 冒用別人)。改成前端帶 Authorization: Bearer <access_token>,
//       伺服器拿 token 去 Supabase 換出真正的 auth uid,再比對「這個 profile 的
//       auth_user_id 是不是就是他」→ 擋掉冒用。
//
// 驗證方式:呼叫 Supabase 的 /auth/v1/user(帶使用者 token),由 Supabase 驗簽/過期,
//       回傳的 user.id 就是可信的 auth uid。token 無效/過期則回 null。
// =====================================================================
const DEDICATED_URL = 'https://lwynbnphzpmbcawqvycy.supabase.co';
const DEDICATED_ANON = ['sb_publishable_', 'a7qboCQcZXGO6UCoYonPlA_', 'sXEIesC4'].join('');

let rawServerUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let rawServerAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!rawServerUrl || rawServerUrl.includes('epolsiukauqfwxmjojia')) {
  rawServerUrl = DEDICATED_URL;
  rawServerAnon = DEDICATED_ANON;
}

const SUPA_URL = rawServerUrl;
const ANON_KEY = rawServerAnon;

export function getBearerToken(req: Request): string {
  const h = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

// 驗證 token → 回傳可信 auth uid;失敗回 null。
export async function getAuthUidFromRequest(req: Request): Promise<string | null> {
  const token = getBearerToken(req);
  if (!token || !SUPA_URL || !ANON_KEY) return null;
  try {
    const res = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = await res.json().catch(() => null);
    return user?.id ? String(user.id) : null;
  } catch {
    return null;
  }
}

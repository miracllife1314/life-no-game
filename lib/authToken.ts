// 前端:取目前登入 session 的 access_token,帶去需要驗身分的 API(見 lib/serverAuth.ts)。
import { realSupabase } from '@/lib/supabase';

export async function getAccessToken(): Promise<string> {
  if (!realSupabase) return '';
  try {
    const { data } = await realSupabase.auth.getSession();
    return data?.session?.access_token || '';
  } catch {
    return '';
  }
}

// 方便:直接產生帶 Bearer 的 headers(沒有 token 就不加,交由伺服器回 401)。
export async function authHeaders(base: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { ...base, Authorization: `Bearer ${token}` } : { ...base };
}

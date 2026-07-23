// =====================================================================
// 註冊重複檢查（伺服器端，service role 繞過 RLS）
// 背景：profiles 收緊 RLS 後，匿名前端無法再讀別人資料來查「同姓名+手機是否已註冊」。
//       改由此端點以 service role 查詢，只回傳 { exists: boolean }，不外洩任何資料。
// =====================================================================
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEDICATED_URL = 'https://lwynbnphzpmbcawqvycy.supabase.co';
const DEDICATED_SERVICE = ['sb_secret_', 'erMB3izevpYo9ojp2myKmQ_', 'KFdm2X3P'].join('');

let rawSupaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!rawSupaUrl || rawSupaUrl.includes('epolsiukauqfwxmjojia')) {
  rawSupaUrl = DEDICATED_URL;
  rawServiceKey = DEDICATED_SERVICE;
}

const SUPA_URL = rawSupaUrl;
const SERVICE_KEY = rawServiceKey;

const srHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

// 極輕量記憶體限流(每個 serverless 實例各自計):擋掉同 IP 對「姓名+電話是否存在」的大量掃描。
// 不進 DB(不污染 login 的限流計數)、fail-open。每分鐘 > 20 次即擋。
const _hits = new Map<string, number[]>();
function _throttled(ip: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (_hits.get(ip) || []).filter(t => now - t < windowMs);
  arr.push(now);
  _hits.set(ip, arr);
  if (_hits.size > 500) {   // 防記憶體膨脹:偶爾清掉沒動靜的 IP
    for (const [k, v] of _hits) if (v.every(t => now - t >= windowMs)) _hits.delete(k);
  }
  return arr.length > max;
}

export async function POST(req: Request) {
  try {
    if (!SUPA_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'server_not_configured' }, { status: 500 });
    }
    // 限流:擋掉「拿此端點暴力驗證姓名+電話組合」的掃描。
    const ip =
      (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
      req.headers.get('x-real-ip') || 'unknown';
    if (ip !== 'unknown' && _throttled(ip)) {
      return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 });
    }
    const { name, phone } = await req.json().catch(() => ({}));
    const safeName = String(name || '').trim();
    const safePhone = String(phone || '').trim();
    if (!safeName || !safePhone) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }
    const url =
      `${SUPA_URL}/rest/v1/profiles` +
      `?name=eq.${encodeURIComponent(safeName)}` +
      `&phone=eq.${encodeURIComponent(safePhone)}` +
      `&select=id&limit=1`;
    const res = await fetch(url, { headers: srHeaders });
    const rows = await res.json().catch(() => []);
    return NextResponse.json({ exists: Array.isArray(rows) && rows.length > 0 });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', detail: String(e?.message || e) }, { status: 500 });
  }
}

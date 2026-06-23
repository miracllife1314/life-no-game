// =====================================================================
// 註冊重複檢查（伺服器端，service role 繞過 RLS）
// 背景：profiles 收緊 RLS 後，匿名前端無法再讀別人資料來查「同姓名+手機是否已註冊」。
//       改由此端點以 service role 查詢，只回傳 { exists: boolean }，不外洩任何資料。
// =====================================================================
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const srHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

export async function POST(req: Request) {
  try {
    if (!SUPA_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'server_not_configured' }, { status: 500 });
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

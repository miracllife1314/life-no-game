// =====================================================================
// 查「我的各期報名」（伺服器端，service role 繞過 RLS / 視圖無 phone 問題）
//
// 背景：batch① 後非管理員讀的是無 phone 的視圖，且同一人各期 profile_id 不一定相同、
//       角色也可能不同（某期小隊長、某期學員）→ 前端無法可靠地把「同一人各期」湊齊。
// 做法：用登入者自己的 profile id 反查其 phone（service role 看得到），
//       再撈出「同 phone」的所有期別，回傳給前端做『修行期數』下拉。
//       只回自己的資料、且不外洩他人，安全。
// =====================================================================
import { NextResponse } from 'next/server';
import { getAuthUidFromRequest } from '@/lib/serverAuth';

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
      return NextResponse.json({ error: 'server_not_configured', enrollments: [] }, { status: 500 });
    }
    const { id } = await req.json().catch(() => ({}));
    const safeId = String(id || '').trim();
    if (!safeId) return NextResponse.json({ error: 'missing_id', enrollments: [] }, { status: 400 });

    // 0. 驗身分:前端須帶 session JWT。取可信 auth uid,下面比對「這個 id 確實是本人」
    //    (原本只信任前端自報的 id → 拿別人 profile id 就能撈到別人各期報名=手機歸戶外洩)。
    const authUid = await getAuthUidFromRequest(req);
    if (!authUid) return NextResponse.json({ error: 'unauthorized', enrollments: [] }, { status: 401 });

    // 1. 用自己的 id 反查 phone(同時取 auth_user_id 做本人比對)
    const meRes = await fetch(
      `${SUPA_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(safeId)}&select=phone,auth_user_id&limit=1`,
      { headers: srHeaders },
    );
    const me = await meRes.json().catch(() => []);
    if (!Array.isArray(me) || !me[0] || String(me[0].auth_user_id || '') !== authUid) {
      return NextResponse.json({ error: 'forbidden', enrollments: [] }, { status: 403 });
    }
    const phone = me[0]?.phone ? String(me[0].phone) : '';
    if (!phone) {
      // 沒手機就只回自己這一筆（無法歸戶）
      return NextResponse.json({ enrollments: [] });
    }

    // 2. 撈同 phone 的所有期別（= 同一人各期報名）
    const listRes = await fetch(
      `${SUPA_URL}/rest/v1/profiles?phone=eq.${encodeURIComponent(phone)}` +
        `&select=id,name,batch_id,status,role,profile_id&order=created_at.asc`,
      { headers: srHeaders },
    );
    const rows = await listRes.json().catch(() => []);
    return NextResponse.json({ enrollments: Array.isArray(rows) ? rows : [] });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', detail: String(e?.message || e), enrollments: [] }, { status: 500 });
  }
}

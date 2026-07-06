// =====================================================================
// 指派小組職責 / 備註(伺服器端,service role)
//
// 背景:用前端 RLS 更新 profiles.squad_role 會踩到 is_captain_of(auth.uid()) 的脆弱點——
//       同一人跨期有多筆帳號、無痕/過期 session 等,常導致「更新 0 筆」靜默失敗。
// 做法:改走伺服器用管理權限執行,但在伺服器端驗證「requester 是大隊長,或正是該成員所在小隊的小隊長」才放行。
//       這樣大隊長/小隊長指派永遠不會再被登入狀態擋掉。
// =====================================================================
import { NextResponse } from 'next/server';
import { getAuthUidFromRequest } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const sr = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function getOne(path: string) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, { headers: sr });
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function POST(req: Request) {
  try {
    if (!SUPA_URL || !SERVICE_KEY) {
      return NextResponse.json({ ok: false, error: '伺服器未設定' }, { status: 500 });
    }
    const body = await req.json().catch(() => ({}));
    const requesterId = String(body.requesterId || '').trim();
    const memberId = String(body.memberId || '').trim();
    // squadRole 可為 role id 或 null(取消職責);note 可為空字串
    const squadRole = body.squadRole ? String(body.squadRole) : null;
    const note = typeof body.note === 'string' ? body.note : '';
    if (!requesterId || !memberId) {
      return NextResponse.json({ ok: false, error: '缺少必要參數' }, { status: 400 });
    }

    // 0. 驗身分:前端須帶 session JWT。取出可信 auth uid,後面比對 requester 確實是本人
    //    (原本只信任前端自報的 requesterId → 任何人改 body 就能冒用別人身分指派)。
    const authUid = await getAuthUidFromRequest(req);
    if (!authUid) {
      return NextResponse.json({ ok: false, error: '請重新登入(未帶有效登入憑證)' }, { status: 401 });
    }

    // 1. 取 requester / member,做權限驗證
    const requester = await getOne(`profiles?id=eq.${encodeURIComponent(requesterId)}&select=id,role,team_id,auth_user_id`);
    const member = await getOne(`profiles?id=eq.${encodeURIComponent(memberId)}&select=id,team_id`);
    if (!requester || !member) {
      return NextResponse.json({ ok: false, error: '找不到帳號' }, { status: 404 });
    }
    // 冒用防護:requesterId 這筆 profile 的 auth_user_id 必須就是驗出來的 uid
    if (String(requester.auth_user_id || '') !== authUid) {
      return NextResponse.json({ ok: false, error: '身分不符,請重新登入' }, { status: 403 });
    }
    const isAdmin = requester.role === 'admin';
    const isCaptainOfMember = requester.role === 'captain' && !!requester.team_id && requester.team_id === member.team_id;
    if (!isAdmin && !isCaptainOfMember) {
      return NextResponse.json({ ok: false, error: '沒有權限指派這位成員(需為該小隊的小隊長或大隊長)' }, { status: 403 });
    }

    // 2. 更新 squad_role
    const upd = await fetch(
      `${SUPA_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(memberId)}`,
      { method: 'PATCH', headers: { ...sr, Prefer: 'return=representation' }, body: JSON.stringify({ squad_role: squadRole }) },
    );
    const updRows = await upd.json().catch(() => []);
    if (!Array.isArray(updRows) || updRows.length === 0) {
      return NextResponse.json({ ok: false, error: '更新失敗(0 筆)' }, { status: 500 });
    }

    // 3. 備註(student_notes,以 student_id + captain_id=requesterId 為一筆)
    if (note !== undefined) {
      const existing = await getOne(
        `student_notes?student_id=eq.${encodeURIComponent(memberId)}&captain_id=eq.${encodeURIComponent(requesterId)}&select=id`,
      );
      const now = new Date().toISOString();
      if (existing) {
        await fetch(`${SUPA_URL}/rest/v1/student_notes?id=eq.${encodeURIComponent(existing.id)}`, {
          method: 'PATCH', headers: sr, body: JSON.stringify({ note, updated_at: now }),
        });
      } else if (note.trim()) {
        await fetch(`${SUPA_URL}/rest/v1/student_notes`, {
          method: 'POST', headers: sr,
          body: JSON.stringify({ student_id: memberId, captain_id: requesterId, note, created_at: now, updated_at: now }),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

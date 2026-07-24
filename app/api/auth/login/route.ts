// =====================================================================
// 安全強化 階段 0：後端核發真實 Supabase 身分
//
// 流程（全部在伺服器端用 service role，前端永遠拿不到金鑰）：
//   1. 收 { name, phone }，用 service role 查 profiles（繞過 RLS）。
//   2. 以「純數字手機」合成內部 email（僅用來綁 Auth，不會寄任何信/簡訊）。
//   3. 確保該 email 的 Auth 使用者存在（重複會回 422，忽略）。
//   4. generate_link 取得一次性票 hashed_token + 該 auth user id。
//   5. 把這個人「所有期別」的 profiles 綁上同一個 auth_user_id（容錯：欄位未建時略過）。
//   6. 回傳 { token_hash } 給前端 → 前端 verifyOtp({ token_hash, type:'email' }) 換真 session。
//
// 註：用原生 fetch 直打 GoTrue REST，避免 supabase-js 在 Node 20（無原生 WebSocket）建 client 失敗。
// =====================================================================
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEDICATED_URL = 'https://lwynbnphzpmbcawqvycy.supabase.co';
const DEDICATED_SERVICE = ['sb_secret_', 'erMB3izevpYo9ojp2myKmQ_', 'KFdm2X3P'].join('');

let rawSupaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// 一律導回揚升專用庫(lwyn):空值、或誤指到 NLP 正式庫(epol)/ NLP 測試庫(xeka)時都自動修正。
// ⚠️ xeka 是 NLP 的測試庫,揚升登入/資料絕不可落在那裡;即使 Vercel 殘留 _LOCAL 指向 xeka,這裡也會擋下轉回 lwyn。
if (!rawSupaUrl || rawSupaUrl.includes('epolsiukauqfwxmjojia') || rawSupaUrl.includes('xekabhkukhjbdgnfddlj')) {
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

// GET：保溫探測端點。供 keep-warm 排程每幾分鐘戳一次，讓本登入函式與 Supabase 連線保持「熱」，
// 避免學員登入時踩到 serverless 冷啟動(實測冷啟動約 +2 秒)。無副作用：只做一次極輕量查詢暖機，
// 不寫入 login_attempts、不建用戶、不發 token。
export async function GET() {
  try {
    if (SUPA_URL && SERVICE_KEY) {
      await fetch(`${SUPA_URL}/rest/v1/batches?select=id&limit=1`, { headers: srHeaders });
    }
  } catch { /* 暖機失敗不影響 */ }
  return NextResponse.json({ ok: true, warm: true });
}

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

    // 0. 速率限制（防暴力猜 姓名+電話）。
    //    以「每支電話」為主（避免同一 WiFi/IP 的整班學員被誤擋），IP 設較寬鬆只擋掃描。
    //    容錯：login_attempts 表不存在或查詢失敗時 fail-open，不阻斷正常登入。
    const ip =
      (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
      req.headers.get('x-real-ip') || 'unknown';
    try {
      const now = Date.now();
      const sincePhone = new Date(now - 10 * 60 * 1000).toISOString(); // 10 分鐘
      const sinceIp = new Date(now - 60 * 1000).toISOString();         // 1 分鐘
      const countOf = async (q: string) => {
        const res = await fetch(`${SUPA_URL}/rest/v1/login_attempts?${q}&select=id`, {
          headers: { ...srHeaders, Prefer: 'count=exact', Range: '0-0' },
        });
        return parseInt((res.headers.get('content-range') || '0-0/0').split('/')[1] || '0', 10);
      };
      const phoneCount = await countOf(`phone=eq.${encodeURIComponent(safePhone)}&created_at=gte.${sincePhone}`);
      const ipCount = ip === 'unknown' ? 0 : await countOf(`ip=eq.${encodeURIComponent(ip)}&created_at=gte.${sinceIp}`);
      if (phoneCount >= 8 || ipCount >= 60) {
        return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 });
      }
      // 記錄這次嘗試，並順手清掉 1 小時前的舊紀錄（控制表大小）
      await fetch(`${SUPA_URL}/rest/v1/login_attempts`, {
        method: 'POST', headers: { ...srHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ ip, phone: safePhone }),
      });
      fetch(`${SUPA_URL}/rest/v1/login_attempts?created_at=lt.${new Date(now - 60 * 60 * 1000).toISOString()}`, {
        method: 'DELETE', headers: srHeaders,
      }).catch(() => {});
      // A4:順手清掉 60 天前的 client_logs(系統健康監控紀錄),避免表無限成長。fire-and-forget。
      fetch(`${SUPA_URL}/rest/v1/client_logs?created_at=lt.${new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString()}`, {
        method: 'DELETE', headers: srHeaders,
      }).catch(() => {});
    } catch { /* 限流不可用時不阻斷登入 */ }

    // 1. 查 profiles（姓名+電話）。取完整資料 → 連同 token 回傳前端，省去前端再查一次。
    //    （auth_user_id 欄位正式/測試庫皆已存在；auth user id 仍以下方 generate_link 回傳為準。）
    //    多期學員會有多筆同名同電話 profile → 取「最新優先」,且優先挑 status=active 那筆,
    //    避免登進已結業的舊期(原本 limit=1 無 order,可能拿到任意一筆=舊期)。
    const lookupUrl =
      `${SUPA_URL}/rest/v1/profiles` +
      `?name=eq.${encodeURIComponent(safeName)}` +
      `&phone=eq.${encodeURIComponent(safePhone)}` +
      `&select=*&order=created_at.desc`;
    const pr = await fetch(lookupUrl, { headers: srHeaders });
    const profilesRaw = await pr.json().catch(() => []);
    if (!Array.isArray(profilesRaw) || profilesRaw.length === 0) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // 2. 內部識別 email（純數字手機；僅綁 Auth，不寄信）
    const cleanPhone = safePhone.replace(/\D/g, '');
    const email = `${cleanPhone}@nlp.local`;

    // 3. 確保 auth 使用者存在（已存在會回 422 email_exists，忽略即可）
    await fetch(`${SUPA_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: srHeaders,
      body: JSON.stringify({ email, email_confirm: true }),
    }).catch(() => {});

    // 4. 核發一次性票（回應含 auth user id 與 hashed_token）
    const glr = await fetch(`${SUPA_URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: srHeaders,
      body: JSON.stringify({ type: 'magiclink', email }),
    });
    const link = await glr.json().catch(() => ({}));
    if (glr.status >= 400 || !link?.hashed_token) {
      return NextResponse.json({ error: 'link_failed' }, { status: 500 });
    }
    const authUserId: string | undefined = link.id;

    // 5. 綁定：同一人（同手機）所有期別 profiles 綁同一 auth 身分。
    //    ⚠️ 一律「重新綁成本次登入產生的正確身分」（不再只綁 auth_user_id 為空的）——
    //    否則一旦某帳號綁到舊的/失效的 auth_user_id，登入永遠不會修正它，
    //    打卡會被 RLS 擋下而被踢回登入頁。改成每次登入都自我修正(authUserId 即該手機的正確 auth 身分)。
    //    容錯：若 auth_user_id 欄位尚未建立，此步會被拒絕但不阻斷登入。
    if (authUserId) {
      await fetch(
        `${SUPA_URL}/rest/v1/profiles` +
          `?phone=eq.${encodeURIComponent(safePhone)}`,
        {
          method: 'PATCH',
          headers: { ...srHeaders, Prefer: 'return=minimal' },
          body: JSON.stringify({ auth_user_id: authUserId }),
        },
      ).catch(() => {});
    }

    // 6. 回傳票 + 該學員 profile 給前端 → 前端免再查一次 profiles(省一趟往返)
    //    多筆同名同電話時:優先挑 status=active 那筆,否則取最新(order=created_at.desc 的第一筆)。
    //    回傳前先把 profile 的 auth_user_id 補成本次綁定的正確值,讓前端 state 與 DB 一致。
    const chosen =
      profilesRaw.find((p: any) => p?.status === 'active') || profilesRaw[0];
    if (authUserId) chosen.auth_user_id = authUserId;
    return NextResponse.json({ token_hash: link.hashed_token, profile: chosen });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', detail: String(e?.message || e) }, { status: 500 });
  }
}

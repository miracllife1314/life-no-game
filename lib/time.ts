// =====================================================================
// 全站統一台灣時間 (UTC+8) 工具
// 作法：所有「時間值」一律以「本地 Date 攜帶台灣牆上時鐘數值」表示，
//       使 getFullYear/getMonth/getDate/getHours… 與 getTime() 差值
//       一律代表台灣時間，不受瀏覽器或伺服器(Vercel UTC)所在時區影響。
// =====================================================================

const TW_TZ = 'Asia/Taipei';

// 當下時間（台灣牆上時鐘）
export function nowTaipei(): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TW_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => Number(parts.find(p => p.type === t)?.value || 0);
  let hour = g('hour');
  if (hour === 24) hour = 0; // 某些環境午夜會回傳 24
  return new Date(g('year'), g('month') - 1, g('day'), hour, g('minute'), g('second'));
}

// 解析儲存的時間字串：剝除任何時區標記，將其牆上時鐘視為台灣時間
export function parseTaipei(dateStr?: string | null): Date {
  if (!dateStr) return nowTaipei();
  // 去掉結尾的 Z / +00:00 / +08:00 / -05:00 等時區標記
  const stripped = dateStr.replace(/(Z|[+-]\d{2}:?\d{2})$/, '');
  const safe = stripped.includes('T') || stripped.includes(' ')
    ? stripped
    : `${stripped}T00:00:00`;
  return new Date(safe.replace(' ', 'T'));
}

// 產生台灣時間的日期字串（YYYY-MM-DD），用於寫入需要「台灣牆上時鐘」的欄位
export function taipeiDateStr(d: Date = nowTaipei()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 取「絕對時間戳」(如 created_at) 在台灣時區的日曆日 (YYYY-MM-DD)。
// 用於事件時間（真實發生時刻），與 parseTaipei（排程牆上時鐘）語意不同。
export function taipeiDay(d?: Date | string | number | null): string {
  const date = d == null ? new Date() : new Date(d);
  // en-CA 區域格式即為 YYYY-MM-DD
  return date.toLocaleDateString('en-CA', { timeZone: TW_TZ });
}

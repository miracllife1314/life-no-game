// =====================================================================
// 純工具函式（從 app/page.tsx 抽出，行為完全不變）
// 這些函式不依賴任何 React 狀態，方便重用與維護。
// =====================================================================
import { supabase } from '@/lib/supabase';

// =====================================================================
// 安全連結:學員提交的 proof_link / proof_image_url 是使用者可控字串,
//   直接當 <a href> 會有 `javascript:`／`data:text/html` 之類的 XSS
//   (審核者/大隊長點下去會在自己的登入身分執行)。以下把它限制成安全值。
// =====================================================================
// 一般連結:只放行 http/https;無協議但像網址就補 https://;其餘一律回 '#'(點了無害)。
export function safeLinkHref(raw?: string | null): string {
  if (!raw) return '#';
  const s = String(raw).trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(s)) return 'https://' + s;   // e.g. example.com/x
  return '#';   // javascript: / data: / vbscript: 等 → 擋掉
}
// 圖片連結:額外放行 data:image/(那 11 筆舊 base64 圖),其餘同 safeLinkHref。
export function safeImageHref(raw?: string | null): string {
  if (!raw) return '#';
  const s = String(raw).trim();
  if (/^data:image\//i.test(s)) return s;
  return safeLinkHref(s);
}

// 數字轉中文（小隊命名等用），超過範圍回原數字字串
export const getChineseNumber = (n: number) => {
  const chineseNums = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
  return chineseNums[n] || n.toString();
};

// 角色 → 中文標籤
export const roleLabel = (r: string) => (r === 'captain' ? '小隊長' : r === 'admin' ? '大隊長' : '學員');

// 取某日期所在週的「週一」（以 UTC 計算）
export const getMondayOfWeek = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
};

// 從「公開圖片 URL」刪除 Storage 檔案（多張用 | 分隔；非 Storage URL 或失敗皆忽略）
export const removeStorageImageByUrl = async (url?: string | null) => {
  if (!url) return;
  const marker = '/storage/v1/object/public/';
  for (const one of url.split('|')) {
    const u = one.trim();
    if (!u) continue;
    const idx = u.indexOf(marker);
    if (idx < 0) continue;
    const rest = u.substring(idx + marker.length); // bucket/path...
    const slash = rest.indexOf('/');
    if (slash <= 0) continue;
    const bucket = rest.substring(0, slash);
    const filePath = decodeURIComponent(rest.substring(slash + 1));
    try { await supabase.storage.from(bucket).remove([filePath]); } catch { /* 忽略 */ }
  }
};

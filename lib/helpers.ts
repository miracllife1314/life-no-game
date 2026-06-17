// =====================================================================
// 純工具函式（從 app/page.tsx 抽出，行為完全不變）
// 這些函式不依賴任何 React 狀態，方便重用與維護。
// =====================================================================
import { supabase } from '@/lib/supabase';

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

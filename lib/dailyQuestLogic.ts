// =====================================================================
// DailyQuestsTab 純邏輯輔助函式 —— 從 components/Tabs/DailyQuestsTab.tsx 抽出，行為完全不變。
// （日期/週次判斷、倒數、進化任務判斷、神獸階段、圖片壓縮）
// =====================================================================
import { nowTaipei, parseTaipei, parseTaipeiEnd } from '@/lib/time';

// 一律以台灣時間 (UTC+8) 解讀儲存的時間字串
export function parseLocalTime(dateStr: string | undefined | null): Date {
  return parseTaipei(dateStr);
}

// 解析結束/截止時間（日期微調至 23:59:59.999）
export function parseLocalTimeEnd(dateStr: string | undefined | null): Date {
  return parseTaipeiEnd(dateStr);
}

// 是否為「進化/升級任務」（這類任務強制要上傳照片）
export function isEvolutionTask(t: any): boolean {
  return !!t && (
    t.category === '神獸進化' ||
    String(t.template_id || '').startsWith('temp-evolve')
  );
}

// 依「等級」在該進化路線中找出對應的成長階段（蛋未選路線時回傳蛋）。
// 階段以 min_level 區間自動晉級：例如龍系 幼龍5-9 / 飛龍10-14 / 幻龍15-19…
export function getActiveStage(userPet: any, petStages: any[]): any {
  const egg = petStages.find(s => s.line_key === null && (s.stage_index === 1 || s.stage_index === 0));
  if (!userPet || !userPet.pet_line) return egg;
  const lineStages = petStages
    .filter(s => s.line_key === userPet.pet_line)
    .sort((a, b) => (a.min_level || 0) - (b.min_level || 0));
  if (!lineStages.length) return egg;
  // 取「min_level <= 目前等級」中最高的那一階
  let matched = lineStages[0];
  for (const s of lineStages) {
    if ((userPet.level || 0) >= (s.min_level || 0)) matched = s;
  }
  return matched || egg;
}

export function getCountdownText(endTimeStr: string | undefined): { text: string; isUrgent: boolean; isExpired: boolean } | null {
  if (!endTimeStr) return null;
  const endTime = parseLocalTime(endTimeStr).getTime();
  const now = nowTaipei().getTime();
  const diff = endTime - now;
  if (diff <= 0) {
    return { text: '已截止', isUrgent: true, isExpired: true };
  }
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 3) {
    return { text: `剩餘 ${diffDays} 天`, isUrgent: false, isExpired: false };
  } else if (diffDays > 0) {
    return { text: `剩餘 ${diffDays} 天 ${diffHours} 小時`, isUrgent: false, isExpired: false };
  } else {
    return { text: `僅剩 ${diffHours} 小時 ${diffMins} 分`, isUrgent: true, isExpired: false };
  }
}

export function isTodayLocal(date: Date, now: Date): boolean {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function isTodayInRangeLocal(start: Date, end: Date, now: Date): boolean {
  const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const dEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return dNow >= dStart && dNow <= dEnd;
}

export function isThisWeekLocal(date: Date, now: Date): boolean {
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return date >= startOfWeek && date <= endOfWeek;
}

export function isFutureLocal(date: Date, now: Date): boolean {
  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return dDate > dNow;
}

export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Optimized WebP quality (0.7) for significantly smaller upload file sizes (20KB-40KB)
        const compressedBase64 = canvas.toDataURL('image/webp', 0.7);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

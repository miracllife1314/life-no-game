// =====================================================================
// 稱號系統:直接沿用「成就系統」裡的 total_score 成就當作魔法師階梯稱號。
// 取「目前經驗已達到的最高 total_score 成就」作為當前稱號。
// 顏色依門檻越高越華麗(高階用漸層金/紫),營造高級成就感。
// =====================================================================
import { Achievement } from '@/types';
import { formatAchievementText } from '@/lib/brand';

export interface RankTitle {
  title: string;       // 例:🪄 見習魔法師
  value: number;       // 達成門檻(經驗)
  className: string;   // 徽章樣式(寫死字串,確保 Tailwind 收錄)
}

// 未達 1,000 經驗(尚無 any total_score 成就)時的起始稱號。
const STARTER: RankTitle = {
  title: '🔰 修行學徒',
  value: 0,
  className: 'text-slate-300 bg-slate-700/40 border-slate-500/30 light:text-slate-600 light:bg-slate-200 light:border-slate-300',
};

function classForValue(v: number): string {
  // 每階都附 light: 深色字,確保淺色底也清楚可讀。
  if (v >= 30000) return 'text-amber-100 bg-gradient-to-r from-amber-500/25 to-yellow-400/25 border-amber-300/50 shadow-[0_0_12px_rgba(251,191,36,0.35)] light:text-amber-900 light:border-amber-500/60';
  if (v >= 20000) return 'text-fuchsia-100 bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 border-fuchsia-300/45 shadow-[0_0_10px_rgba(217,70,239,0.25)] light:text-fuchsia-900 light:border-fuchsia-500/60';
  if (v >= 15000) return 'text-pink-200 bg-pink-500/15 border-pink-400/40 light:text-pink-800 light:bg-pink-100 light:border-pink-500/60';
  if (v >= 10000) return 'text-purple-200 bg-purple-500/15 border-purple-400/35 light:text-purple-800 light:bg-purple-100 light:border-purple-500/60';
  if (v >= 7500)  return 'text-violet-200 bg-violet-500/15 border-violet-400/30 light:text-violet-800 light:bg-violet-100 light:border-violet-500/60';
  if (v >= 5000)  return 'text-indigo-200 bg-indigo-500/15 border-indigo-400/30 light:text-indigo-800 light:bg-indigo-100 light:border-indigo-500/60';
  if (v >= 2500)  return 'text-cyan-200 bg-cyan-500/12 border-cyan-400/30 light:text-cyan-800 light:bg-cyan-100 light:border-cyan-500/60';
  return 'text-sky-200 bg-sky-500/12 border-sky-400/30 light:text-sky-800 light:bg-sky-100 light:border-sky-500/60'; // 1,000 見習魔法師
}

// 取目前稱號:已達到的最高 total_score 成就;都沒達到則回起始稱號。
export function getRankTitle(score: number, achievements: Achievement[]): RankTitle {
  const tiers = (achievements || [])
    .filter(a => a.condition_type === 'total_score')
    .sort((a, b) => b.condition_value - a.condition_value);
  const reached = tiers.find(a => score >= a.condition_value);
  if (!reached) return STARTER;
  return { title: formatAchievementText(reached.title), value: reached.condition_value, className: classForValue(reached.condition_value) };
}

// 取「下一個稱號」與還差多少經驗(供顯示進度提示,可選用)。
export function getNextRankTitle(score: number, achievements: Achievement[]): { title: string; value: number; remaining: number } | null {
  const tiers = (achievements || [])
    .filter(a => a.condition_type === 'total_score')
    .sort((a, b) => a.condition_value - b.condition_value);
  const next = tiers.find(a => score < a.condition_value);
  if (!next) return null;
  return { title: formatAchievementText(next.title), value: next.condition_value, remaining: next.condition_value - score };
}

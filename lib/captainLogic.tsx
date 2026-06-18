// CaptainDashboard 純邏輯輔助 —— 從 components/Captain/CaptainDashboard.tsx 抽出，行為/UI 不變。
import { Task } from '@/types';

export function getTaskTypeBadge(task: Task) {
  if (task.type === 'daily') {
    return <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">每日</span>;
  }
  if (task.type === 'weekly') {
    return <span className="text-[8px] font-black text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">每週</span>;
  }
  if (task.name.includes('限時') || task.name.includes('最後一週') || task.name.includes('限定')) {
    return <span className="text-[8px] font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">限時</span>;
  }
  return <span className="text-[8px] font-black text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded">特殊</span>;
}

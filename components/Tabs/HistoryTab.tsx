'use client';

import React from 'react';
import { ScoreLog } from '@/types';
import { 
  ScrollText, Award, Calendar, Flame, CheckSquare, 
  Wrench, Heart, Sparkles, AlertCircle 
} from 'lucide-react';

interface HistoryTabProps {
  logs: ScoreLog[];
}

export function HistoryTab({ logs }: HistoryTabProps) {
  // Sort logs by created_at DESC
  const sortedLogs = [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Group logs by relative timeframes for a clean UI timeline
  const getGroupedLogs = () => {
    const groups: { title: string; items: ScoreLog[] }[] = [];
    const today: ScoreLog[] = [];
    const yesterday: ScoreLog[] = [];
    const thisWeek: ScoreLog[] = [];
    const older: ScoreLog[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    
    // Start of this week (Monday)
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);

    for (const log of sortedLogs) {
      const logDate = new Date(log.created_at);
      if (logDate >= startOfToday) {
        today.push(log);
      } else if (logDate >= startOfYesterday) {
        yesterday.push(log);
      } else if (logDate >= startOfThisWeek) {
        thisWeek.push(log);
      } else {
        older.push(log);
      }
    }

    if (today.length > 0) groups.push({ title: '今天', items: today });
    if (yesterday.length > 0) groups.push({ title: '昨天', items: yesterday });
    if (thisWeek.length > 0) groups.push({ title: '本週其他日子', items: thisWeek });
    if (older.length > 0) groups.push({ title: '更早之前', items: older });

    return groups;
  };

  const getLogIcon = (reason: string) => {
    const r = reason.toLowerCase();
    if (r.includes('連勝') || r.includes('連續') || r.includes('streak')) {
      return <Flame size={15} className="text-orange-400 fill-orange-400/10" />;
    }
    if (r.includes('任務') || r.includes('簽到') || r.includes('daily') || r.includes('quest') || r.includes('定課')) {
      return <CheckSquare size={15} className="text-purple-400" />;
    }
    if (r.includes('微調') || r.includes('調整') || r.includes('扣除') || r.includes('gm') || r.includes('修正')) {
      return <Wrench size={15} className="text-blue-400" />;
    }
    if (r.includes('見證') || r.includes('分享') || r.includes('心得')) {
      return <Heart size={15} className="text-rose-400 fill-rose-400/10" />;
    }
    if (r.includes('成就') || r.includes('解鎖') || r.includes('achievement')) {
      return <Sparkles size={15} className="text-amber-400" />;
    }
    return <Award size={15} className="text-emerald-400" />;
  };

  const groupedLogs = getGroupedLogs();

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      <div className="flex justify-between items-center select-none">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">
          經驗增減明細
        </h2>
        <span className="text-xs text-slate-500 font-mono">
          全部任務日誌
        </span>
      </div>

      <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 light:bg-white light:border-slate-200 shadow-xl">
        <h3 className="font-black text-white text-base flex items-center gap-1.5 border-b border-white/5 pb-3 select-none light:border-slate-200">
          <ScrollText size={18} className="text-amber-500" />
          歷史經驗明細
        </h3>

        {sortedLogs.length === 0 ? (
          <div className="text-center py-16 text-slate-500 font-bold text-sm flex flex-col items-center justify-center gap-3">
            <AlertCircle size={32} className="text-slate-600 animate-pulse" />
            目前沒有任何經驗明細記錄。
          </div>
        ) : (
          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {groupedLogs.map((group) => (
              <div key={group.title} className="space-y-3">
                {/* Group Timeframe Header */}
                <h4 className="text-xs font-black text-slate-500 sticky top-0 bg-slate-950/80 backdrop-blur py-1.5 px-2 rounded-md select-none w-fit light:bg-slate-100/80 light:text-slate-600 border border-white/5 light:border-slate-200">
                  {group.title}
                </h4>

                <div className="space-y-2">
                  {group.items.map((log) => {
                    const isPositive = log.amount >= 0;
                    
                    return (
                      <div 
                        key={log.id} 
                        className="group flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] hover:border-white/10 transition-all duration-300 select-none light:bg-slate-50/50 light:border-slate-200/60 light:hover:bg-slate-100/50"
                      >
                        <div className="flex items-center gap-3">
                          {/* Icon indicator based on log type */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-transform duration-300 group-hover:scale-105 ${
                            isPositive 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}>
                            {getLogIcon(log.reason)}
                          </div>

                          <div className="flex flex-col">
                            <span className="font-bold text-white text-sm leading-snug light:text-slate-900">
                              {log.reason}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                              <Calendar size={10} />
                              {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Score amount change */}
                        <div className="text-right shrink-0">
                          <span className={`font-black text-base filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] ${
                            isPositive ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {isPositive ? `+${log.amount}` : log.amount}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold ml-1">經驗</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

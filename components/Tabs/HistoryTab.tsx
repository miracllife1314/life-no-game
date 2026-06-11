'use client';

import React from 'react';
import { ScoreLog } from '@/types';
import { ScrollText, Award, Calendar } from 'lucide-react';

interface HistoryTabProps {
  logs: ScoreLog[];
}

export function HistoryTab({ logs }: HistoryTabProps) {
  // Sort logs by created_at DESC
  const sortedLogs = [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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

      <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
        <h3 className="font-black text-white text-base flex items-center gap-1.5 border-b border-white/5 pb-3 select-none light:border-slate-200">
          <ScrollText size={18} className="text-amber-500" />
          歷史經驗明細
        </h3>

        {sortedLogs.length === 0 ? (
          <div className="text-center py-10 text-slate-500 font-bold text-sm">
            目前沒有任何經驗明細記錄。
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto pr-2 light:divide-slate-200/80">
            {sortedLogs.map((log) => {
              const isPositive = log.amount >= 0;
              
              return (
                <div key={log.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    {/* Icon indicator */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 select-none ${
                      isPositive 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      <Award size={16} />
                    </div>

                    <div className="flex flex-col">
                      <span className="font-bold text-white text-sm leading-snug">
                        {log.reason}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Score amount change */}
                  <div className="text-right shrink-0 select-none">
                    <span className={`font-black text-base ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isPositive ? `+${log.amount}` : log.amount}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold ml-1">經驗</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { ScoreLog } from '@/types';
import {
  ScrollText, Award, Calendar, Flame, CheckSquare,
  Wrench, Heart, Sparkles, AlertCircle,
  Clock, CheckCircle2, XCircle, ClipboardList
} from 'lucide-react';

interface HistoryTabProps {
  logs: ScoreLog[];
  submissions?: any[];   // 學員自己的提交(含 status / proof_text / created_at / reviewed_at)
  tasks?: any[];
  missions?: any[];
}

export function HistoryTab({ logs, submissions = [], tasks = [], missions = [] }: HistoryTabProps) {
  const [view, setView] = useState<'logs' | 'reviews'>('logs');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // ── 任務審核狀態 ──────────────────────────────────────────────
  const taskNameOf = (s: any) =>
    s.mission_id === 'task-custom-post'
      ? '自由分享貼文'
      : (s.mission?.title
         || missions.find(m => m.id === s.mission_id)?.title
         || tasks.find(t => t.id === s.mission_id)?.name
         || '任務');

  const sortedSubs = useMemo(
    () => [...submissions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [submissions]
  );
  const counts = useMemo(() => ({
    all: sortedSubs.length,
    pending: sortedSubs.filter(s => s.status === 'pending').length,
    approved: sortedSubs.filter(s => s.status === 'approved').length,
    rejected: sortedSubs.filter(s => s.status === 'rejected').length,
  }), [sortedSubs]);
  const filteredSubs = statusFilter === 'all' ? sortedSubs : sortedSubs.filter(s => s.status === statusFilter);

  const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
    pending:  { label: '待審核', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20 light:text-amber-700 light:bg-amber-100 light:border-amber-300',     icon: Clock },
    approved: { label: '已通過', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 light:text-emerald-700 light:bg-emerald-100 light:border-emerald-300', icon: CheckCircle2 },
    rejected: { label: '已退回', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/20 light:text-rose-700 light:bg-rose-100 light:border-rose-300',         icon: XCircle },
  };

  const fmt = (d: string) => {
    const dt = new Date(d);
    return `${dt.getMonth() + 1}/${dt.getDate()} ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // ── 經驗明細(原有,維持不變)────────────────────────────────────
  const sortedLogs = [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);

    for (const log of sortedLogs) {
      const logDate = new Date(log.created_at);
      if (logDate >= startOfToday) today.push(log);
      else if (logDate >= startOfYesterday) yesterday.push(log);
      else if (logDate >= startOfThisWeek) thisWeek.push(log);
      else older.push(log);
    }

    if (today.length > 0) groups.push({ title: '今天', items: today });
    if (yesterday.length > 0) groups.push({ title: '昨天', items: yesterday });
    if (thisWeek.length > 0) groups.push({ title: '本週其他日子', items: thisWeek });
    if (older.length > 0) groups.push({ title: '更早之前', items: older });
    return groups;
  };

  const getLogIcon = (reason: string) => {
    const r = reason.toLowerCase();
    if (r.includes('連勝') || r.includes('連續') || r.includes('streak')) return <Flame size={15} className="text-orange-400 fill-orange-400/10" />;
    if (r.includes('任務') || r.includes('簽到') || r.includes('daily') || r.includes('quest') || r.includes('定課')) return <CheckSquare size={15} className="text-purple-400" />;
    if (r.includes('微調') || r.includes('調整') || r.includes('扣除') || r.includes('gm') || r.includes('修正')) return <Wrench size={15} className="text-blue-400" />;
    if (r.includes('見證') || r.includes('分享') || r.includes('心得')) return <Heart size={15} className="text-rose-400 fill-rose-400/10" />;
    if (r.includes('成就') || r.includes('解鎖') || r.includes('achievement')) return <Sparkles size={15} className="text-amber-400" />;
    return <Award size={15} className="text-emerald-400" />;
  };

  const groupedLogs = getGroupedLogs();

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 animate-in fade-in duration-300">

      {/* 檢視切換:經驗明細 / 任務審核 */}
      <div className="flex bg-slate-950 p-1 rounded-2xl border border-white/5 select-none light:bg-slate-200">
        {([['logs', '經驗明細'], ['reviews', '任務審核']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              view === key
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900'
            }`}
          >
            {label}{key === 'reviews' && counts.pending > 0 ? `（${counts.pending} 待審）` : ''}
          </button>
        ))}
      </div>

      {/* ===================== 任務審核 ===================== */}
      {view === 'reviews' ? (
        <div className="glass-panel p-5 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 shadow-xl">
          <h3 className="font-black text-white text-base flex items-center gap-1.5 border-b border-white/5 pb-3 select-none light:border-slate-200 light:text-slate-900">
            <ClipboardList size={18} className="text-amber-500" />
            我送出的任務・審核狀態
          </h3>

          {/* 狀態篩選 */}
          <div className="flex flex-wrap gap-2 select-none">
            {([
              ['all', '全部', counts.all],
              ['pending', '待審核', counts.pending],
              ['approved', '已通過', counts.approved],
              ['rejected', '已退回', counts.rejected],
            ] as const).map(([key, label, n]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                  statusFilter === key
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-slate-950/40 text-slate-400 border-white/10 hover:text-white light:bg-slate-100 light:text-slate-600 light:border-slate-300 light:hover:text-slate-900'
                }`}
              >
                {label} {n}
              </button>
            ))}
          </div>

          {filteredSubs.length === 0 ? (
            <div className="text-center py-14 text-slate-500 font-bold text-sm flex flex-col items-center gap-3">
              <AlertCircle size={30} className="text-slate-600" />
              {statusFilter === 'all' ? '還沒有送出任何任務。' : `沒有「${STATUS[statusFilter]?.label || ''}」的任務。`}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredSubs.map((s: any) => {
                const st = STATUS[s.status] || STATUS.pending;
                const Icon = st.icon;
                return (
                  <div key={s.id} className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 light:bg-slate-50/60 light:border-slate-200/60 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-white text-sm leading-snug light:text-slate-900">
                        {taskNameOf(s)}
                      </span>
                      <span className={`shrink-0 text-[11px] font-black px-2 py-0.5 rounded-lg border flex items-center gap-1 ${st.cls}`}>
                        <Icon size={12} /> {st.label}
                      </span>
                    </div>

                    {s.proof_text && (
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 light:text-slate-600">
                        「{s.proof_text}」
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono light:text-slate-500">
                      <span className="flex items-center gap-1"><Calendar size={10} /> 送出 {fmt(s.created_at)}</span>
                      {s.status === 'approved' && (s.score_awarded ?? 0) > 0 && (
                        <span className="text-emerald-400 font-black light:text-emerald-600">+{s.score_awarded} 經驗</span>
                      )}
                    </div>

                    {s.status === 'rejected' && (
                      <div className="text-[11px] font-bold text-rose-400 bg-rose-500/5 rounded-lg px-2.5 py-1.5 light:text-rose-600 light:bg-rose-50">
                        ⚠️ 這筆被退回了，可以修改後重新上傳。
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
      /* ===================== 經驗明細(原有)===================== */
      <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 light:bg-white light:border-slate-200 shadow-xl">
        <h3 className="font-black text-white text-base flex items-center gap-1.5 border-b border-white/5 pb-3 select-none light:border-slate-200 light:text-slate-900">
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
      )}

    </div>
  );
}

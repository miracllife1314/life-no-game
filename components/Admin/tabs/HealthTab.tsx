// =====================================================================
// 系統健康:把前端記下的「失敗/變慢」事件(client_logs)攤開給大隊長看。
//   —— 目的:像「上傳失敗 / 載入很慢」這種,以前要等學員回報;
//      這裡讓系統主動把問題列出來,你一眼看到「今天有幾筆、誰、什麼原因」。
//   資料來源:client_logs(見 docs/schema_fixes_24_client_logs.sql)。
//   權限:只有大隊長讀得到(RLS)。表還沒建時會顯示提示,不會壞。
// =====================================================================
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, RefreshCw, AlertTriangle, ImageOff, Send, Clock } from 'lucide-react';

interface LogRow {
  id: string;
  type: 'upload_fail' | 'submit_fail' | 'slow_load' | string;
  detail: string | null;
  user_name: string | null;
  created_at: string;
}

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  upload_fail: { label: '圖片上傳失敗', icon: ImageOff, color: 'text-rose-400 light:text-rose-600' },
  submit_fail: { label: '提交失敗', icon: Send, color: 'text-amber-400 light:text-amber-600' },
  slow_load: { label: '載入過慢', icon: Clock, color: 'text-sky-400 light:text-sky-600' },
};

function fmt(ts: string): string {
  try {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return ts; }
}

export function HealthTab() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setTableMissing(false);
    try {
      const { data, error } = await supabase
        .from('client_logs')
        .select('id,type,detail,user_name,created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) {
        // 表還沒建(SQL 未跑)→ 友善提示
        if (/relation|does not exist|client_logs/i.test(error.message || '')) setTableMissing(true);
        setLogs([]);
      } else {
        setLogs((data as LogRow[]) || []);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // 今天(本地日)的筆數統計
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const todayLogs = logs.filter(l => new Date(l.created_at) >= startOfToday);
  const countToday = (t: string) => todayLogs.filter(l => l.type === t).length;

  return (
    <div className="space-y-5">
      {/* 標題列 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="text-emerald-400 light:text-emerald-600" size={20} />
          <h3 className="text-lg font-black text-white light:text-slate-800">系統健康</h3>
          <span className="text-xs text-slate-400 light:text-slate-500">系統主動記下的問題,不用等學員回報</span>
        </div>
        <button
          onClick={load}
          className="py-2 px-4 rounded-xl text-xs font-black bg-slate-900 border border-white/10 text-slate-300 hover:text-white active:scale-95 transition-all flex items-center gap-1.5 light:bg-slate-100 light:border-slate-300 light:text-slate-600"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          重新整理
        </button>
      </div>

      {/* 今日摘要卡 */}
      <div className="grid grid-cols-3 gap-3">
        {(['upload_fail', 'submit_fail', 'slow_load'] as const).map(t => {
          const meta = TYPE_META[t];
          const Icon = meta.icon;
          const n = countToday(t);
          return (
            <div key={t} className={`rounded-2xl p-4 border ${n > 0 ? 'bg-slate-900 border-white/10 light:bg-white light:border-slate-200' : 'bg-slate-900/50 border-white/5 light:bg-slate-50 light:border-slate-200'}`}>
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className={meta.color} size={16} />
                <span className="text-[11px] font-bold text-slate-400 light:text-slate-500 leading-tight">{meta.label}</span>
              </div>
              <div className={`text-2xl font-black ${n > 0 ? meta.color : 'text-slate-600 light:text-slate-400'}`}>{n}</div>
              <div className="text-[10px] text-slate-500 light:text-slate-400 mt-0.5">今日</div>
            </div>
          );
        })}
      </div>

      {/* 表還沒建 → 提示跑 SQL */}
      {tableMissing && (
        <div className="rounded-2xl p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 light:text-amber-700 light:bg-amber-50 text-sm flex items-start gap-2">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            尚未啟用監控。請在 Supabase SQL Editor 執行
            <span className="font-mono mx-1 px-1.5 py-0.5 rounded bg-black/20">docs/schema_fixes_24_client_logs.sql</span>
            後再回來這頁。
          </div>
        </div>
      )}

      {/* 明細列表 */}
      {!tableMissing && (
        <div className="rounded-2xl border border-white/10 light:border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900 light:bg-slate-100 text-xs font-black text-slate-400 light:text-slate-500 border-b border-white/5 light:border-slate-200">
            最近事件(最多 200 筆)
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">載入中…</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 light:text-slate-400 text-sm">
              🎉 目前沒有任何失敗或變慢紀錄,系統運作順暢。
            </div>
          ) : (
            <div className="divide-y divide-white/5 light:divide-slate-100 max-h-[60vh] overflow-y-auto">
              {logs.map(l => {
                const meta = TYPE_META[l.type] || { label: l.type, icon: AlertTriangle, color: 'text-slate-400' };
                const Icon = meta.icon;
                return (
                  <div key={l.id} className="px-4 py-3 flex items-start gap-3 bg-slate-950/30 light:bg-white">
                    <Icon className={`${meta.color} shrink-0 mt-0.5`} size={16} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold ${meta.color}`}>{meta.label}</span>
                        {l.user_name && <span className="text-xs text-slate-300 light:text-slate-600">· {l.user_name}</span>}
                      </div>
                      {l.detail && <div className="text-xs text-slate-400 light:text-slate-500 mt-0.5 break-words">{l.detail}</div>}
                    </div>
                    <span className="text-[11px] text-slate-500 light:text-slate-400 shrink-0">{fmt(l.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

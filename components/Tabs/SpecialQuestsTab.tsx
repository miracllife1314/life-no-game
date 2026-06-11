'use client';

import React, { useState } from 'react';
import { Task, Submission } from '@/types';
import { CheckCircle2, Clock, AlertCircle, FileText, Send, Calendar } from 'lucide-react';

interface SpecialQuestsTabProps {
  tasks: Task[];
  submissions: Submission[];
  onCheckIn: (taskId: string, proofText?: string, proofImg?: string, proofLink?: string) => Promise<void>;
  isSyncing: boolean;
}

export function SpecialQuestsTab({ tasks, submissions, onCheckIn, isSyncing }: SpecialQuestsTabProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [proofText, setProofText] = useState('');
  const [proofLink, setProofLink] = useState('');
  const [showProofModal, setShowProofModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filter temporary tasks
  const tempTasks = tasks.filter(t => t.type === 'temporary');

  // Helper to check completion status
  const getTaskStatus = (taskId: string) => {
    const sub = submissions.find(s => s.mission_id === taskId);
    if (!sub) return 'none';
    return sub.status;
  };

  const handleCardClick = (task: Task) => {
    const status = getTaskStatus(task.id);
    if (status === 'approved' || status === 'pending') return;

    if (task.requires_proof) {
      setSelectedTask(task);
      setProofText('');
      setProofLink('');
      setShowProofModal(true);
    } else {
      onCheckIn(task.id);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    setSubmitting(true);
    try {
      await onCheckIn(selectedTask.id, proofText, undefined, proofLink);
      setShowProofModal(false);
      setSelectedTask(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to formatting remaining time
  const getRemainingTime = (endTimeStr: string) => {
    const remainingMs = new Date(endTimeStr).getTime() - Date.now();
    if (remainingMs <= 0) return '已截止';
    
    const hours = Math.floor(remainingMs / 3600000);
    const minutes = Math.floor((remainingMs % 3600000) / 60000);
    
    if (hours > 24) {
      return `剩餘 ${Math.floor(hours / 24)} 天`;
    }
    return `剩餘 ${hours} 小時 ${minutes} 分鐘`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      <div className="flex justify-between items-center select-none">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">
          特殊限時挑戰
        </h2>
        <span className="text-xs text-slate-500 font-mono">
          活動限時開放
        </span>
      </div>

      {tempTasks.length === 0 ? (
        <div className="glass-panel p-10 rounded-3xl text-center text-slate-500 font-bold text-sm">
          目前沒有任何進行中的特殊任務。
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tempTasks.map((task) => {
            const status = getTaskStatus(task.id);
            const remaining = getRemainingTime(task.end_time);
            const isExpired = remaining === '已截止';

            return (
              <div
                key={task.id}
                onClick={() => !isExpired && handleCardClick(task)}
                className={`glass-panel p-6 rounded-3xl border flex flex-col justify-between h-52 transition-all relative overflow-hidden ${
                  status === 'approved'
                    ? 'border-emerald-500/20 bg-emerald-500/5 opacity-80 cursor-default'
                    : status === 'pending'
                    ? 'border-amber-500/20 bg-amber-500/5 opacity-80 cursor-default animate-pulse'
                    : isExpired
                    ? 'border-white/5 bg-slate-900/30 opacity-40 cursor-default'
                    : 'border-white/5 hover:border-purple-500/30 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer light:bg-white light:border-slate-200'
                }`}
              >
                {/* Header Row */}
                <div className="flex justify-between items-start select-none">
                  <span className="text-[10px] font-black tracking-widest text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md">
                    +{task.score} 經驗
                  </span>
                  
                  <div>
                    {status === 'approved' && (
                      <span className="flex items-center gap-1 text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <CheckCircle2 size={12} />
                        已完成
                      </span>
                    )}
                    {status === 'pending' && (
                      <span className="flex items-center gap-1 text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                        <Clock size={12} />
                        審核中
                      </span>
                    )}
                    {status === 'rejected' && (
                      <span className="flex items-center gap-1 text-xs font-black text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                        <AlertCircle size={12} />
                        退回
                      </span>
                    )}
                    {status === 'none' && !isExpired && (
                      <span className="flex items-center gap-1 text-xs font-black text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                        進行中
                      </span>
                    )}
                    {status === 'none' && isExpired && (
                      <span className="flex items-center gap-1 text-xs font-black text-slate-500 bg-slate-900 border border-white/5 px-2.5 py-1 rounded-full light:bg-slate-100 light:border-slate-300">
                        已截止
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="mt-4">
                  <h3 className="font-black text-white text-base leading-snug">
                    {task.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed light:text-slate-500">
                    {task.description}
                  </p>
                </div>

                {/* Footer */}
                <div className="text-[10px] text-slate-500 font-mono border-t border-white/5 pt-3 mt-4 flex justify-between items-center select-none light:border-slate-200">
                  <span className="flex items-center gap-1 text-purple-400">
                    <Calendar size={10} />
                    {remaining}
                  </span>
                  <span>
                    {task.requires_proof ? '※ 需上傳審核證明' : '✓ 點擊直接簽到'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 📝 簽到證明上傳 Modal */}
      {showProofModal && selectedTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-white mb-4">
              提交特殊挑戰證明：{selectedTask.name}
            </h3>
            
            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-bold mb-2">
                  心得或任務截圖連結 (必填)
                </label>
                <textarea
                  required
                  rows={4}
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  placeholder="請分享您完成此項限時挑戰的心得、關鍵對話或收穫..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-bold mb-2">
                  參考連結 (選填)
                </label>
                <input
                  type="url"
                  value={proofLink}
                  onChange={(e) => setProofLink(e.target.value)}
                  placeholder="請貼上網址連結..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowProofModal(false);
                    setSelectedTask(null);
                  }}
                  className="flex-1 btn-action py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-action py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-black flex items-center justify-center gap-1"
                >
                  <Send size={14} />
                  {submitting ? '提交中...' : '提交證明'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

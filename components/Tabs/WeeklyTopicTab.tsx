'use client';

import React, { useState } from 'react';
import { Task, Submission } from '@/types';
import { CheckCircle2, Clock, AlertCircle, FileText, Send, ExternalLink, Circle } from 'lucide-react';

interface WeeklyTopicTabProps {
  tasks: Task[];
  submissions: Submission[];
  onCheckIn: (taskId: string, proofText?: string, proofImg?: string, proofLink?: string) => Promise<void>;
  isSyncing: boolean;
}

export function WeeklyTopicTab({ tasks, submissions, onCheckIn, isSyncing }: WeeklyTopicTabProps) {
  const [activeCategory, setActiveCategory] = useState<'daily' | 'weekly' | 'temporary'>('daily');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [proofText, setProofText] = useState('');
  const [proofLink, setProofLink] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [showProofModal, setShowProofModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filter tasks based on active category
  const filteredTasks = tasks.filter(t => t.type === activeCategory);

  // Helper to check completion status
  const getTaskSubmission = (taskId: string) => {
    return submissions.find(s => s.mission_id === taskId);
  };

  const handleCardClick = (task: Task) => {
    const sub = getTaskSubmission(task.id);
    if (sub && (sub.status === 'approved' || sub.status === 'pending')) return; // already done/pending

    if (task.requires_proof) {
      setSelectedTask(task);
      setProofText(sub?.proof_text || '');
      setProofLink(sub?.proof_link || '');
      setProofImage(sub?.proof_image_url || '');
      setShowProofModal(true);
    } else {
      // Direct sign-in
      onCheckIn(task.id);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    setSubmitting(true);
    try {
      await onCheckIn(selectedTask.id, proofText, proofImage || undefined, proofLink);
      setShowProofModal(false);
      setSelectedTask(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryBadge = (type: string) => {
    switch (type) {
      case 'daily':
        return <span className="text-[10px] font-black tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md">每日任務</span>;
      case 'weekly':
        return <span className="text-[10px] font-black tracking-widest text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md">每週任務</span>;
      default:
        return <span className="text-[10px] font-black tracking-widest text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md">特殊任務</span>;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 select-none border-b border-white/5 pb-4 light:border-slate-200">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">
          任務中心 (Task Dashboard)
        </h2>

        {/* Category switcher */}
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-white/5 w-72 light:bg-slate-100 light:border-slate-300/50">
          <button
            onClick={() => setActiveCategory('daily')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeCategory === 'daily'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900'
            }`}
          >
            每日
          </button>
          <button
            onClick={() => setActiveCategory('weekly')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeCategory === 'weekly'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900'
            }`}
          >
            每週
          </button>
          <button
            onClick={() => setActiveCategory('temporary')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeCategory === 'temporary'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900'
            }`}
          >
            特殊
          </button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center text-slate-500 font-bold text-sm">
          目前沒有發布中的{activeCategory === 'daily' ? '每日' : activeCategory === 'weekly' ? '每週' : '特殊'}任務。
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const sub = getTaskSubmission(task.id);
            const status = sub ? sub.status : 'none';

            return (
              <div
                key={task.id}
                onClick={() => handleCardClick(task)}
                className={`glass-panel p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  status === 'approved'
                    ? 'border-emerald-500/20 bg-emerald-500/5 cursor-default'
                    : status === 'pending'
                    ? 'border-amber-500/20 bg-amber-500/5 cursor-default animate-pulse'
                    : 'border-white/5 hover:border-amber-500/30 hover:shadow-lg cursor-pointer light:bg-white light:border-slate-200'
                }`}
              >
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {getCategoryBadge(task.type)}
                    <span className="text-[10px] font-black tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md">
                      +{task.score} 經驗
                    </span>
                  </div>
                  
                  <h3 className="font-black text-white text-lg leading-snug">
                    {task.name}
                  </h3>
                  
                  <p className="text-xs text-slate-400 leading-relaxed light:text-slate-500">
                    {task.description}
                  </p>

                  {/* Render submitted proof summary if any */}
                  {sub && (
                    <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5 light:border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                        <FileText size={12} />
                        提交的證明資料：
                      </div>
                      <p className="text-xs text-slate-300 italic line-clamp-1 light:text-slate-600">
                        「{sub.proof_text}」
                      </p>
                      {sub.proof_link && (
                        <a
                          href={sub.proof_link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] text-amber-500 hover:underline flex items-center gap-0.5"
                        >
                          <ExternalLink size={10} />
                          查看參考網址
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Column (Right) */}
                <div className="shrink-0 flex items-center gap-3">
                  {status === 'approved' && (
                    <div className="flex flex-col items-end gap-1 select-none">
                      <span className="flex items-center gap-1 text-xs font-black text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 size={14} />
                        任務已完成
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                        核准人：{sub?.reviewed_by === 'admin1' ? '大隊長' : '小隊長'}
                      </span>
                    </div>
                  )}
                  {status === 'pending' && (
                    <span className="flex items-center gap-1 text-xs font-black text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 select-none">
                      <Clock size={14} />
                      待大會審核
                    </span>
                  )}
                  {status === 'rejected' && (
                    <button className="btn-action flex items-center gap-1 text-xs font-black text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20 select-none">
                      <AlertCircle size={14} />
                      被退回 (重新提交)
                    </button>
                  )}
                  {status === 'none' && (
                    <button className="btn-action bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2.5 rounded-2xl text-xs font-black select-none">
                      {task.requires_proof ? '上傳證明打卡' : '點擊直接簽到'}
                    </button>
                  )}
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
              提交任務證明：{selectedTask.name}
            </h3>
            
            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-bold mb-2">
                  心得報告與執行發現 (必填)
                </label>
                <textarea
                  required
                  rows={5}
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  placeholder="請詳細寫下您執行此項溝通任務的步驟、對話對策、對方心理回饋與您的溝通心得..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-bold mb-2">
                  成果網址連結 (選填)
                </label>
                <input
                  type="url"
                  value={proofLink}
                  onChange={(e) => setProofLink(e.target.value)}
                  placeholder="如部落格分享、公開文件連結..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-bold mb-2">
                  證明圖片連結 (選填)
                </label>
                <input
                  type="url"
                  value={proofImage}
                  onChange={(e) => setProofImage(e.target.value)}
                  placeholder="請貼上證明截圖的網路圖片連結 (URL)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="bg-slate-900/50 border border-white/5 p-3 rounded-xl flex items-start gap-2 light:bg-slate-100 light:border-slate-300">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-normal font-bold light:text-slate-600">
                  此挑戰必須上傳詳細文字證明，並由大會管理員審核通過才能核發分數。
                </p>
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
                  className="flex-1 btn-action py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center justify-center gap-1"
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

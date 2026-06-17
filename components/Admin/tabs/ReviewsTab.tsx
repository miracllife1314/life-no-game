// =====================================================================
// 後台「審核面板」分頁（待審核打卡證明）—— 從 AdminDashboard.tsx 抽出，行為/UI 不變。
// =====================================================================
import { Check, X } from 'lucide-react';
import { Submission, Task } from '@/types';

interface ReviewsTabProps {
  pendingSubmissions: Submission[];
  tasks: Task[];
  isSyncing: boolean;
  onReviewSubmission: (submissionId: string, status: 'approved' | 'rejected', shareToWitness?: boolean) => Promise<void>;
}

export function ReviewsTab({ pendingSubmissions, tasks, isSyncing, onReviewSubmission }: ReviewsTabProps) {
  return (
        <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
          <h3 className="font-black text-white text-base select-none">
            待處理簽到打卡證明 ({pendingSubmissions.length})
          </h3>

          {pendingSubmissions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-bold text-sm">
              🎉 目前沒有待審核的打卡證明，大家都很自律或全部審核完畢！
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSubmissions.map(sub => (
                <div key={sub.id} className="bg-slate-950/60 border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 light:bg-slate-50 light:border-slate-300/60">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 select-none">
                      <span className="font-bold text-white text-xs bg-slate-900 px-2 py-0.5 rounded border border-white/5 light:bg-slate-200 light:text-slate-900 light:border-slate-300">
                        學員：{sub.profile?.name}
                      </span>
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                        任務：{sub.mission?.title || tasks.find(t => t.id === sub.mission_id)?.name || '未知任務'}
                      </span>
                      <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                        +{sub.mission?.points || tasks.find(t => t.id === sub.mission_id)?.score || 0} 經驗
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-bold leading-relaxed">
                      證明描述：「 <span className="text-white italic">{sub.proof_text}</span> 」
                    </p>

                    {(sub.proof_link || sub.proof_image_url) && (
                      <div className="flex flex-wrap gap-3 pt-1.5 select-none">
                        {sub.proof_link && (
                          <a
                            href={sub.proof_link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-amber-500 hover:underline"
                          >
                            🔗 查看參考連結
                          </a>
                        )}
                        {sub.proof_image_url && (
                          <a
                            href={sub.proof_image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-amber-500 hover:underline"
                          >
                            🖼️ 查看佐證圖片
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions (Approve / Reject) */}
                  <div className="shrink-0 flex gap-2 select-none">
                    <button
                      onClick={() => onReviewSubmission(sub.id, 'rejected')}
                      disabled={isSyncing}
                      className="btn-action bg-slate-900 border border-red-500/30 hover:bg-red-500/10 text-red-400 p-2.5 rounded-xl text-xs font-black flex items-center gap-1 light:bg-slate-100"
                    >
                      <X size={14} />
                      退回
                    </button>
                    <button
                      onClick={() => onReviewSubmission(sub.id, 'approved', false)}
                      disabled={isSyncing}
                      className="btn-action bg-emerald-500 hover:bg-emerald-600 text-slate-950 p-2.5 rounded-xl text-xs font-black flex items-center gap-1"
                    >
                      <Check size={14} />
                      同意加分
                    </button>
                    <button
                      onClick={() => onReviewSubmission(sub.id, 'approved', true)}
                      disabled={isSyncing}
                      title="通過並分享到見證牆"
                      className="btn-action bg-purple-500 hover:bg-purple-600 text-white p-2.5 rounded-xl text-xs font-black flex items-center gap-1"
                    >
                      <Check size={14} />
                      上見證牆
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
  );
}

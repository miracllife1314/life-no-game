// 免證明直接簽到確認 Modal —— 從 DailyQuestsTab 抽出，行為/UI 不變。
import { CheckCircle2 } from 'lucide-react';
import { formatBrandText } from '@/lib/brand';

export function ConfirmModal({ confirmTask, setShowConfirmModal, setConfirmTask, onCheckIn }: any) {
  return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 modal-force-dark">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 animate-bounce">
                <CheckCircle2 size={32} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">
                  確認完成此項任務？
                </h3>
                <p className="text-base font-bold text-amber-500">
                  {formatBrandText(confirmTask.name || confirmTask.title)}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto light:text-slate-600">
                  此任務為「免證明簽到」，確認後將直接完成打卡，並獲得 <span className="text-amber-500 font-bold">+{confirmTask.score !== undefined ? confirmTask.score : confirmTask.points}</span> 經驗積分。
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmTask(null);
                }}
                className="flex-1 btn-action py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                尚未完成
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirmTask) {
                    const task = confirmTask;
                    // 立即關閉對話框並清空狀態，避免非同步重渲染時對話框閃爍
                    setShowConfirmModal(false);
                    setConfirmTask(null);
                    try {
                      await onCheckIn(task.id);
                    } catch (err) {
                      console.error(err);
                      // 若失敗，則重新還原對話框
                      setConfirmTask(task);
                      setShowConfirmModal(true);
                    }
                  }
                }}
                className="flex-1 btn-action py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs font-black shadow-[0_0_15px_rgba(245,158,11,0.4)] shimmer-btn"
              >
                確認完成
              </button>
            </div>
          </div>
        </div>
  );
}

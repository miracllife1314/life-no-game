// 隊長補簽確認 Modal —— 從 CaptainDashboard 抽出，行為/UI 不變。
import { CheckCircle2 } from 'lucide-react';
import { Profile } from '@/types';
export function ConfirmModal({ confirmTask, confirmStudentId, profiles, setShowConfirmModal, setConfirmTask, setConfirmStudentId, handleToggleCell }: { confirmTask: any; confirmStudentId: any; profiles: Profile[]; setShowConfirmModal: any; setConfirmTask: any; setConfirmStudentId: any; handleToggleCell: any }) {
  return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 animate-bounce">
                <CheckCircle2 size={32} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">
                  確認要幫組員補簽？
                </h3>
                <p className="text-sm font-bold text-amber-500">
                  {profiles.find(p => p.id === confirmStudentId)?.name} 的「{confirmTask.name}」
                </p>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto light:text-slate-600">
                  補簽後，系統將直接核准該任務，並發放該組員 <span className="text-amber-500 font-bold">+{confirmTask.score}</span> 點經驗積分。
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmTask(null);
                  setConfirmStudentId(null);
                }}
                className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirmStudentId && confirmTask) {
                    await handleToggleCell(confirmStudentId, confirmTask.id);
                  }
                  setShowConfirmModal(false);
                  setConfirmTask(null);
                  setConfirmStudentId(null);
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
              >
                確認完成
              </button>
            </div>
          </div>
        </div>
  );
}

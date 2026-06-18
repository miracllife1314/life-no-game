// 神獸升級成功 Modal —— 從 DailyQuestsTab 抽出，行為/UI 不變。
import { Sparkles } from 'lucide-react';
export function LevelUpModal({ showLevelUpModal, setShowLevelUpModal }: { showLevelUpModal: any; setShowLevelUpModal: (v: any) => void }) {
  return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300 modal-force-dark">
          <div className="glass-panel level-up-glow-card w-full max-w-sm p-6 rounded-3xl border border-white/20 shadow-2xl relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-center space-y-6">
            
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 animate-bounce">
              <Sparkles size={32} />
            </div>

            <div>
              <span className="text-[10px] font-black tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md">
                🏆 升級成功 (Level Up!)
              </span>
              <h2 className="text-xl font-black text-white mt-3">
                {showLevelUpModal.petName} 突破成長！
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                恭喜，您的 NLP 守護神獸獲得了新的力量！
              </p>
            </div>

            {/* Level Change display */}
            <div className="bg-slate-900/80 border border-white/5 p-4 rounded-2xl flex justify-around items-center">
              <div className="text-center">
                <div className="text-[10px] text-slate-500 font-bold">原本等級</div>
                <div className="text-lg font-black text-slate-400">LV.{showLevelUpModal.oldLevel}</div>
              </div>
              <div className="text-amber-500 font-black text-xl animate-pulse">➔</div>
              <div className="text-center">
                <div className="text-[10px] text-amber-500 font-bold">目前等級</div>
                <div className="text-xl font-black text-amber-400">LV.{showLevelUpModal.newLevel}</div>
              </div>
            </div>

            {/* EXP details */}
            <div className="text-left bg-slate-950 p-3.5 rounded-xl border border-white/5 space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>目前總經驗：</span>
                <span className="text-amber-500">{showLevelUpModal.totalExp.toLocaleString()} EXP</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>距離下一次升級：</span>
                <span>{700 - (showLevelUpModal.totalExp % 700)} EXP</span>
              </div>
            </div>

            {/* Evolution Prompt */}
            {showLevelUpModal.hasPendingEvolution && (
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-pink-500/30 p-3.5 rounded-xl text-center animate-pulse">
                <span className="text-xs font-black text-pink-400 block">
                  ✨ 已達進化等級 Lv.5 門檻！
                </span>
                <span className="text-[10px] text-slate-300 block mt-1 leading-relaxed">
                  神秘進化考驗已解鎖，請前往下方寵物面板進行進化儀式，選擇你的專屬考驗任務！
                </span>
              </div>
            )}

            <div className="flex pt-2">
              <button
                type="button"
                onClick={() => setShowLevelUpModal(null)}
                className="flex-1 btn-action py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-xs font-black shadow-lg cursor-pointer transition-all active:scale-95 shimmer-btn"
              >
                好的，太棒了！
              </button>
            </div>
          </div>
        </div>
  );
}

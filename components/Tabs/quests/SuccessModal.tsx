// 神獸進化成功 Modal —— 從 DailyQuestsTab 抽出，行為/UI 不變。
export function SuccessModal({ showSuccessModal, setShowSuccessModal }: { showSuccessModal: any; setShowSuccessModal: (v: any) => void }) {
  return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300 modal-force-dark">
          <div className="glass-panel w-full max-w-sm p-6 rounded-3xl border border-white/20 shadow-2xl relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-center space-y-6">
            
            {/* Header info */}
            <div>
              <span className="text-[10px] font-black tracking-widest text-pink-400 bg-pink-500/10 px-2.5 py-1 rounded-md">
                NLP 守護神獸進化成功
              </span>
              {showSuccessModal.isSubsequent ? (
                <div className="mt-3 space-y-1">
                  <h2 className="text-lg font-black text-white">
                    恭喜！你的【{showSuccessModal.fromName}】
                  </h2>
                  <h2 className="text-lg font-black text-amber-500">
                    進化為【{showSuccessModal.toName}】
                  </h2>
                </div>
              ) : (
                <h2 className="text-2xl font-black text-white mt-3">
                  {showSuccessModal.beastName}
                </h2>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {showSuccessModal.isSubsequent 
                  ? `恭喜成功解鎖 ${showSuccessModal.lineName} 進化型態`
                  : `恭喜成功解鎖 ${showSuccessModal.lineName}`
                }
              </p>
            </div>

            {/* Beast Visual */}
            <div className="relative flex justify-center items-center py-4 select-none">
              <div 
                className="absolute w-48 h-48 rounded-full blur-2xl opacity-40 animate-pulse"
                style={{ backgroundColor: showSuccessModal.glowColor }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={showSuccessModal.image} 
                alt={showSuccessModal.beastName}
                className="w-36 h-36 object-contain rounded-2xl border relative z-10 animate-float"
                style={{ 
                  boxShadow: `0 0 30px ${showSuccessModal.glowColor}aa`,
                  border: `2px solid ${showSuccessModal.glowColor}55`
                }}
              />
            </div>

            {/* Trait Card */}
            <div className="bg-slate-900/80 border border-white/5 p-4 rounded-2xl text-left space-y-1">
              <div className="text-[10px] text-slate-400 font-bold">NLP 特質屬性</div>
              <div className="text-xs text-amber-400 font-mono font-black">{showSuccessModal.traits}</div>
              <div className="text-[11px] text-slate-300 pt-1 leading-relaxed">{showSuccessModal.desc}</div>
            </div>

            {/* Sharing slogan */}
            <p className="text-[10px] text-slate-400 italic">
              「NLP 人性溝通術・神獸守護進化契約已突破」
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSuccessModal(null)}
                className="flex-1 btn-action py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-xs font-black shadow-lg cursor-pointer transition-all active:scale-95 shimmer-btn"
              >
                確 定
              </button>
            </div>
          </div>
        </div>
  );
}

// 神獸進化成功 Modal —— 破蛋特效版:能量凝聚→蛋殼震動→爆裂破殼→揭曉新神獸。
import { useState, useEffect } from 'react';
import { BRAND } from '@/lib/brand';

const cssStyles = `
@keyframes lvk-shake {
  0%,100% { transform: translate(0,0) rotate(0deg) scale(1.04); }
  20% { transform: translate(-6px,3px) rotate(-8deg) scale(1.1); }
  40% { transform: translate(6px,-3px) rotate(8deg) scale(1.1); }
  60% { transform: translate(-5px,2px) rotate(-6deg) scale(1.13); }
  80% { transform: translate(5px,-2px) rotate(6deg) scale(1.13); }
}
@keyframes lvk-flash { 0% { opacity:0; transform:scale(0.4); } 50% { opacity:1; transform:scale(1.6); } 100% { opacity:0; transform:scale(2.2); } }
@keyframes lvk-pop { 0% { transform: scale(0.4); opacity:0; } 55% { transform: scale(1.1); opacity:1; } 100% { transform: scale(1); opacity:1; } }
@keyframes lvk-grow {
  0% { transform: scale(0.95) translateY(0); filter: brightness(1); }
  30% { transform: scale(1.05) translateY(-2px) rotate(-2deg); }
  60% { transform: scale(1.18) translateY(0) rotate(2deg); filter: brightness(1.4); }
  100% { transform: scale(1.35); filter: brightness(2.2); opacity: 0.85; }
}
.lvk-egg { animation: lvk-shake 0.35s ease-in-out infinite; }
.lvk-grow { animation: lvk-grow 1.5s ease-in forwards; }
.lvk-flash { animation: lvk-flash 0.45s ease-out forwards; }
.lvk-pop { animation: lvk-pop 0.6s cubic-bezier(.18,.89,.32,1.28) forwards; }
`;

export function SuccessModal({ showSuccessModal, setShowSuccessModal }: { showSuccessModal: any; setShowSuccessModal: (v: any) => void }) {
  const [phase, setPhase] = useState<'crack' | 'burst' | 'reveal'>('crack');
  const glow = showSuccessModal.glowColor || '#A855F7';
  const isSub = !!showSuccessModal.isSubsequent;        // 後續突破 = 神獸變大;第一次 = 蛋震動
  const hasImg = !!showSuccessModal.fromImage;           // 有「原本型態圖」(蛋圖 / 神獸圖)就用真圖

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('burst'), 1500);   // 蛋殼震動 1.5 秒後爆裂
    const t2 = setTimeout(() => setPhase('reveal'), 1950);  // 爆裂後揭曉
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // ── 破蛋階段:能量凝聚 + 蛋殼震動 + 爆裂閃光 ──
  if (phase !== 'reveal') {
    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 modal-force-dark">
        <style dangerouslySetInnerHTML={{ __html: cssStyles }} />
        <div className="text-center flex flex-col items-center gap-6 select-none">
          <span className="text-[11px] font-black tracking-widest text-pink-400 bg-pink-500/10 px-3 py-1 rounded-md uppercase animate-pulse">
            守護神獸進化儀式
          </span>
          <h2 className="text-base font-black text-white">
            {isSub
              ? (phase === 'crack' ? '⚡ 神獸能量突破中...' : '💥 突破進化！')
              : (phase === 'crack' ? '⚡ 神獸能量正在凝聚...' : '💥 破殼而出！')}
          </h2>
          <div className="relative w-52 h-52 flex items-center justify-center">
            <div className="absolute w-44 h-44 rounded-full blur-3xl opacity-50 animate-pulse" style={{ backgroundColor: glow }} />
            {hasImg ? (
              /* 有原本型態圖:神獸→發光變大;蛋圖→震動 */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={showSuccessModal.fromImage}
                alt="evolving"
                className={`relative w-40 h-40 object-contain z-10 ${isSub ? 'lvk-grow' : 'lvk-egg'}`}
                style={{ filter: `drop-shadow(0 0 25px ${glow})` }}
              />
            ) : (
              /* 沒有圖才退回 CSS 蛋 */
              <div
                className="relative w-28 h-36 lvk-egg"
                style={{
                  borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                  background: `radial-gradient(circle at 35% 30%, #ffffff, ${glow} 55%, #1e1b4b)`,
                  boxShadow: `0 0 40px ${glow}, inset 0 -12px 24px rgba(0,0,0,.6)`,
                  border: '1px solid rgba(255,255,255,.2)'
                }}
              />
            )}
            {/* 爆裂閃光 */}
            {phase === 'burst' && <div className="absolute w-40 h-40 bg-white rounded-full lvk-flash z-20" />}
          </div>
          <p className="text-[11px] text-slate-400 italic">{BRAND.petEnergyLine}</p>
        </div>
      </div>
    );
  }

  // ── 揭曉階段:新神獸(pop 進場) ──
  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300 modal-force-dark">
      <style dangerouslySetInnerHTML={{ __html: cssStyles }} />
      <div className="glass-panel w-full max-w-sm p-6 rounded-3xl border border-white/20 shadow-2xl relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-center space-y-6 lvk-pop">

        {/* Header info */}
        <div>
          <span className="text-[10px] font-black tracking-widest text-pink-400 bg-pink-500/10 px-2.5 py-1 rounded-md">
            {BRAND.petEvolveSuccessBadge}
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
              : `恭喜成功解鎖 ${showSuccessModal.lineName}`}
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
          <div className="text-[10px] text-slate-400 font-bold">{BRAND.petTraitLabel}</div>
          <div className="text-xs text-amber-400 font-mono font-black">{showSuccessModal.traits}</div>
          <div className="text-[11px] text-slate-300 pt-1 leading-relaxed">{showSuccessModal.desc}</div>
        </div>

        {/* Sharing slogan */}
        <p className="text-[10px] text-slate-400 italic">
          {BRAND.petContractLine}
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

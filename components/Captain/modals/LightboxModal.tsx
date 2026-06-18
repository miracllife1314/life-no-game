// 佐證圖片放大 Lightbox —— 從 CaptainDashboard 抽出，行為/UI 不變。
export function LightboxModal({ lightboxSrc, setLightboxSrc }: any) {
  return (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-900/80 border border-white/20 flex items-center justify-center text-white hover:bg-slate-800 transition-colors z-10 text-xl font-black"
            aria-label="關閉"
          >
            ✕
          </button>

          {/* Back label */}
          <div className="absolute top-4 left-4 flex items-center gap-2 text-slate-400 text-xs font-bold select-none">
            <span className="text-lg">←</span> 點擊任意處返回
          </div>

          {/* Image */}
          <img
            src={lightboxSrc}
            alt="佐證圖片"
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
  );
}

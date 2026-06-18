// 提交修行證明 Modal（上傳表單）—— 從 DailyQuestsTab 抽出，行為/UI 不變。
import { X, ImageIcon, AlertCircle, Sparkles, Send } from 'lucide-react';
import { isEvolutionTask } from '@/lib/dailyQuestLogic';
export function ProofModal({ selectedTask, proofText, proofImg, proofLink, setProofText, setProofImg, setProofLink, setShowProofModal, setSelectedTask, handleModalSubmit, handleFileChange, compressing, submitting }: any) {
  return (
        <div className="fixed inset-0 z-[60] bg-black/80 overflow-y-auto overscroll-none modal-force-dark" onClick={(e) => { if (e.target === e.currentTarget) { setShowProofModal(false); setSelectedTask(null); }}}>
          <div className="min-h-full flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) { setShowProofModal(false); setSelectedTask(null); }}}>
            <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-black text-white mb-4">
              提交修行證明：{selectedTask.name || selectedTask.title}
            </h3>
            
            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-bold mb-2">
                  心得回報與發現 (必填)
                </label>
                <textarea
                  required
                  rows={4}
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  placeholder="請分享您今天的練習經過、體驗或對應的溝通發現..."
                  className="w-full rounded-xl p-3 text-sm outline-none focus:border-amber-500 transition-colors select-text border"
                  style={{color:'var(--text-primary)', backgroundColor:'var(--input-bg)', borderColor:'var(--input-border)', userSelect:'text', WebkitUserSelect:'text'}}
                />
              </div>

              {/* 📷 選擇圖片 / 抓相簿 */}
              <div>
                <label className="block text-xs font-bold mb-2">
                  {isEvolutionTask(selectedTask) ? (
                    <span className="text-amber-500">上傳修行圖片 / 對話截圖（進化任務必附）📸</span>
                  ) : (
                    <span className="text-slate-400">上傳修行圖片 / 對話截圖 (選填)</span>
                  )}
                </label>
                
                {proofImg ? (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={proofImg} 
                      alt="預覽圖片" 
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setProofImg('')}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/75 hover:bg-black flex items-center justify-center text-white transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      id="proof-image-upload"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={compressing}
                    />
                    <label
                      htmlFor="proof-image-upload"
                      className={`w-full h-24 border border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition-all select-none ${
                        compressing ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {compressing ? (
                        <>
                          <div className="w-5 h-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                          <span className="text-[10px] text-slate-400 font-bold">圖片壓縮處理中...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon size={20} className="text-slate-500" />
                          <span className="text-[10px] text-slate-400 font-bold">點擊上傳圖片 / 抓取相簿</span>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-bold mb-2">
                  參考連結 (選填)
                </label>
                <input
                  type="url"
                  value={proofLink}
                  onChange={(e) => setProofLink(e.target.value)}
                  placeholder="如 Google Docs、對話截圖網址..."
                  className="w-full rounded-xl p-3 text-sm outline-none focus:border-amber-500 transition-colors select-text border"
                  style={{color:'var(--text-primary)', backgroundColor:'var(--input-bg)', borderColor:'var(--input-border)', userSelect:'text', WebkitUserSelect:'text'}}
                />
              </div>

              <div className="bg-slate-900/50 border border-white/5 p-3 rounded-xl flex items-start gap-2 light:bg-slate-100 light:border-slate-300">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-normal font-bold light:text-slate-600">
                  送出後，系統小隊長或大隊長將會進行手動審核。審核通過即可獲得 {selectedTask.score !== undefined ? selectedTask.score : selectedTask.points} 經驗積分。
                </p>
              </div>

              {/* 告知：是否上見證牆由審核者決定，學員端僅提示 */}
              <div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded-xl flex items-start gap-2">
                <Sparkles size={16} className="text-purple-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-purple-200 leading-normal font-bold light:text-purple-700">
                  審核通過後，你的成果有機會被分享到見證牆，讓大家一起見證！建議附上清楚的修行照片 📸
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
                  disabled={submitting || (isEvolutionTask(selectedTask) && !proofImg)}
                  className="flex-1 btn-action py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center justify-center gap-1 shimmer-btn disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={14} />
                  {submitting ? '提交中...' : (isEvolutionTask(selectedTask) && !proofImg ? '請先上傳照片' : '提交證明')}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
  );
}

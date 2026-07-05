// 提交修行證明 Modal（上傳表單）—— 固定「淺色(白天)」配色,不分日夜,避免深淺字衝突。
import { X, ImageIcon, AlertCircle, Sparkles, Send } from 'lucide-react';
import { isEvolutionTask } from '@/lib/dailyQuestLogic';
export function ProofModal({ selectedTask, proofText, proofImg, proofLink, setProofText, setProofImg, setProofLink, setShowProofModal, setSelectedTask, handleModalSubmit, handleFileChange, compressing, submitting }: any) {
  return (
        <div className="fixed inset-0 z-[60] bg-black/70 overflow-y-auto overscroll-none" onClick={(e) => { if (e.target === e.currentTarget) { setShowProofModal(false); setSelectedTask(null); }}}>
          <div className="min-h-full flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) { setShowProofModal(false); setSelectedTask(null); }}}>
            <div className="w-full max-w-md p-6 rounded-3xl border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-200 bg-white" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-black text-slate-900 mb-1.5">
              提交修行證明：{selectedTask.name || selectedTask.title}
            </h3>
            {/* 任務條件:紅色標籤 + 黑色內容,淺底 */}
            {(selectedTask.description) && (
              <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200">
                <p className="text-xs font-black text-red-600 mb-1.5">
                  📋 任務條件
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-line text-slate-900">
                  {selectedTask.description}
                </p>
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 font-bold mb-2">
                  心得回報與發現 (必填)
                </label>
                <textarea
                  required
                  rows={4}
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  placeholder="請分享您今天的練習經過、體驗或對應的溝通發現..."
                  className="w-full rounded-xl p-3 text-sm outline-none focus:border-amber-500 transition-colors select-text border bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                  style={{ userSelect:'text', WebkitUserSelect:'text' }}
                />
              </div>

              {/* 📷 選擇圖片 / 抓相簿 */}
              <div>
                <label className="block text-xs font-bold mb-2">
                  {isEvolutionTask(selectedTask) ? (
                    <span className="text-amber-600">上傳修行圖片 / 對話截圖（進化任務必附）📸</span>
                  ) : (
                    <span className="text-slate-500">上傳修行圖片 / 對話截圖 (選填)</span>
                  )}
                </label>

                {(() => {
                  const imgs = proofImg ? String(proofImg).split('|').filter(Boolean) : [];
                  return (
                    <div className="flex flex-wrap gap-2">
                      {imgs.map((src: string, idx: number) => (
                        <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-300 bg-slate-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`預覽${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setProofImg(imgs.filter((_: string, i: number) => i !== idx).join('|'))}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/75 hover:bg-black flex items-center justify-center text-white transition-colors cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {imgs.length < 3 && (
                        <>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            id="proof-image-upload"
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={compressing}
                          />
                          <label
                            htmlFor="proof-image-upload"
                            className={`w-24 h-24 border border-dashed border-slate-300 hover:border-amber-500/60 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all select-none ${
                              compressing ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {compressing ? (
                              <>
                                <div className="w-5 h-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                                <span className="text-[9px] text-slate-500 font-bold">壓縮中...</span>
                              </>
                            ) : (
                              <>
                                <ImageIcon size={18} className="text-slate-400" />
                                <span className="text-[9px] text-slate-500 font-bold">上傳 ({imgs.length}/3)</span>
                              </>
                            )}
                          </label>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs text-slate-500 font-bold mb-2">
                  參考連結 (選填)
                </label>
                <input
                  type="url"
                  value={proofLink}
                  onChange={(e) => setProofLink(e.target.value)}
                  placeholder="如 Google Docs、對話截圖網址..."
                  className="w-full rounded-xl p-3 text-sm outline-none focus:border-amber-500 transition-colors select-text border bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                  style={{ userSelect:'text', WebkitUserSelect:'text' }}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-600 leading-normal font-bold">
                  送出後，系統小隊長或大隊長將會進行手動審核。審核通過即可獲得 {selectedTask.score !== undefined ? selectedTask.score : selectedTask.points} 經驗積分。
                </p>
              </div>

              {/* 告知：是否上見證牆由審核者決定，學員端僅提示 */}
              <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl flex items-start gap-2">
                <Sparkles size={16} className="text-purple-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-purple-700 leading-normal font-bold">
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
                  className="flex-1 btn-action py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 text-xs font-bold"
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

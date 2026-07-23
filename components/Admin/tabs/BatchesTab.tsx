// =====================================================================
// 後台「期數管理」分頁 —— 從 AdminDashboard.tsx 抽出，行為/UI 完全不變。
// =====================================================================
import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Batch, Team } from '@/types';
import { BRAND } from '@/lib/brand';
import { parseTaipeiEnd } from '@/lib/time';
import { getEffectiveBatchStatus } from '@/lib/batchStatus';

interface BatchesTabProps {
  batches: Batch[];
  teams: Team[];
  isSyncing: boolean;
  onCreateBatch?: (batchData: Omit<Batch, 'id' | 'created_at' | 'updated_at'>, teamCount?: number) => Promise<void>;
  onUpdateBatch?: (batchId: string, batchData: Partial<Batch>, teamCount?: number) => Promise<void>;
  onDeleteBatch?: (batchId: string) => Promise<void>;
}

export function BatchesTab({ batches, teams, isSyncing, onCreateBatch, onUpdateBatch, onDeleteBatch }: BatchesTabProps) {
  // --- Batch Management States ---
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchStartDate, setNewBatchStartDate] = useState('');
  const [newBatchEndDate, setNewBatchEndDate] = useState('');
  const [newBatchStatus, setNewBatchStatus] = useState<'draft' | 'active' | 'ended'>('draft');
  const [newBatchTeamCount, setNewBatchTeamCount] = useState<number | string>(4);

  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editBatchName, setEditBatchName] = useState('');
  const [editBatchStartDate, setEditBatchStartDate] = useState('');
  const [editBatchEndDate, setEditBatchEndDate] = useState('');
  const [editBatchStatus, setEditBatchStatus] = useState<'draft' | 'active' | 'ended'>('draft');
  const [editBatchTeamCount, setEditBatchTeamCount] = useState<number | string>(4);

  const startEditBatch = (batch: Batch) => {
    setEditingBatchId(batch.id);
    setEditBatchName(batch.name);
    setEditBatchStartDate(batch.start_date.substring(0, 10));
    setEditBatchEndDate(batch.end_date.substring(0, 10));
    setEditBatchStatus(batch.status);
    const count = teams.filter(t => t.batch_id === batch.id).length;
    setEditBatchTeamCount(count);
  };

  const cancelEditBatch = () => {
    setEditingBatchId(null);
  };

  const handleSaveBatchEdit = async (batchId: string) => {
    if (!editBatchName || !editBatchStartDate || !editBatchEndDate) return;
    if (confirm(`確定要儲存期數「${editBatchName}」的設定與小隊變更嗎？`)) {
      if (onUpdateBatch) {
        await onUpdateBatch(batchId, {
          name: editBatchName,
          start_date: new Date(editBatchStartDate).toISOString(),
          end_date: new Date(editBatchEndDate).toISOString(),
          status: editBatchStatus
        }, Number(editBatchTeamCount) || 4);
        setEditingBatchId(null);
        alert('期數與小隊更新成功！');
      }
    }
  };

  const handleCreateBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName || !newBatchStartDate || !newBatchEndDate) return;
    if (onCreateBatch) {
      await onCreateBatch({
        name: newBatchName,
        start_date: new Date(newBatchStartDate).toISOString(),
        end_date: new Date(newBatchEndDate).toISOString(),
        status: newBatchStatus
      }, Number(newBatchTeamCount) || 4);
      setNewBatchName('');
      setNewBatchStartDate('');
      setNewBatchEndDate('');
      setNewBatchStatus('draft');
      setNewBatchTeamCount(4);
      alert('期數與小隊建立成功！');
    }
  };

  return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300 text-left">
          {/* 新增期數表單 */}
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 lg:col-span-1 select-none">
            <h3 className="font-black text-white text-base flex items-center gap-2 light:text-slate-900">
              <Calendar size={18} className="text-red-500" />
              建立新課程期數
            </h3>
            <form onSubmit={handleCreateBatchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 light:text-slate-500 font-bold mb-1.5">期數名稱</label>
                <input
                  required
                  type="text"
                  value={newBatchName}
                  onChange={e => setNewBatchName(e.target.value)}
                  placeholder={`例如：${BRAND.batchPrefix}50期`}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 light:text-slate-500 font-bold mb-1.5">開始日期</label>
                <input
                  required
                  type="date"
                  value={newBatchStartDate}
                  onChange={e => setNewBatchStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 light:text-slate-500 font-bold mb-1.5">結束日期</label>
                <input
                  required
                  type="date"
                  value={newBatchEndDate}
                  onChange={e => setNewBatchEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 light:text-slate-500 font-bold mb-1.5">期數狀態</label>
                <select
                  value={newBatchStatus}
                  onChange={e => setNewBatchStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                >
                  <option value="draft">草稿 (draft)</option>
                  <option value="active">進行中 (active)</option>
                  <option value="ended">已結束 (ended)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 light:text-slate-500 font-bold mb-1.5">自動生成小隊數量</label>
                <input
                  required
                  type="number"
                  onFocus={(e) => e.target.select()}
                  min="1"
                  max="20"
                  value={newBatchTeamCount}
                  onChange={e => setNewBatchTeamCount(e.target.value === '' ? '' : (Number(e.target.value) || 0))}
                  onBlur={() => { if (newBatchTeamCount === '') setNewBatchTeamCount(4); }}
                  placeholder="本期預計生成的小隊數量"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                />
              </div>
              <button
                type="submit"
                disabled={isSyncing}
                className="w-full btn-action py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-black shadow-md shadow-red-500/10 transition-all"
              >
                儲存並建立期數
              </button>
            </form>
          </section>

          {/* 期數列表與編輯區 */}
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 lg:col-span-2">
            <h3 className="font-black text-white text-base select-none light:text-slate-900">
              目前課程期數列表 ({batches.length})
            </h3>
            <div className="bg-slate-950/60 border border-white/5 rounded-2xl overflow-x-auto light:bg-slate-50 light:border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 font-bold uppercase light:border-slate-200 select-none">
                    <th className="p-3">期數名稱</th>
                    <th className="p-3">開始日期</th>
                    <th className="p-3">結束日期</th>
                    <th className="p-3 text-center">小組數</th>
                    <th className="p-3 text-center">狀態</th>
                    <th className="p-3 text-center">排行榜公開</th>
                    <th className="p-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 light:divide-slate-200">
                  {batches.map(batch => {
                    const isEditing = editingBatchId === batch.id;
                    const teamCount = teams.filter(t => t.batch_id === batch.id).length;
                    // 期數是否結束一律走共用判斷(lib/batchStatus),全站一致。
                    const effectiveStatus = getEffectiveBatchStatus(batch);

                    return (
                      <tr key={batch.id} className="hover:bg-white/[0.01] light:hover:bg-slate-100/30">
                        {isEditing ? (
                          <>
                            <td className="p-2">
                              <input
                                type="text"
                                value={editBatchName}
                                onChange={e => setEditBatchName(e.target.value)}
                                className="w-24 min-w-[90px] bg-slate-905 border border-slate-800 text-white rounded p-1.5 text-xs outline-none focus:border-red-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="date"
                                value={editBatchStartDate}
                                onChange={e => setEditBatchStartDate(e.target.value)}
                                className="w-28 min-w-[110px] bg-slate-905 border border-slate-800 text-white rounded p-1.5 text-xs outline-none focus:border-red-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="date"
                                value={editBatchEndDate}
                                onChange={e => setEditBatchEndDate(e.target.value)}
                                className="w-28 min-w-[110px] bg-slate-905 border border-slate-800 text-white rounded p-1.5 text-xs outline-none focus:border-red-500"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                onFocus={(e) => e.target.select()}
                                min="1"
                                max="20"
                                value={editBatchTeamCount}
                                onChange={e => setEditBatchTeamCount(e.target.value === '' ? '' : (Number(e.target.value) || 0))}
                                onBlur={() => { if (editBatchTeamCount === '') setEditBatchTeamCount(4); }}
                                className="w-14 bg-slate-905 border border-slate-800 text-white rounded p-1.5 text-xs outline-none text-center focus:border-red-500"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <select
                                value={editBatchStatus}
                                onChange={e => setEditBatchStatus(e.target.value as any)}
                                className="bg-slate-905 border border-slate-800 text-white rounded p-1.5 text-xs outline-none focus:border-red-500 cursor-pointer"
                              >
                                <option value="draft">草稿</option>
                                <option value="active">進行中</option>
                                <option value="ended">已結束</option>
                              </select>
                            </td>
                            <td className="p-2 text-center">
                              {/* Placeholder for rankings_visible column in editing mode */}
                            </td>
                            <td className="p-2 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={cancelEditBatch}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-[10px] font-bold cursor-pointer"
                              >
                                取消
                              </button>
                              <button
                                onClick={() => handleSaveBatchEdit(batch.id)}
                                className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded text-[10px] font-black cursor-pointer"
                              >
                                儲存
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 font-bold text-white light:text-slate-900">{batch.name}</td>
                            <td className="p-3 text-slate-300 light:text-slate-700 font-mono">{batch.start_date.substring(0, 10)}</td>
                            <td className="p-3 text-slate-300 light:text-slate-700 font-mono">{batch.end_date.substring(0, 10)}</td>
                            <td className="p-3 text-center text-amber-500 font-bold font-mono">{teamCount} 組</td>
                            <td className="p-3 text-center select-none">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                effectiveStatus === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : effectiveStatus === 'draft'
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {effectiveStatus === 'active'
                                  ? '進行中'
                                  : effectiveStatus === 'draft'
                                  ? '草稿'
                                  : '已結束'}
                              </span>
                            </td>
                            <td className="p-3 text-center select-none">
                              {(() => {
                                const isEndWithin7Days = (parseTaipeiEnd(batch.end_date).getTime() - Date.now()) <= 7 * 86400000;
                                return (
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                    batch.rankings_visible === true
                                      ? 'bg-green-500/10 text-green-400'
                                      : batch.rankings_visible === false
                                      ? 'bg-red-500/10 text-red-400'
                                      : isEndWithin7Days
                                      ? 'bg-red-500/10 text-red-400'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {batch.rankings_visible === true
                                      ? '公開中 (手動)'
                                      : batch.rankings_visible === false
                                      ? '封印中 (手動)'
                                      : isEndWithin7Days
                                      ? '封印中 (倒數)'
                                      : '常規公開'}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="p-3 text-right select-none space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => startEditBatch(batch)}
                                className="px-2 py-1 bg-slate-900 border border-white/5 text-[10px] rounded hover:border-amber-500/30 text-amber-400 font-bold light:bg-slate-100 light:border-slate-300 cursor-pointer inline-block"
                              >
                                編輯期數
                              </button>
                              {(() => {
                                const isEndWithin7Days = (parseTaipeiEnd(batch.end_date).getTime() - Date.now()) <= 7 * 86400000;
                                const isCurrentlyLocked = isEndWithin7Days ? batch.rankings_visible !== true : batch.rankings_visible === false;
                                return (
                                  <button
                                    onClick={() => onUpdateBatch?.(batch.id, { rankings_visible: isCurrentlyLocked })}
                                    className={`px-2 py-1 border text-[10px] rounded font-bold cursor-pointer inline-block ${
                                      !isCurrentlyLocked
                                        ? 'bg-slate-800 border-white/5 text-slate-300 hover:text-white'
                                        : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
                                    }`}
                                  >
                                    {!isCurrentlyLocked ? '隱藏排行' : '公開排行'}
                                  </button>
                                );
                              })()}
                              {onDeleteBatch && (
                                <button
                                  onClick={async () => {
                                    if (confirm(`⚠️ 確定要刪除「${batch.name}」這個期數嗎？\n\n此操作無法復原，該期數的相關任務與規則資料也會一併刪除。`)) {
                                      try {
                                        await onDeleteBatch(batch.id);
                                      } catch (err: any) {
                                        alert(`❌ ${err?.message || '刪除期數失敗，請稍後再試。'}`);
                                      }
                                    }
                                  }}
                                  className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-[10px] rounded hover:bg-red-500 hover:text-white text-red-400 font-bold cursor-pointer inline-block transition-colors"
                                >
                                  🗑️ 刪除
                                </button>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {batches.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                        目前尚無任何課程期數。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
  );
}

// =====================================================================
// 臨時任務「套組」區塊(掛在任務管理頁上方)。
// 用途:把常用的一組加分任務(如課後課加分包)先組好,之後每次活動只要開套組、
//   改個日期就能一鍵把整組發布成任務,免得一個一個設。
// 一頁式:同一個視窗內設定「任務內容 + 時間 + 天數 + 類型 + 期數」,可只儲存或直接發布。
// 資料層見 lib/taskBundles.ts(存 app_config)。發布走 onPublish(批次建立 tasks)。
// =====================================================================
import { useEffect, useState } from 'react';
import { Package, Plus, Trash2, Pencil, Rocket, Send, Save } from 'lucide-react';
import { Batch, Task, TaskType } from '@/types';
import {
  TaskBundle, TaskBundleItem,
  getAllBundles, loadBundlesFromDB, saveBundlesToDB,
} from '@/lib/taskBundles';

const TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'limited', label: '限時任務' },
  { value: 'temporary', label: '特殊任務' },
  { value: 'daily', label: '每日定課' },
  { value: 'weekly', label: '每週任務' },
];

interface Props {
  batches: Batch[];
  onPublish: (tasksData: Omit<Task, 'id' | 'created_at' | 'created_by'>[]) => Promise<boolean>;
}

const newId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `b-${Math.floor(Math.random() * 1e9)}`;

const blankItem = (): TaskBundleItem => ({ id: newId(), name: '', score: 100, requires_approval: false });

export function TaskBundlesSection({ batches, onPublish }: Props) {
  const [bundles, setBundles] = useState<TaskBundle[]>(getAllBundles());
  const [collapsed, setCollapsed] = useState(true);

  // 目前開啟編輯/發布的套組(含記住的 days/type);null = 關閉
  const [editing, setEditing] = useState<TaskBundle | null>(null);
  // 這次發布用的「開始時間 / 期數」(不存進套組,每次自己填)
  const [pubStart, setPubStart] = useState('');
  const [pubBatchId, setPubBatchId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadBundlesFromDB().then(setBundles);
  }, []);

  const persist = async (next: TaskBundle[]) => {
    setBundles(next);
    const { error } = await saveBundlesToDB(next);
    if (error) alert('❌ 套組儲存失敗,請稍後再試。\n(' + error + ')');
    return !error;
  };

  const openNew = () => {
    setEditing({ id: newId(), name: '', items: [blankItem()], days: 1, type: 'limited' });
    setPubStart('');
    setPubBatchId('');
  };
  const openBundle = (b: TaskBundle) => {
    setEditing(JSON.parse(JSON.stringify({ days: 1, type: 'limited', ...b })));
    setPubStart('');
    setPubBatchId('');
  };

  const updateItem = (idx: number, patch: Partial<TaskBundleItem>) => {
    if (!editing) return;
    setEditing({ ...editing, items: editing.items.map((it, i) => i === idx ? { ...it, ...patch } : it) });
  };
  const addItem = () => editing && setEditing({ ...editing, items: [...editing.items, blankItem()] });
  const removeItem = (idx: number) => editing && setEditing({ ...editing, items: editing.items.filter((_, i) => i !== idx) });

  // 整理 + 存回 bundles 陣列,回傳整理後的套組(給發布用)
  const buildCleaned = (): TaskBundle | null => {
    if (!editing) return null;
    const name = editing.name.trim();
    const items = editing.items.filter(i => i.name.trim());
    if (!name) { alert('請填套組名稱'); return null; }
    if (!items.length) { alert('至少要有一個任務(且填名稱)'); return null; }
    return { ...editing, name, items };
  };

  const persistBundle = async (cleaned: TaskBundle) => {
    const exists = bundles.some(b => b.id === cleaned.id);
    const next = exists ? bundles.map(b => b.id === cleaned.id ? cleaned : b) : [...bundles, cleaned];
    return persist(next);
  };

  // 只儲存(下次再發布)
  const handleSaveOnly = async () => {
    const cleaned = buildCleaned();
    if (!cleaned) return;
    if (await persistBundle(cleaned)) setEditing(null);
  };

  // 儲存 + 立即發布
  const handlePublish = async () => {
    const cleaned = buildCleaned();
    if (!cleaned) return;
    if (!pubStart) { alert('請選擇開始日期'); return; }
    const days = Number(cleaned.days) || 1;
    if (days < 1) { alert('持續天數至少 1 天'); return; }
    if (!pubBatchId) { alert('請選擇要發布的期數'); return; }

    // 開始日期 → 當天 00:00(台灣牆上時鐘);結束 = 開始日 +（天數-1）當天 23:59:59。
    // 例:選 7/25、持續 3 天 → 7/25 00:00 ～ 7/27 23:59。
    const start = new Date(`${pubStart}T00:00:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + (days - 1));
    end.setHours(23, 59, 59, 999);
    const batch_id = pubBatchId === '__all__' ? null : pubBatchId;
    const nowISO = new Date().toISOString();
    const type = (cleaned.type || 'limited') as TaskType;

    const tasksData = cleaned.items.map(it => ({
      name: it.name,
      description: it.description || '',
      type,
      score: Number(it.score) || 0,
      requires_approval: it.requires_approval,
      requires_proof: it.requires_approval,
      publish_time: nowISO,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      target_type: 'all' as Task['target_type'],
      target_team_id: null,
      target_user_id: null,
      batch_id,
      category: '初階',
      max_completions: 1,
    }));

    setBusy(true);
    try {
      const ok = await onPublish(tasksData);
      if (ok) {
        await persistBundle(cleaned);   // 一併把套組內容/預設存起來,下次可重複用
        const where = batch_id ? (batches.find(b => b.id === batch_id)?.name || '該期數') : '全部期數(通用)';
        const typeLabel = TYPE_OPTIONS.find(o => o.value === type)?.label;
        alert(`✅ 已發布「${cleaned.name}」共 ${tasksData.length} 個${typeLabel}到「${where}」！`);
        setEditing(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const deleteBundle = async (id: string) => {
    const b = bundles.find(x => x.id === id);
    if (!b) return;
    if (!window.confirm(`確定刪除套組「${b.name}」嗎?此動作無法復原(不影響已發布出去的任務)。`)) return;
    await persist(bundles.filter(x => x.id !== id));
  };

  // Modal 一律「淺色」配色(淺底深字),避免深色輸入框配白底看不清楚。
  const inputCls = 'w-full bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl p-2.5 text-sm outline-none focus:border-amber-500 focus:bg-white';
  const labelCls = 'block text-xs text-slate-700 font-bold mb-1';

  return (
    <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
      {/* Header */}
      <div className="flex justify-between items-center gap-3">
        <button onClick={() => setCollapsed(c => !c)} className="flex items-center gap-2 cursor-pointer">
          <Package size={18} className="text-amber-500" />
          <h3 className="font-black text-white text-base light:text-slate-900">臨時任務套組(一鍵發布)</h3>
          <span className="text-[10px] text-slate-500 font-bold">{collapsed ? '▸ 展開' : '▾ 收起'}</span>
        </button>
        {!collapsed && (
          <button onClick={openNew} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-[11px] font-black flex items-center gap-1 active:scale-95 transition-all cursor-pointer shrink-0">
            <Plus size={13} /> 新增套組
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          <p className="text-[11px] text-slate-400 light:text-slate-500 leading-relaxed">
            把課後課、活動加分等常用任務先組成套組。之後活動時,開套組 → 改個日期 → 一鍵全部發布,不用一個一個設。
          </p>

          {bundles.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              還沒有套組。按右上角「新增套組」建立第一個(例:課後課加分包)。
            </div>
          ) : (
            <div className="space-y-2.5">
              {bundles.map(b => (
                <div key={b.id} className="p-3.5 bg-slate-950/50 border border-white/5 rounded-2xl light:bg-slate-50 light:border-slate-200">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="font-black text-white text-sm light:text-slate-900 flex items-center gap-1.5">
                        📦 {b.name}
                        <span className="text-[10px] font-bold text-slate-500">({b.items.length} 個任務)</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {b.items.map(it => (
                          <span key={it.id} className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800/70 text-slate-300 light:bg-slate-200 light:text-slate-700">
                            {it.name} <span className="text-amber-500 font-bold">+{it.score}</span>{it.requires_approval ? ' · 需審核' : ' · 免審'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => openBundle(b)} className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-black flex items-center gap-1 active:scale-95 cursor-pointer">
                        <Rocket size={12} /> 開啟 / 發布
                      </button>
                      <button onClick={() => deleteBundle(b.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer" title="刪除套組">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== 一頁式:編輯 + 發布 Modal ===== */}
      {editing && (
        <div className="fixed inset-0 z-[60] bg-black/70 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget && !busy) setEditing(null); }}>
          <div className="min-h-full flex items-start sm:items-center justify-center p-4">
            <div className="w-full max-w-lg p-6 rounded-3xl border border-slate-200 shadow-2xl bg-white space-y-4 my-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Package size={18} className="text-amber-500" />
                {bundles.some(b => b.id === editing.id) ? '編輯 / 發布套組' : '新增套組'}
              </h3>

              <div>
                <label className={labelCls}>套組名稱</label>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="例:課後課加分包" className={inputCls} />
              </div>

              {/* 任務內容 */}
              <div className="space-y-2">
                <label className={labelCls}>套組內的任務</label>
                {editing.items.map((it, i) => (
                  <div key={it.id} className="p-3.5 pt-9 bg-slate-100 border border-slate-200 rounded-2xl space-y-2 relative">
                    <button type="button" onClick={() => removeItem(i)} className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-red-100 hover:bg-red-500 text-red-600 hover:text-white rounded-lg text-[11px] font-black transition-colors cursor-pointer">
                      <Trash2 size={13} /> 刪除
                    </button>
                    <div>
                      <label className="block text-xs text-slate-700 font-bold mb-1">任務名稱</label>
                      <input value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })} placeholder="例:出席課後課" className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <div>
                        <label className="block text-xs text-slate-700 font-bold mb-1">加分</label>
                        <input type="number" value={it.score === 0 ? '' : it.score} placeholder="0" onChange={(e) => updateItem(i, { score: e.target.value === '' ? 0 : Number(e.target.value) })} className={inputCls} />
                      </div>
                      <label className="flex items-center gap-2 h-[42px] px-2 rounded-xl bg-white border border-slate-300 cursor-pointer select-none">
                        <input type="checkbox" checked={it.requires_approval} onChange={(e) => updateItem(i, { requires_approval: e.target.checked })} className="w-4 h-4 rounded text-amber-500 cursor-pointer" />
                        <span className="text-xs text-slate-800 font-bold">需審核</span>
                      </label>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addItem} className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-dashed border-slate-300 text-[11px] font-bold text-slate-600 rounded-xl flex items-center justify-center gap-1 cursor-pointer">
                  <Plus size={12} /> 新增任務
                </button>
              </div>

              {/* 發布設定 */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                <div className="text-xs font-black text-amber-700 flex items-center gap-1">🚀 發布設定</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>開始日期</label>
                    {/* 選完日期就 blur → 讓日曆彈窗收起來(不然桌機會一直開著) */}
                    <input
                      type="date"
                      value={pubStart}
                      onChange={(e) => { const el = e.currentTarget; setPubStart(el.value); setTimeout(() => el.blur(), 0); }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>持續幾天</label>
                    <input type="number" min={1} value={editing.days ?? ''} placeholder="1" onChange={(e) => setEditing({ ...editing, days: e.target.value === '' ? undefined : Number(e.target.value) })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>發布成哪種任務</label>
                    <select value={editing.type || 'limited'} onChange={(e) => setEditing({ ...editing, type: e.target.value as TaskType })} className={`${inputCls} cursor-pointer`}>
                      {TYPE_OPTIONS.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>發布到哪個期數</label>
                    <select value={pubBatchId} onChange={(e) => setPubBatchId(e.target.value)} className={`${inputCls} cursor-pointer`}>
                      <option value="">請選擇...</option>
                      <option value="__all__">🌐 全部期數(通用)</option>
                      {batches.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
                    </select>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  「只儲存套組」= 存起來下次用,不發布。「發布」= 立刻建立任務(同時也存起來,下次可重複用)。
                </p>
              </div>

              {/* 按鈕 */}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => !busy && setEditing(null)} disabled={busy} className="flex-1 min-w-[80px] py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 text-xs font-bold cursor-pointer disabled:opacity-50">取消</button>
                <button onClick={handleSaveOnly} disabled={busy} className="flex-1 min-w-[110px] py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
                  <Save size={13} /> 只儲存套組
                </button>
                <button onClick={handlePublish} disabled={busy} className="flex-1 min-w-[130px] py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
                  <Send size={13} /> {busy ? '發布中…' : `發布 (${editing.items.filter(i => i.name.trim()).length} 個)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

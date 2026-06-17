// =====================================================================
// 後台「任務模板庫」分頁（模板 CRUD + 分類管理）—— 從 AdminDashboard.tsx 抽出，行為/UI 不變。
// =====================================================================
import { useState } from 'react';
import { BookOpen, Sliders, X } from 'lucide-react';
import { MissionTemplate } from '@/types';

interface MissionTemplatesTabProps {
  missionTemplates: MissionTemplate[];
  missionCategories: string[];
  setMissionCategories: React.Dispatch<React.SetStateAction<string[]>>;
  isSyncing: boolean;
  onCreateMissionTemplate?: (templateData: Omit<MissionTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateMissionTemplate?: (templateId: string, templateData: Partial<MissionTemplate>) => Promise<void>;
  onDeleteMissionTemplate?: (templateId: string) => Promise<void>;
}

export function MissionTemplatesTab({ missionTemplates, missionCategories, setMissionCategories, isSyncing, onCreateMissionTemplate, onUpdateMissionTemplate, onDeleteMissionTemplate }: MissionTemplatesTabProps) {
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const handleAddCategory = () => {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) return;
    if (missionCategories.includes(trimmed)) {
      alert('該分類已存在！');
      return;
    }
    const updated = [...missionCategories, trimmed];
    setMissionCategories(updated);
    localStorage.setItem('nlp_mission_categories', JSON.stringify(updated));
    setCustomCategoryInput('');
  };

  const handleRemoveCategory = (catToRemove: string) => {
    if (confirm(`確定要刪除「${catToRemove}」分類嗎？`)) {
      const updated = missionCategories.filter(cat => cat !== catToRemove);
      setMissionCategories(updated);
      localStorage.setItem('nlp_mission_categories', JSON.stringify(updated));
    }
  };
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateType, setNewTemplateType] = useState<'daily' | 'weekly' | 'special' | 'limited'>('daily');
  const [newTemplatePoints, setNewTemplatePoints] = useState<string | number>(50);
  const [newTemplateReviewType, setNewTemplateReviewType] = useState<'auto' | 'leader' | 'admin'>('leader');
  const [newTemplateActive, setNewTemplateActive] = useState<boolean>(true);
  const [newTemplateCategory, setNewTemplateCategory] = useState<string>('初階');
  const [newTemplateMaxCompletions, setNewTemplateMaxCompletions] = useState<number>(1);

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editTemplateTitle, setEditTemplateTitle] = useState('');
  const [editTemplateDesc, setEditTemplateDesc] = useState('');
  const [editTemplateType, setEditTemplateType] = useState<'daily' | 'weekly' | 'special' | 'limited'>('daily');
  const [editTemplatePoints, setEditTemplatePoints] = useState<string | number>(50);
  const [editTemplateReviewType, setEditTemplateReviewType] = useState<'auto' | 'leader' | 'admin'>('leader');
  const [editTemplateActive, setEditTemplateActive] = useState<boolean>(true);
  const [editTemplateCategory, setEditTemplateCategory] = useState<string>('初階');
  const [editTemplateMaxCompletions, setEditTemplateMaxCompletions] = useState<number>(1);

  const [templateFilterCategory, setTemplateFilterCategory] = useState<string>('全部');
  const startEditTemplate = (template: MissionTemplate) => {
    setEditingTemplateId(template.id);
    setEditTemplateTitle(template.title);
    setEditTemplateDesc(template.description);
    setEditTemplateType(template.mission_type);
    setEditTemplatePoints(template.points);
    setEditTemplateReviewType(template.review_type ?? 'leader');
    setEditTemplateActive(template.is_active);
    setEditTemplateCategory(template.category ?? '初階');
    setEditTemplateMaxCompletions(template.max_completions ?? 1);
  };

  const cancelEditTemplate = () => {
    setEditingTemplateId(null);
  };

  const handleSaveTemplateEdit = async (templateId: string) => {
    if (!editTemplateTitle || !editTemplateDesc) return;
    if (onUpdateMissionTemplate) {
      await onUpdateMissionTemplate(templateId, {
        title: editTemplateTitle,
        description: editTemplateDesc,
        mission_type: editTemplateType,
        points: Number(editTemplatePoints) || 0,
        review_type: editTemplateReviewType,
        is_active: editTemplateActive,
        category: editTemplateCategory,
        max_completions: editTemplateMaxCompletions
      });
      setEditingTemplateId(null);
    }
  };

  const handleCreateTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateTitle || !newTemplateDesc) return;
    if (onCreateMissionTemplate) {
      await onCreateMissionTemplate({
        title: newTemplateTitle,
        description: newTemplateDesc,
        mission_type: newTemplateType,
        points: Number(newTemplatePoints) || 0,
        review_type: newTemplateReviewType,
        is_active: newTemplateActive,
        category: newTemplateCategory,
        max_completions: newTemplateMaxCompletions
      });
      setNewTemplateTitle('');
      setNewTemplateDesc('');
      setNewTemplateType('daily');
      setNewTemplatePoints(50);
      setNewTemplateReviewType('leader');
      setNewTemplateActive(true);
      setNewTemplateCategory('初階');
      setNewTemplateMaxCompletions(1);
      alert('任務模板建立成功！');
    }
  };

  return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300 text-left">
          
          <div className="space-y-6 lg:col-span-1">
            {/* 新增任務模板表單 */}
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 select-none">
              <h3 className="font-black text-white text-base flex items-center gap-2 light:text-slate-900">
                <BookOpen size={18} className="text-red-500" />
                建立新任務模板
              </h3>
              <form onSubmit={handleCreateTemplateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 light:text-slate-500 font-bold mb-1.5">任務標題</label>
                  <input
                    required
                    type="text"
                    value={newTemplateTitle}
                    onChange={e => setNewTemplateTitle(e.target.value)}
                    placeholder="例如：每日金句分享"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 light:text-slate-500 font-bold mb-1.5">任務內容說明</label>
                  <textarea
                    required
                    rows={3}
                    value={newTemplateDesc}
                    onChange={e => setNewTemplateDesc(e.target.value)}
                    placeholder="請輸入任務具體完成標準..."
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 light:text-slate-500 font-bold mb-1.5">任務類型</label>
                  <select
                    value={newTemplateType}
                    onChange={e => setNewTemplateType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                  >
                    <option value="daily">每日任務 (daily)</option>
                    <option value="weekly">每週任務 (weekly)</option>
                    <option value="special">特殊任務 (special)</option>
                    <option value="limited">限時任務 (limited)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 light:text-slate-500 font-bold mb-1.5">任務分類</label>
                  <select
                    value={newTemplateCategory}
                    onChange={e => setNewTemplateCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                  >
                    {missionCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 light:text-slate-500 font-bold mb-1.5">任務分數</label>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={newTemplatePoints}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setNewTemplatePoints(val);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                  />
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs text-slate-400 light:text-slate-500 font-bold">
                    審核方式
                  </label>
                  <select
                    value={newTemplateReviewType}
                    onChange={e => setNewTemplateReviewType(e.target.value as 'auto' | 'leader' | 'admin')}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900 font-bold"
                  >
                    <option value="auto">免審核 (自動核准)</option>
                    <option value="leader">隊長審核</option>
                    <option value="admin">管理員審核</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 light:text-slate-500 font-bold mb-1.5">可完成次數限制</label>
                  <select
                    value={newTemplateMaxCompletions}
                    onChange={e => setNewTemplateMaxCompletions(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900 font-bold"
                  >
                    <option value={1}>1 次 (預設)</option>
                    <option value={2}>2 次</option>
                    <option value={3}>3 次</option>
                    <option value={4}>4 次</option>
                    <option value={5}>5 次</option>
                    <option value={10}>10 次</option>
                    <option value={0}>無限次</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="newTemplateActive"
                    checked={newTemplateActive}
                    onChange={e => setNewTemplateActive(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-red-500 focus:ring-red-500 h-4 w-4 outline-none light:bg-slate-50 light:border-slate-200"
                  />
                  <label htmlFor="newTemplateActive" className="text-xs text-slate-400 light:text-slate-500 font-bold select-none cursor-pointer">
                    啟用此任務模板
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="w-full btn-action py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-black shadow-md shadow-red-500/10 transition-all"
                >
                  儲存並建立模板
                </button>
              </form>
            </section>

            {/* 建立任務分類 */}
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 select-none">
              <h3 className="font-black text-white text-base flex items-center gap-2 light:text-slate-900">
                <Sliders size={18} className="text-amber-500" />
                建立任務分類
              </h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCategoryInput}
                    onChange={e => setCustomCategoryInput(e.target.value)}
                    placeholder="例如：期數任務"
                    className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="btn-action px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-md shadow-amber-500/10 transition-all"
                  >
                    新增
                  </button>
                </div>
                
                {/* 目前分類清單 */}
                <div className="pt-2">
                  <span className="block text-[10px] text-slate-400 light:text-slate-500 font-bold mb-1.5 uppercase tracking-wider">
                    現有分類清單
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {missionCategories.map(cat => (
                      <div
                        key={cat}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-white/5 text-[10px] text-slate-300 font-bold light:bg-slate-100 light:border-slate-200 light:text-slate-700"
                      >
                        <span>{cat}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(cat)}
                          className="hover:text-red-400 text-slate-500 transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* 任務模板列表與編輯區 */}
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
              <h3 className="font-black text-white text-base light:text-slate-900">
                預設任務模板列表 ({missionTemplates.length})
              </h3>
              
              {/* Category filter bar */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-slate-400 font-bold">分類篩選:</span>
                {['全部', ...missionCategories].map(cat => {
                  const isActive = templateFilterCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setTemplateFilterCategory(cat)}
                      className={`py-1 px-2.5 rounded-lg text-[9px] font-black transition-all cursor-pointer ${
                        isActive
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white light:bg-slate-100 light:border-slate-300 light:text-slate-500'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-white/5 rounded-2xl overflow-hidden light:bg-slate-50 light:border-slate-300">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 font-bold uppercase light:border-slate-200 select-none">
                      <th className="p-3 w-[18%] min-w-[130px] sticky left-0 z-20 bg-slate-900 light:bg-slate-100 border-r border-white/5 light:border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">模板名稱</th>
                      <th className="p-3 w-[32%] min-w-[240px]">任務說明</th>
                      <th className="p-3 text-center min-w-[85px]">分類</th>
                      <th className="p-3 text-center min-w-[85px]">類型</th>
                      <th className="p-3 text-center min-w-[75px]">分數</th>
                      <th className="p-3 text-center min-w-[90px]">審核</th>
                      <th className="p-3 text-center min-w-[90px]">次數</th>
                      <th className="p-3 text-center min-w-[65px]">狀態</th>
                      <th className="p-3 text-right min-w-[125px]">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 light:divide-slate-200">
                    {missionTemplates
                       .filter(t => {
                         if (templateFilterCategory === '全部') {
                           return t.category !== '神獸進化';
                         }
                         return t.category === templateFilterCategory;
                       })
                       .sort((a, b) => {
                         const order = { daily: 1, weekly: 2, special: 3, limited: 4 };
                         return (order[a.mission_type] || 5) - (order[b.mission_type] || 5);
                       })
                       .map(template => {
                         const isEditing = editingTemplateId === template.id;
                         return (
                           <tr key={template.id} className="hover:bg-white/[0.01] light:hover:bg-slate-100/30">
                             {isEditing ? (
                               <>
                                 <td className="p-3 font-bold text-white light:text-slate-900 sticky left-0 z-10 bg-slate-950 light:bg-white border-r border-white/5 light:border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">
                                   <input
                                     type="text"
                                     value={editTemplateTitle}
                                     onChange={e => setEditTemplateTitle(e.target.value)}
                                     className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 text-xs font-bold outline-none light:bg-white light:border-slate-200 light:text-slate-900"
                                   />
                                 </td>
                                 <td className="p-2">
                                   <textarea
                                     rows={2}
                                     value={editTemplateDesc}
                                     onChange={e => setEditTemplateDesc(e.target.value)}
                                     className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 text-xs outline-none resize-none light:bg-white light:border-slate-200 light:text-slate-900"
                                   />
                                 </td>
                                 <td className="p-2 text-center">
                                   <select
                                     value={editTemplateCategory}
                                     onChange={e => setEditTemplateCategory(e.target.value)}
                                     className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 text-xs outline-none light:bg-white light:border-slate-200 light:text-slate-900"
                                   >
                                     {missionCategories.map(cat => (
                                       <option key={cat} value={cat}>{cat}</option>
                                     ))}
                                   </select>
                                 </td>
                                 <td className="p-2 text-center">
                                   <select
                                     value={editTemplateType}
                                     onChange={e => setEditTemplateType(e.target.value as any)}
                                     className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 text-xs outline-none light:bg-white light:border-slate-200 light:text-slate-900"
                                   >
                                     <option value="daily">每日</option>
                                     <option value="weekly">每週</option>
                                     <option value="special">特殊</option>
                                     <option value="limited">限時</option>
                                   </select>
                                 </td>
                                 <td className="p-2">
                                   <input
                                     type="text"
                                     inputMode="numeric"
                                     pattern="[0-9]*"
                                     value={editTemplatePoints}
                                     onChange={e => {
                                       const val = e.target.value.replace(/[^0-9]/g, '');
                                       setEditTemplatePoints(val);
                                     }}
                                     className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 text-xs text-center outline-none light:bg-white light:border-slate-200 light:text-slate-900"
                                   />
                                 </td>
                                 <td className="p-2 text-center">
                                   <select
                                     value={editTemplateReviewType}
                                     onChange={e => setEditTemplateReviewType(e.target.value as 'auto' | 'leader' | 'admin')}
                                     className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1 text-xs outline-none light:bg-white light:border-slate-200 light:text-slate-900"
                                   >
                                     <option value="auto">免</option>
                                     <option value="leader">隊長</option>
                                     <option value="admin">管理</option>
                                   </select>
                                 </td>
                                 <td className="p-2 text-center">
                                   <select
                                     value={editTemplateMaxCompletions}
                                     onChange={e => setEditTemplateMaxCompletions(Number(e.target.value))}
                                     className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 text-xs outline-none font-bold light:bg-white light:border-slate-200 light:text-slate-900"
                                   >
                                     <option value={1}>1次</option>
                                     <option value={2}>2次</option>
                                     <option value={3}>3次</option>
                                     <option value={4}>4次</option>
                                     <option value={5}>5次</option>
                                     <option value={10}>10次</option>
                                     <option value={0}>無限</option>
                                   </select>
                                 </td>
                                 <td className="p-2 text-center">
                                   <input
                                     type="checkbox"
                                     checked={editTemplateActive}
                                     onChange={e => setEditTemplateActive(e.target.checked)}
                                     className="rounded bg-slate-950 border-slate-800 text-red-500 focus:ring-red-500 h-4 w-4 outline-none"
                                   />
                                 </td>
                                 <td className="p-2 text-right space-x-1.5 whitespace-nowrap">
                                   <button
                                     onClick={cancelEditTemplate}
                                     className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-[10px] font-bold"
                                   >
                                     取消
                                   </button>
                                   <button
                                     onClick={() => handleSaveTemplateEdit(template.id)}
                                     className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded text-[10px] font-black"
                                   >
                                     儲存
                                   </button>
                                 </td>
                               </>
                            ) : (
                              <>
                                <td className="p-3 font-bold text-white light:text-slate-900 sticky left-0 z-10 bg-slate-950 light:bg-white border-r border-white/5 light:border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">{template.title}</td>
                                <td className="p-3 text-slate-300 light:text-slate-700">{template.description}</td>
                                <td className="p-3 text-center select-none">
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">
                                    {template.category || '未分類'}
                                  </span>
                                </td>
                                <td className="p-3 text-center select-none">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                    template.mission_type === 'daily'
                                      ? 'bg-amber-500/10 text-amber-500'
                                      : template.mission_type === 'weekly'
                                      ? 'bg-purple-500/10 text-purple-400'
                                      : template.mission_type === 'limited'
                                      ? 'bg-red-500/10 text-red-400'
                                      : 'bg-teal-500/10 text-teal-400'
                                  }`}>
                                    {template.mission_type === 'daily'
                                      ? '每日'
                                      : template.mission_type === 'weekly'
                                      ? '每週'
                                      : template.mission_type === 'limited'
                                      ? '限時'
                                      : '特殊'}
                                  </span>
                                </td>
                                <td className="p-3 text-center text-slate-300 light:text-slate-700 font-mono font-bold">
                                  {template.points}
                                </td>
                                <td className="p-3 text-center select-none">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                    template.review_type === 'auto'
                                      ? 'bg-slate-800 text-slate-400'
                                      : template.review_type === 'admin'
                                      ? 'bg-red-500/10 text-red-400'
                                      : 'bg-amber-500/10 text-amber-400'
                                  }`}>
                                    {template.review_type === 'auto' ? '免審核' : template.review_type === 'admin' ? '管理員審核' : '隊長審核'}
                                  </span>
                                </td>
                                <td className="p-3 text-center select-none font-bold text-slate-300 light:text-slate-700">
                                  {template.max_completions === 0 ? '無限次' : `${template.max_completions ?? 1}次`}
                                </td>
                                <td className="p-3 text-center select-none">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                    template.is_active
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {template.is_active ? '啟用中' : '已停用'}
                                  </span>
                                </td>
                                <td className="p-3 text-right select-none whitespace-nowrap">
                                  {deletingTemplateId === template.id ? (
                                    <div className="inline-flex items-center space-x-1">
                                      <span className="text-[10px] text-rose-400 font-bold mr-1">確定？</span>
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          await onDeleteMissionTemplate?.(template.id);
                                          setDeletingTemplateId(null);
                                        }}
                                        className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] rounded font-bold"
                                      >
                                        是
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setDeletingTemplateId(null);
                                        }}
                                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded font-bold"
                                      >
                                        否
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="inline-flex space-x-1">
                                      <button
                                        type="button"
                                        onClick={() => startEditTemplate(template)}
                                        className="px-2 py-1 bg-slate-900 border border-white/5 text-[10px] rounded hover:border-amber-500/30 text-amber-400 font-bold light:bg-slate-100 light:border-slate-300"
                                      >
                                        編輯模板
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setDeletingTemplateId(template.id);
                                        }}
                                        className="px-2 py-1 bg-slate-900 border border-white/5 text-[10px] rounded hover:border-rose-500/30 text-rose-400 font-bold light:bg-slate-100 light:border-slate-300"
                                      >
                                        刪除
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    {missionTemplates.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500 font-bold">
                          目前尚無任何任務模板。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
  );
}

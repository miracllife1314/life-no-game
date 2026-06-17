// =====================================================================
// 後台「期數任務設定」分頁（每期套用任務模板規則 + 套用確認 Modal）
//   —— 從 AdminDashboard.tsx 抽出，行為/UI 不變。
// =====================================================================
import { useState, useEffect } from 'react';
import { AlertCircle, Save, Sliders } from 'lucide-react';
import { Batch, MissionTemplate, BatchMissionTemplate } from '@/types';

interface BatchRulesTabProps {
  batches: Batch[];
  missionTemplates: MissionTemplate[];
  missionCategories: string[];
  batchMissionTemplates: BatchMissionTemplate[];
  isSyncing: boolean;
  onSaveBatchMissionTemplates?: (batchId: string, rules: Omit<BatchMissionTemplate, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>;
}

export function BatchRulesTab({ batches, missionTemplates, missionCategories, batchMissionTemplates, isSyncing, onSaveBatchMissionTemplates }: BatchRulesTabProps) {
  const [showApplyConfirmModal, setShowApplyConfirmModal] = useState(false);
  const [rulesFilterCategory, setRulesFilterCategory] = useState<string>('全部');


  // --- Batch Mission Rules Configuration States ---
  const [selectedRuleBatchId, setSelectedRuleBatchId] = useState<string>('');
  const [localRules, setLocalRules] = useState<Record<string, {
    is_applied: boolean;
    week_offset: number | null;
    day_offset: number | null;
    duration_days: number | null;
    is_enabled: boolean;
  }>>({});

  // Auto select first batch if none selected
  useEffect(() => {
    if (batches.length > 0 && !selectedRuleBatchId) {
      setSelectedRuleBatchId(batches[0].id);
    }
  }, [batches, selectedRuleBatchId]);

  // Sync batch templates when selected batch or rules list changes
  useEffect(() => {
    if (!selectedRuleBatchId) {
      setLocalRules({});
      return;
    }
    const cohortRules = batchMissionTemplates.filter(r => r.batch_id === selectedRuleBatchId);
    const initialLocalRules: typeof localRules = {};
    
    missionTemplates.filter(t => t.is_active).forEach(template => {
      const existingRule = cohortRules.find(r => r.template_id === template.id);
      initialLocalRules[template.id] = {
        is_applied: !!existingRule,
        week_offset: existingRule && existingRule.week_offset !== null ? existingRule.week_offset : 1,
        day_offset: existingRule && existingRule.day_offset !== null ? existingRule.day_offset : 1,
        duration_days: existingRule && existingRule.duration_days !== null ? existingRule.duration_days : 1,
        is_enabled: existingRule ? existingRule.is_enabled : true
      };
    });
    setLocalRules(initialLocalRules);
  }, [selectedRuleBatchId, batchMissionTemplates, missionTemplates]);

  const updateLocalRuleField = (templateId: string, field: string, value: any) => {
    setLocalRules(prev => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        [field]: value
      }
    }));
  };

  const handleSaveBatchRulesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRuleBatchId) return;
    setShowApplyConfirmModal(true);
  };

  const handleConfirmApplyRules = async () => {
    setShowApplyConfirmModal(false);
    if (!selectedRuleBatchId) return;
    
    const rulesToSave: Omit<BatchMissionTemplate, 'id' | 'created_at' | 'updated_at'>[] = [];
    
    Object.entries(localRules).forEach(([templateId, rule]) => {
      if (rule.is_applied) {
        const template = missionTemplates.find(t => t.id === templateId);
        if (!template) return;
        
        rulesToSave.push({
          batch_id: selectedRuleBatchId,
          template_id: templateId,
          week_offset: template.mission_type === 'weekly' ? Number(rule.week_offset ?? 1) : null,
          day_offset: (template.mission_type === 'limited' || template.mission_type === 'weekly') ? Number(rule.day_offset ?? 1) : null,
          duration_days: template.mission_type === 'limited' ? Number(rule.duration_days ?? 1) : (template.mission_type === 'weekly' ? 7 : null),
          is_enabled: rule.is_enabled
        });
      }
    });
    
    if (onSaveBatchMissionTemplates) {
      try {
        await onSaveBatchMissionTemplates(selectedRuleBatchId, rulesToSave);
        alert(`✅ 已套用 ${rulesToSave.length} 個任務模板到此梯次，並依排程產生對應任務。`);
      } catch (err: any) {
        alert(`❌ 套用失敗：${err?.message || '請稍後再試'}`);
      }
    } else {
      alert('⚠️ 找不到套用功能，請重新整理後再試。');
    }
  };

  return (
    <>
        <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 animate-in fade-in duration-300 text-left light:bg-white light:border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none pb-4 border-b border-white/5 light:border-slate-100">
            <div>
              <h3 className="font-black text-white text-base flex items-center gap-2 light:text-slate-900">
                <Sliders size={18} className="text-red-500" />
                配置期數專屬任務發布規則
              </h3>
              <p className="text-xs text-slate-400 mt-1 light:text-slate-500">
                請先選取下方期數，並為其勾選欲套用的任務模板與對應時間規則。
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-300 font-bold light:text-slate-600 whitespace-nowrap">選擇目標期數：</span>
              <select
                value={selectedRuleBatchId}
                onChange={e => setSelectedRuleBatchId(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900 font-bold"
              >
                <option value="">-- 請選擇期數 --</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedRuleBatchId ? (
            <form onSubmit={handleSaveBatchRulesSubmit} className="space-y-6">
              {/* Category filter bar */}
              <div className="flex flex-wrap gap-1.5 items-center select-none">
                <span className="text-[10px] text-slate-400 font-bold">分類篩選:</span>
                {['全部', ...missionCategories].map(cat => {
                  const isActive = rulesFilterCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setRulesFilterCategory(cat)}
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

              <div className="bg-slate-950/60 border border-white/5 rounded-2xl overflow-hidden light:bg-slate-50 light:border-slate-300">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-500 font-bold uppercase light:border-slate-200 select-none">
                        <th className="p-3 w-16 text-center">套用</th>
                        <th className="p-3 w-1/4">模板標題 (類型)</th>
                        <th className="p-3">發布規則設定</th>
                        <th className="p-3 w-20 text-center">啟用狀態</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 light:divide-slate-200">
                      {missionTemplates
                        .filter(t => t.is_active && (
                          rulesFilterCategory === '全部'
                            ? t.category !== '神獸進化'
                            : t.category === rulesFilterCategory
                        ))
                        .sort((a, b) => {
                          const order = { daily: 1, weekly: 2, special: 3, limited: 4 };
                          return (order[a.mission_type] || 5) - (order[b.mission_type] || 5);
                        })
                        .map(template => {
                        const localRule = localRules[template.id] || {
                          is_applied: false,
                          week_offset: 1,
                          day_offset: 1,
                          duration_days: 1,
                          is_enabled: true
                        };
                        
                        return (
                          <tr 
                            key={template.id} 
                            className={`transition-colors hover:bg-white/[0.01] light:hover:bg-slate-100/30 ${
                              localRule.is_applied ? 'bg-white/[0.02] light:bg-slate-100/10' : ''
                            }`}
                          >
                            {/* 1. 套用狀態 */}
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={localRule.is_applied}
                                onChange={e => updateLocalRuleField(template.id, 'is_applied', e.target.checked)}
                                className="rounded bg-slate-950 border-slate-800 text-red-500 focus:ring-red-500 h-5 w-5 cursor-pointer outline-none light:bg-slate-50 light:border-slate-200"
                              />
                            </td>
                            
                            {/* 2. 標題與類型 */}
                            <td className="p-3">
                              <div className="font-bold text-white light:text-slate-900 mb-1">{template.title}</div>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded select-none ${
                                template.mission_type === 'daily'
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : template.mission_type === 'weekly'
                                  ? 'bg-purple-500/10 text-purple-400'
                                  : template.mission_type === 'limited'
                                  ? 'bg-red-500/10 text-red-400'
                                  : 'bg-teal-500/10 text-teal-400'
                              }`}>
                                {template.mission_type === 'daily'
                                  ? '每日任務'
                                  : template.mission_type === 'weekly'
                                  ? '每週任務'
                                  : template.mission_type === 'limited'
                                  ? '限時任務'
                                  : '特殊任務'}
                              </span>
                            </td>
                            
                            {/* 3. 規則輸入 */}
                            <td className="p-3">
                              {localRule.is_applied ? (
                                <div className="animate-in fade-in duration-200">
                                  {template.mission_type === 'daily' && (
                                    <span className="text-slate-500 font-bold select-none">無需額外設定 (比賽期間每天發布)</span>
                                  )}
                                  
                                  {template.mission_type === 'special' && (
                                    <span className="text-slate-500 font-bold select-none">無需額外設定 ({template.max_completions === 0 ? '比賽期間內無限次' : `比賽期間內限做 ${template.max_completions ?? 1} 次`})</span>
                                  )}
                                  
                                  {template.mission_type === 'weekly' && (
                                    <div className="flex flex-wrap items-center gap-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400 light:text-slate-600 font-bold">重複類型:</span>
                                        <select
                                          value={(localRule.week_offset ?? 1) === 0 ? 'recurring' : 'single'}
                                          onChange={e => {
                                            const val = e.target.value === 'recurring' ? 0 : 1;
                                            updateLocalRuleField(template.id, 'week_offset', val);
                                          }}
                                          className="bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs outline-none focus:border-red-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900 font-bold"
                                        >
                                          <option value="recurring">每週重複</option>
                                          <option value="single">特定單週</option>
                                        </select>
                                      </div>

                                      {(localRule.week_offset ?? 1) > 0 && (
                                        <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                                          <span className="text-slate-400 light:text-slate-600 font-bold">第</span>
                                          <select
                                            value={localRule.week_offset ?? 1}
                                            onChange={e => updateLocalRuleField(template.id, 'week_offset', Number(e.target.value))}
                                            className="bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs outline-none focus:border-red-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900 font-bold"
                                          >
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(w => (
                                              <option key={w} value={w}>{w}</option>
                                            ))}
                                          </select>
                                          <span className="text-slate-400 light:text-slate-600 font-bold">週</span>
                                        </div>
                                      )}

                                      <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400 light:text-slate-600 font-bold">上架日:</span>
                                        <select
                                          value={localRule.day_offset ?? 1}
                                          onChange={e => updateLocalRuleField(template.id, 'day_offset', Number(e.target.value))}
                                          className="bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs outline-none focus:border-red-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900 font-bold"
                                        >
                                          {[
                                            { v: 1, l: '星期一' },
                                            { v: 2, l: '星期二' },
                                            { v: 3, l: '星期三' },
                                            { v: 4, l: '星期四' },
                                            { v: 5, l: '星期五' },
                                            { v: 6, l: '星期六' },
                                            { v: 7, l: '星期日' }
                                          ].map(day => (
                                            <option key={day.v} value={day.v}>{day.l}</option>
                                          ))}
                                        </select>
                                      </div>

                                      <span className="text-[10px] text-slate-500 font-bold select-none shrink-0 bg-slate-900/60 light:bg-slate-200/50 px-2 py-1 rounded border border-white/5 light:border-slate-300/60">
                                        ⏱️ {(localRule.week_offset ?? 1) === 0 ? '每週' : `第 ${localRule.week_offset ?? 1} 週`}
                                        {['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'][(localRule.day_offset ?? 1) - 1]}上架
                                        ，下週{['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][(localRule.day_offset ?? 1) - 1]}晚上 23:59 截止關閉
                                      </span>
                                    </div>
                                  )}
                                  
                                  {template.mission_type === 'limited' && (
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-slate-400 light:text-slate-600 font-bold">開訓第</span>
                                        <input
                                          required
                                          type="number"
                                          min={1}
                                          value={localRule.day_offset ?? 1}
                                          onFocus={e => e.target.select()}
                                          onChange={e => updateLocalRuleField(template.id, 'day_offset', Number(e.target.value))}
                                          className="w-16 shrink-0 bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs text-center outline-none focus:border-red-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900 font-mono font-bold"
                                        />
                                        <span className="text-slate-400 light:text-slate-600 font-bold">天發布</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-slate-400 light:text-slate-600 font-bold">持續時間</span>
                                        <input
                                          required
                                          type="number"
                                          min={1}
                                          value={localRule.duration_days ?? 1}
                                          onFocus={e => e.target.select()}
                                          onChange={e => updateLocalRuleField(template.id, 'duration_days', Number(e.target.value))}
                                          className="w-16 shrink-0 bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs text-center outline-none focus:border-red-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900 font-mono font-bold"
                                        />
                                        <span className="text-slate-400 light:text-slate-600 font-bold">天</span>
                                      </div>

                                      <span className="text-[10px] text-slate-500 font-bold bg-slate-900/60 light:bg-slate-200/50 px-2.5 py-1 rounded border border-white/5 light:border-slate-300/60 shrink-0 select-none">
                                        {template.max_completions === 0 ? '無限次' : `限做 ${template.max_completions ?? 1} 次`}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-600 select-none">未勾選套用此模板</span>
                              )}
                            </td>
                            
                            {/* 4. 啟用狀態 */}
                            <td className="p-3 text-center">
                              {localRule.is_applied ? (
                                <input
                                  type="checkbox"
                                  checked={localRule.is_enabled}
                                  onChange={e => updateLocalRuleField(template.id, 'is_enabled', e.target.checked)}
                                  className="rounded bg-slate-950 border-slate-800 text-red-500 focus:ring-red-500 h-5 w-5 cursor-pointer outline-none light:bg-slate-50 light:border-slate-200"
                                />
                              ) : (
                                <span className="text-slate-600 select-none">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {missionTemplates.filter(t => t.is_active).length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-500 font-bold">
                            目前尚無任何啟用中的任務模板，請先前往「任務模板庫」建立。
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isSyncing}
                className="w-full btn-action py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-black shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save size={16} />
                套用任務
              </button>
            </form>
          ) : (
            <div className="p-8 text-center text-slate-500 font-bold select-none">
              請在右上角選取一個課程期數以載入配置介面。
            </div>
          )}
        </div>
      {showApplyConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200 text-left light:bg-white light:border-slate-200">
            <div className="flex flex-col items-center text-center space-y-4 py-4 select-none">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 animate-bounce">
                <AlertCircle size={32} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white light:text-slate-900">
                  確認套用任務發布規則？
                </h3>
                <p className="text-sm text-slate-300 light:text-slate-600 leading-relaxed font-medium">
                  確定要套用所選任務至本期嗎？<br />
                  套用後將建立本期任務資料。
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-4 select-none">
              <button
                type="button"
                onClick={() => setShowApplyConfirmModal(false)}
                className="flex-1 btn-action py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold light:bg-slate-100 light:border-slate-200 light:text-slate-600 light:hover:bg-slate-200"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleConfirmApplyRules}
                className="flex-1 btn-action py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-black shadow-md shadow-red-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSyncing ? '套用中...' : '確認'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

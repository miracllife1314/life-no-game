'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Sliders, RefreshCw, Plus, Trash2, Save } from 'lucide-react';
import {
  GuideDefinition,
  GuideVersionConfig,
  GuideOffsetItem,
  getAllGuides,
  loadGuidesFromDB,
  saveGuidesToDB,
  DEFAULT_BEGINNER_GUIDE,
  DEFAULT_ADVANCED_GUIDE
} from '@/lib/guideConfig';
import { formatBrandText } from '@/lib/brand';

interface GuideTabProps {
  isSyncing: boolean;
}

export function GuideTab({ isSyncing }: GuideTabProps) {
  const [allGuides, setAllGuides] = useState<GuideDefinition[]>([]);
  const [activeKey, setActiveKey] = useState<string>('beginner');

  // Modal / Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [templateType, setTemplateType] = useState<'beginner' | 'advanced'>('beginner');

  // Load guide list on mount(先給快取/鏡像即時顯示,再從 DB 補水成最新)
  useEffect(() => {
    setAllGuides(getAllGuides());
    loadGuidesFromDB().then(list => setAllGuides(list));
  }, []);

  // 統一寫回 DB(僅後台管理員,RLS 把關);失敗時提示,不吞錯。
  const persistGuides = async (next: GuideDefinition[], successMsg?: string) => {
    const { error } = await saveGuidesToDB(next);
    if (error) {
      alert(`❌ 儲存失敗,請稍後再試。\n(${error})`);
      return;
    }
    if (successMsg) alert(successMsg);
  };

  const activeGuide = allGuides.find(g => g.key === activeKey);
  const config = activeGuide?.config || null;

  if (allGuides.length === 0 || !activeGuide || !config) {
    return <div className="text-slate-500 text-xs py-8">載入攻略配置中...</div>;
  }

  const handleSave = () => {
    persistGuides(allGuides, '✅ 攻略排版儲存成功！學員端重整後將會依據班次名稱自動載入對應的攻略。');
  };

  const handleReset = () => {
    if (window.confirm('確定要將此分頁攻略還原成系統預設的配置嗎？')) {
      let defaultData: GuideVersionConfig;
      if (activeKey === 'advanced') {
        defaultData = DEFAULT_ADVANCED_GUIDE;
      } else {
        defaultData = DEFAULT_BEGINNER_GUIDE;
      }

      const updated = allGuides.map(g => {
        if (g.key === activeKey) {
          return { ...g, config: JSON.parse(JSON.stringify(defaultData)) };
        }
        return g;
      });

      setAllGuides(updated);
      persistGuides(updated);
    }
  };

  const handleDelete = () => {
    if (activeKey === 'beginner' || activeKey === 'advanced') {
      alert('⚠️ 系統預設的「初階日常」與「進階修煉」攻略不能刪除。');
      return;
    }

    if (window.confirm(`確定要刪除「${activeGuide.name}」的課程攻略嗎？這動作無法復原。`)) {
      const nextList = allGuides.filter(g => g.key !== activeKey);
      setAllGuides(nextList);
      persistGuides(nextList);
      setActiveKey('beginner');
    }
  };

  const handleAddNewCourseGuide = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = newKey.trim().toLowerCase();
    const cleanName = newName.trim();

    if (!cleanKey || !cleanName) {
      alert('請填寫完整識別鍵與名稱！');
      return;
    }

    if (allGuides.some(g => g.key === cleanKey)) {
      alert('⚠️ 該識別鍵（Key）已存在，請使用不同的英文識別鍵！');
      return;
    }

    // Clone templates
    const baseConfig = templateType === 'advanced' ? DEFAULT_ADVANCED_GUIDE : DEFAULT_BEGINNER_GUIDE;
    const newConfig: GuideVersionConfig = JSON.parse(JSON.stringify(baseConfig));

    const newDef: GuideDefinition = {
      key: cleanKey,
      name: cleanName,
      config: newConfig
    };

    const nextList = [...allGuides, newDef];
    setAllGuides(nextList);
    persistGuides(nextList);
    setActiveKey(cleanKey);

    // Reset form
    setNewKey('');
    setNewName('');
    setShowAddForm(false);
  };

  // Updaters for config fields
  const updateActiveConfig = (updates: Partial<GuideVersionConfig>) => {
    const nextList = allGuides.map(g => {
      if (g.key === activeKey) {
        return { ...g, config: { ...g.config, ...updates } };
      }
      return g;
    });
    setAllGuides(nextList);
  };

  const handleGuideNameChange = (name: string) => {
    const nextList = allGuides.map(g => {
      if (g.key === activeKey) {
        return { ...g, name };
      }
      return g;
    });
    setAllGuides(nextList);
  };

  // Bullets Handlers
  const handleBulletChange = (type: 'serious' | 'active', index: number, value: string) => {
    const field = type === 'serious' ? 'seriousBullets' : 'activeBullets';
    const nextBullets = [...config[field]];
    nextBullets[index] = value;
    updateActiveConfig({ [field]: nextBullets });
  };

  const addBullet = (type: 'serious' | 'active') => {
    const field = type === 'serious' ? 'seriousBullets' : 'activeBullets';
    updateActiveConfig({ [field]: [...config[field], '新修行要點：描述 ➔ 加分說明'] });
  };

  const removeBullet = (type: 'serious' | 'active', index: number) => {
    const field = type === 'serious' ? 'seriousBullets' : 'activeBullets';
    updateActiveConfig({ [field]: config[field].filter((_, i) => i !== index) });
  };

  // Offset Handlers
  const handleOffsetChange = (index: number, fields: Partial<GuideOffsetItem>) => {
    const nextOffsets = [...config.offsets];
    nextOffsets[index] = { ...nextOffsets[index], ...fields };
    updateActiveConfig({ offsets: nextOffsets });
  };

  const addOffsetItem = () => {
    const newItem: GuideOffsetItem = {
      id: `custom-offset-${Date.now()}`,
      title: '自訂高分任務',
      points: 500,
      days: 1.5
    };
    updateActiveConfig({ offsets: [...config.offsets, newItem] });
  };

  const removeOffsetItem = (index: number) => {
    updateActiveConfig({ offsets: config.offsets.filter((_, i) => i !== index) });
  };

  // Smart string formatter for live preview bullets
  const renderBulletText = (bullet: string) => {
    const parts = bullet.split('：');
    if (parts.length > 1) {
      const rightParts = parts[1].split('➔');
      if (rightParts.length > 1) {
        return (
          <>
            <span className="text-slate-300 light:text-slate-700 font-bold">{parts[0]}</span>
            {'：'}
            {rightParts[0]}
            {'➔ '}
            <span className="text-amber-500 font-bold">{rightParts[1]}</span>
          </>
        );
      }
      return (
        <>
          <span className="text-slate-300 light:text-slate-700 font-bold">{parts[0]}</span>
          {'：'}
          {parts[1]}
        </>
      );
    }
    return bullet;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200 text-left">
      
      {/* 🛠️ Left: Editor Panel */}
      <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 light:bg-white light:border-slate-200 lg:col-span-6 select-none">
        
        {/* Header Tab List */}
        <div className="flex flex-col gap-3 border-b border-white/5 pb-4 light:border-slate-200">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-white text-base flex items-center gap-2 light:text-slate-900">
              <Sliders size={18} className="text-red-500" />
              修行攻略排版編輯器
            </h3>
            
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black flex items-center gap-1 transition-all active:scale-95 shadow cursor-pointer"
            >
              <Plus size={12} />
              新增課程攻略
            </button>
          </div>

          {/* Dynamic Tabs list */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {allGuides.map(g => {
              const isDefault = g.key === 'beginner' || g.key === 'advanced';
              const isActive = activeKey === g.key;
              return (
                <button
                  key={g.key}
                  onClick={() => {
                    setActiveKey(g.key);
                    setShowAddForm(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border flex items-center gap-1 ${
                    isActive
                      ? 'bg-red-500/20 border-red-500/35 text-red-400 font-black'
                      : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white light:bg-slate-100 light:border-slate-200'
                  }`}
                >
                  {g.name}
                  <span className="text-[9px] opacity-40 font-mono">({g.key})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Add Course Guide Form Modal-like inline section */}
        {showAddForm && (
          <form onSubmit={handleAddNewCourseGuide} className="p-4 bg-slate-950/60 border border-red-500/20 rounded-2xl space-y-3.5 animate-in slide-in-from-top duration-200 light:bg-slate-50 light:border-red-200">
            <div className="text-[11px] font-black text-red-500 tracking-wider flex items-center gap-1">
              ✨ 建立全新課程攻略配置
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] text-slate-400 font-bold mb-1">英文識別鍵 (Key)</label>
                <input
                  required
                  type="text"
                  placeholder="例如: vip"
                  value={newKey}
                  onChange={e => setNewKey(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2 text-xs outline-none focus:border-red-500 light:bg-white light:border-slate-300 light:text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 font-bold mb-1">課程名稱 (顯示名稱)</label>
                <input
                  required
                  type="text"
                  placeholder="例如: 💎 VIP專屬"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2 text-xs outline-none focus:border-red-500 light:bg-white light:border-slate-300 light:text-slate-900 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] text-slate-400 font-bold mb-1">初始範本選擇</label>
              <select
                value={templateType}
                onChange={e => setTemplateType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2 text-xs outline-none focus:border-red-500 light:bg-white light:border-slate-300 light:text-slate-900 cursor-pointer"
              >
                <option value="beginner">🟢 初階日常攻略 範本</option>
                <option value="advanced">🔥 進階修煉心法 範本</option>
              </select>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2 text-xs font-bold bg-slate-900 text-slate-400 hover:text-white rounded-xl border border-white/5 light:bg-white light:border-slate-300 light:text-slate-600 cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-black bg-red-500 hover:bg-red-600 text-white rounded-xl cursor-pointer"
              >
                確認新增
              </button>
            </div>
          </form>
        )}

        {/* Edit Guide Meta Info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-slate-400 font-bold mb-1">攻略顯示名稱</label>
            <input
              type="text"
              value={activeGuide.name}
              onChange={e => handleGuideNameChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5 text-xs outline-none focus:border-red-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900 font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 font-bold mb-1">攻略識別鍵 (Key - 不可變更)</label>
            <input
              disabled
              type="text"
              value={activeGuide.key}
              className="w-full bg-slate-950/40 border border-slate-900 text-slate-500 rounded-xl p-2.5 text-xs outline-none cursor-not-allowed font-mono"
            />
          </div>
        </div>

        {/* 1. 認真修行版 */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider">⏱️ 認真修行版設定</h4>
          <div>
            <label className="block text-[10px] text-slate-400 font-bold mb-1">均速說明文字</label>
            <input
              type="text"
              value={config.seriousSpeed}
              onChange={e => updateActiveConfig({ seriousSpeed: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5 text-xs outline-none focus:border-red-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] text-slate-400 font-bold mb-0.5">修行要點列表 (格式: 標題：內容 ➔ 獎勵)</label>
            {config.seriousBullets.map((bullet, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={bullet}
                  onChange={e => handleBulletChange('serious', i, e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5 text-xs outline-none focus:border-red-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => removeBullet('serious', i)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addBullet('serious')}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-dashed border-white/10 hover:border-white/20 text-[10px] font-bold text-slate-400 hover:text-white rounded-xl flex items-center justify-center gap-1 light:bg-slate-100 light:border-slate-200 light:text-slate-600 cursor-pointer"
            >
              <Plus size={12} />
              新增認真修行要點
            </button>
          </div>
        </div>

        {/* 2. 積極挑戰版 */}
        <div className="space-y-3 border-t border-white/5 pt-4 light:border-slate-200">
          <h4 className="text-xs font-black text-amber-500 uppercase tracking-wider">⚡ 積極挑戰版設定</h4>
          <div>
            <label className="block text-[10px] text-slate-400 font-bold mb-1">均速說明文字</label>
            <input
              type="text"
              value={config.activeSpeed}
              onChange={e => updateActiveConfig({ activeSpeed: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5 text-xs outline-none focus:border-red-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] text-slate-400 font-bold mb-0.5">修行要點列表 (格式: 標題：內容 ➔ 獎勵)</label>
            {config.activeBullets.map((bullet, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={bullet}
                  onChange={e => handleBulletChange('active', i, e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5 text-xs outline-none focus:border-red-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => removeBullet('active', i)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addBullet('active')}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-dashed border-white/10 hover:border-white/20 text-[10px] font-bold text-slate-400 hover:text-white rounded-xl flex items-center justify-center gap-1 light:bg-slate-100 light:border-slate-200 light:text-slate-600 cursor-pointer"
            >
              <Plus size={12} />
              新增積極挑戰要點
            </button>
          </div>
        </div>

        {/* 3. 天數直接折抵對照表 */}
        <div className="space-y-3 border-t border-white/5 pt-4 light:border-slate-200">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black text-pink-400 uppercase tracking-wider">✨ 攻略秘笈：天數折抵設定</h4>
            <button
              type="button"
              onClick={addOffsetItem}
              className="px-2 py-1 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 text-pink-400 rounded-lg text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
            >
              <Plus size={10} />
              新增折抵任務
            </button>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {config.offsets.map((offset, i) => (
              <div key={offset.id} className="p-3 bg-slate-950/40 border border-slate-900 rounded-2xl space-y-2 relative light:bg-slate-50 light:border-slate-200">
                <button
                  type="button"
                  onClick={() => removeOffsetItem(i)}
                  className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 rounded cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">
                    <label className="block text-[8px] text-slate-500 font-bold mb-0.5">任務名稱</label>
                    <input
                      type="text"
                      value={offset.title}
                      onChange={e => handleOffsetChange(i, { title: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-1.5 text-[10px] outline-none focus:border-red-500 light:bg-white light:border-slate-200 light:text-slate-900 font-bold"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[8px] text-slate-500 font-bold mb-0.5">經驗值 (EXP)</label>
                    <input
                      type="number"
                      value={offset.points}
                      onChange={e => handleOffsetChange(i, { points: Number(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-1.5 text-[10px] outline-none focus:border-red-500 light:bg-white light:border-slate-200 light:text-slate-900 font-bold"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[8px] text-slate-500 font-bold mb-0.5">折抵天數</label>
                    <input
                      type="number"
                      step="0.1"
                      value={offset.days}
                      onChange={e => handleOffsetChange(i, { days: Number(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-1.5 text-[10px] outline-none focus:border-red-500 light:bg-white light:border-slate-200 light:text-slate-900 font-bold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-8">
                    <label className="block text-[8px] text-slate-500 font-bold mb-0.5">備註敘述 (如: 需寫得好、照片清晰)</label>
                    <input
                      type="text"
                      value={offset.desc || ''}
                      placeholder="無"
                      onChange={e => handleOffsetChange(i, { desc: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-1.5 text-[10px] outline-none focus:border-red-500 light:bg-white light:border-slate-200 light:text-slate-900 font-medium"
                    />
                  </div>
                  <div className="col-span-4 flex items-center justify-end gap-1.5 pt-3">
                    <input
                      type="checkbox"
                      id={`offset-highlight-${offset.id}`}
                      checked={!!offset.highlight}
                      onChange={e => handleOffsetChange(i, { highlight: e.target.checked })}
                      className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-950 text-red-500 focus:ring-red-500 focus:ring-offset-slate-950 cursor-pointer"
                    />
                    <label htmlFor={`offset-highlight-${offset.id}`} className="text-[10px] text-slate-400 font-bold select-none cursor-pointer">
                      加寬醒目顯示
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 儲存/重設/刪除 */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 light:border-slate-200">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 min-w-[100px] py-2.5 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white text-xs font-black flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer light:bg-slate-100 light:border-slate-250"
          >
            <RefreshCw size={13} />
            還原預設
          </button>
          
          {activeKey !== 'beginner' && activeKey !== 'advanced' && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex-1 min-w-[100px] py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-xs font-black flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
            >
              <Trash2 size={13} />
              刪除此攻略
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 min-w-[140px] py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black shadow-md shadow-red-500/15 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Save size={13} />
            儲存所有攻略
          </button>
        </div>
      </section>

      {/* 👁️ Right: Live Preview Panel */}
      <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 lg:col-span-6 relative select-none">
        <span className="absolute top-4 right-4 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full font-black select-none">
          ✨ 100% 實時視覺預覽
        </span>
        <h3 className="font-black text-white text-base select-none light:text-slate-900">
          學員端顯示預覽
        </h3>

        {/* Outer card mimicking DailyQuestsTab.tsx strategy dialog */}
        <div className="pt-2 select-none">
          <div className="text-[10px] space-y-3 p-3 rounded-xl border border-white/5 bg-slate-950/80 light:bg-white/80 light:border-slate-200 shadow-xl">
            
            {/* Header info */}
            <div className="text-center font-bold text-slate-400 pb-1.5 border-b border-white/5 light:border-slate-200">
              {activeGuide.name}攻略
            </div>

            {/* ⏱️ 認真修行版 */}
            <div className="space-y-1">
              <div className="font-extrabold text-indigo-400 flex items-center gap-1 light:text-indigo-600">
                <span>⏱️ 認真修行版 (均速 {config.seriousSpeed})</span>
              </div>
              <ul className="list-disc pl-4 text-slate-400 space-y-0.5 font-medium light:text-slate-500">
                {config.seriousBullets.map((bullet, i) => (
                  <li key={i}>{renderBulletText(formatBrandText(bullet))}</li>
                ))}
              </ul>
            </div>
            
            {/* ⚡ 積極挑戰版 */}
            <div className="space-y-1 border-t border-white/5 pt-2.5 light:border-slate-150">
              <div className="font-extrabold text-amber-400 flex items-center gap-1 light:text-amber-600">
                <span>⚡ 積極挑戰版 (均速 {config.activeSpeed})</span>
              </div>
              <ul className="list-disc pl-4 text-slate-400 space-y-0.5 font-medium light:text-slate-500">
                {config.activeBullets.map((bullet, i) => (
                  <li key={i}>{renderBulletText(formatBrandText(bullet))}</li>
                ))}
              </ul>
            </div>

            {/* ✨ 攻略秘笈：天數直接折抵 */}
            <div className="space-y-1 border-t border-white/5 pt-2.5 light:border-slate-150">
              <div className="font-extrabold text-pink-400 flex items-center gap-1 light:text-pink-600">
                <span>✨ 攻略秘笈：高分任務「天數直接折抵」</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-400 font-medium light:text-slate-600">
                {config.offsets.map((offset) => (
                  <div
                    key={offset.id}
                    className={`p-1.5 rounded bg-white/[0.02] border border-white/5 light:bg-slate-100/50 light:border-slate-200 ${
                      offset.highlight ? 'col-span-2' : ''
                    }`}
                  >
                    <span className="text-slate-300 block font-bold light:text-slate-800">
                      {formatBrandText(offset.title)} (+{offset.points} EXP)
                    </span>
                    時間立減 <span className="text-emerald-400 font-black light:text-emerald-600">{offset.days} 天</span>！
                    {offset.desc && <span className="text-[9px] text-slate-500 block mt-0.5">{formatBrandText(offset.desc)}</span>}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}

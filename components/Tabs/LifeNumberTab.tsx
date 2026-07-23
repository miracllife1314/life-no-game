'use client';

import React, { useState, useEffect } from 'react';
import { 
  Binary, Trash2, Calendar, Sparkles, ShieldAlert, 
  Check, Heart, Briefcase, Coins, Home, Activity,
  ChevronDown, ChevronUp, Save
} from 'lucide-react';
import { parseNumerologyInput, generateReport, NumerologyReport, GridCell } from '@/lib/numerologyCalc';

interface SavedRecord {
  id: string;
  name: string;
  birthday: string;
  lifeNumber: number | null;
}

interface LifeNumberTabProps {
  currentUser?: any;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function LifeNumberTab({ currentUser, showToast }: LifeNumberTabProps) {
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<NumerologyReport | null>(null);
  const [savedList, setSavedList] = useState<SavedRecord[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  // Collapse sections
  const [showFullText, setShowFullText] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    loadSavedList();
  }, []);

  const loadSavedList = () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nlp_lifenumber_history');
        if (stored) {
          setSavedList(JSON.parse(stored));
        } else {
          // Pre-seed default test records so that it's not empty on first load
          const defaultRecords: SavedRecord[] = [
            { id: 'seed-1', name: '測試gm', birthday: '1988-08-08', lifeNumber: 5 },
            { id: 'seed-2', name: '測試劉定洋', birthday: '1985-05-15', lifeNumber: 7 },
            { id: 'seed-3', name: '測試蘇士淵', birthday: '1990-10-10', lifeNumber: 4 }
          ];
          localStorage.setItem('nlp_lifenumber_history', JSON.stringify(defaultRecords));
          setSavedList(defaultRecords);
        }
      } catch (e) {
        console.error('Failed to load history', e);
      }
    }
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaved(false);

    const parsed = parseNumerologyInput(birthday);
    if (!parsed.ok) {
      setErrorMsg(parsed.error || '生日輸入有誤');
      setReport(null);
      return;
    }

    const rep = generateReport(parsed);
    setReport(rep);

    // Check if this calculation matches any in history to mark as saved
    const cleanBd = parsed.birth
      ? `${parsed.birth.birthDigits.slice(0, 4)}-${parsed.birth.birthDigits.slice(4, 6)}-${parsed.birth.birthDigits.slice(6, 8)}`
      : '';
    const exists = savedList.some(
      (item) => item.name === name.trim() && item.birthday === cleanBd
    );
    setIsSaved(exists);
  };

  const handleSaveResult = () => {
    if (!report) return;
    const cleanName = name.trim();
    const bd = report.birth
      ? `${report.birth.birthDigits.slice(0, 4)}-${report.birth.birthDigits.slice(4, 6)}-${report.birth.birthDigits.slice(6, 8)}`
      : '';

    const newRecord: SavedRecord = {
      id: Date.now().toString(),
      name: cleanName || '未命名',
      birthday: bd,
      lifeNumber: report.lifeNumber,
    };

    const updated = [newRecord, ...savedList.filter(x => !(x.name === newRecord.name && x.birthday === newRecord.birthday))];
    localStorage.setItem('nlp_lifenumber_history', JSON.stringify(updated));
    setSavedList(updated);
    setIsSaved(true);

    if (showToast) {
      showToast('測算結果已儲存到「我的紀錄」', 'success');
    }
  };

  const handleDeleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = savedList.find(x => x.id === id);
    const who = target ? `「${target.name}」` : '這筆';
    
    if (confirm(`確定要刪除${who}的測算紀錄嗎？`)) {
      const updated = savedList.filter((item) => item.id !== id);
      localStorage.setItem('nlp_lifenumber_history', JSON.stringify(updated));
      setSavedList(updated);
      if (showToast) showToast('紀錄已刪除', 'info');
    }
  };

  const handleLoadRecord = (record: SavedRecord) => {
    setName(record.name === '未命名' ? '' : record.name);
    setBirthday(record.birthday);
    
    const parsed = parseNumerologyInput(record.birthday);
    if (parsed.ok) {
      setReport(generateReport(parsed));
      setIsSaved(true);
      setErrorMsg(null);
    }
  };

  const getFiveFortuneEmoji = (label: string) => {
    switch (label) {
      case '事業': return <Briefcase size={16} className="text-sky-400" />;
      case '財富': return <Coins size={16} className="text-amber-400" />;
      case '感情': return <Heart size={16} className="text-pink-400" />;
      case '家庭': return <Home size={16} className="text-emerald-400" />;
      case '身體': return <Activity size={16} className="text-rose-400" />;
      default: return null;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="text-center space-y-2 select-none">
        <h2 className="text-xl font-black text-white italic tracking-wider flex items-center justify-center gap-2 light:text-slate-900">
          <Binary className="text-amber-500" size={20} />
          生命數字能量命盤
        </h2>
        <p className="text-xs text-slate-400 font-medium light:text-slate-600">
          輸入西元生日，解讀你的後天數、主命數、九宮格能量與功課
        </p>
      </div>

      {/* Input Form Card */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
        <form onSubmit={handleCalculate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 light:text-slate-500">
                姓名 (選填)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="想顯示在報表上的名字"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-600 light:bg-slate-50 light:border-slate-200 light:text-slate-950"
              />
            </div>
            
            <div>
              <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 light:text-slate-500">
                西元生日
              </label>
              <input
                required
                type="text"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                placeholder="例如: 1988-03-20 或 19880320"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-600 light:bg-slate-50 light:border-slate-200 light:text-slate-950"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="text-red-500 text-xs font-bold bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2">
              <ShieldAlert size={14} />
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black py-3.5 rounded-2xl transition-all shadow-[0_4px_20px_rgba(245,158,11,0.2)] active:scale-98 cursor-pointer flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
          >
            <Sparkles size={16} />
            開啟修行通道
          </button>
        </form>
      </div>

      {/* Save Button and Report Content */}
      {report && (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
          
          {/* Action Bar */}
          <div className="flex gap-3">
            <button
              onClick={handleSaveResult}
              disabled={isSaved}
              className={`flex-1 font-black py-3 px-4 rounded-2xl border transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-wider ${
                isSaved
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default'
                  : 'bg-slate-900 border-white/5 text-slate-300 hover:bg-slate-800 hover:text-white light:bg-white light:border-slate-300 light:text-slate-700 light:hover:bg-slate-50'
              }`}
            >
              {isSaved ? (
                <>
                  <Check size={14} />
                  已儲存到我的紀錄
                </>
              ) : (
                <>
                  <Save size={14} />
                  儲存這次結果
                </>
              )}
            </button>
          </div>

          {/* Houtian & Life Chain Card */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 text-center space-y-4 light:bg-white light:border-slate-200">
            {name && (
              <h3 className="text-lg font-black text-white light:text-slate-800">
                {name} 的生命靈數命盤
              </h3>
            )}
            
            {report.birth && (
              <div className="flex items-center justify-center gap-4 py-2">
                <div className="text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    後天數
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                    {report.birth.houtian}
                  </div>
                </div>
                {report.birth.chain.slice(1).map((val, idx) => {
                  const isLast = idx === report.birth!.chain.length - 2;
                  return (
                    <React.Fragment key={idx}>
                      <div className="text-slate-600 font-bold">→</div>
                      <div className="text-center">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          {isLast ? '主命數' : '中間數'}
                        </div>
                        <div className={`text-3xl font-extrabold ${isLast ? 'text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.2)]' : 'text-slate-400'}`}>
                          {val}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
            
            <div className="text-xs font-bold text-slate-400 light:text-slate-500">
              核心碼 <span className="text-amber-500 font-extrabold tracking-widest text-sm bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">{report.coreCode}</span>
            </div>
          </div>

          {/* SVG 3x3 Grid (九宮格主角) */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-5 light:bg-white light:border-slate-200">
            <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider border-b border-white/5 pb-2 light:text-slate-500 light:border-slate-200">
              能量九宮格
            </h4>
            
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
              {report.grid.cells.map((cell) => {
                const { digit: d, circles, triangle, square } = cell;
                const marked = circles > 0 || triangle > 0 || square > 0;
                const circlesList = [];
                for (let i = 0; i < circles; i++) {
                  const r = 32 - (circles - 1) * 6 + i * 12;
                  circlesList.push(r);
                }
                // 三角形:有幾個就畫幾個,由外而內層層縮小(主數 11 → 兩個,看得出來)
                const triCentroid = { x: 50, y: 61.3 };
                const triBase = [[50, 8], [92, 88], [8, 88]];
                const triList = [];
                for (let i = 0; i < triangle; i++) {
                  const s = 1 - (triangle - 1 - i) * 0.22;   // 最內圈最小,最外圈原尺寸
                  triList.push(
                    triBase
                      .map(([x, y]) => `${triCentroid.x + (x - triCentroid.x) * s},${triCentroid.y + (y - triCentroid.y) * s}`)
                      .join(' ')
                  );
                }
                // 正方形:同理,有幾個畫幾個(由外而內內縮)
                const sqList = [];
                for (let i = 0; i < square; i++) {
                  const inset = (square - 1 - i) * 9;
                  sqList.push({ x: 12 + inset, y: 12 + inset, w: 76 - inset * 2, h: 76 - inset * 2 });
                }
                return (
                  <div 
                    key={d} 
                    className="aspect-square rounded-2xl bg-slate-950 border border-slate-900 p-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] relative light:bg-slate-50 light:border-slate-200 light:shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"
                  >
                    <svg viewBox="0 0 100 100" className="w-full h-full block">
                      {circlesList.map((r, idx) => (
                        <circle 
                          key={idx} 
                          cx="50" 
                          cy="50" 
                          r={r} 
                          fill="none" 
                          stroke="#3b82f6" 
                          strokeWidth="4"
                        />
                      ))}
                      {triList.map((pts, idx) => (
                        <polygon
                          key={`t${idx}`}
                          points={pts}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="4"
                        />
                      ))}
                      {sqList.map((r, idx) => (
                        <rect
                          key={`s${idx}`}
                          x={r.x}
                          y={r.y}
                          width={r.w}
                          height={r.h}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="4"
                        />
                      ))}
                      <text
                        x="50"
                        y="52"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="32"
                        fontWeight={marked ? "900" : "500"}
                        className={`${marked ? "fill-white light:fill-slate-900" : "fill-slate-700 light:fill-slate-300"}`}
                        opacity={marked ? "1" : ".35"}
                      >
                        {d}
                      </text>
                    </svg>
                  </div>
                );
              })}
            </div>

            {/* Grid Legend */}
            <div className="flex flex-wrap justify-center gap-4 text-[10px] font-bold text-slate-500 pt-2">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 100 100" className="w-3.5 h-3.5"><circle cx="50" cy="50" r="38" fill="none" stroke="#3b82f6" strokeWidth="12"/></svg>
                圈 ＝ 生日次數
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 100 100" className="w-3.5 h-3.5"><polygon points="50,10 88,86 12,86" fill="none" stroke="#10b981" strokeWidth="12"/></svg>
                三角 ＝ 後天/中間數
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 100 100" className="w-3.5 h-3.5"><rect x="12" y="12" width="76" height="76" fill="none" stroke="#ef4444" strokeWidth="12"/></svg>
                方框 ＝ 主命數
              </span>
            </div>
            
            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
              命盤池 ＝ 生日 {report.poolComposition.birth || ''} ＋ 後天數 {report.poolComposition.houtian || ''} ＋ 主命數 {report.poolComposition.life || ''}
              {report.incompletePool && ' (無完整命盤，缺數/過多僅供參考)'}
            </p>
          </div>

          {/* One-Word Summary Card */}
          <div className="glass-panel p-5 rounded-3xl bg-amber-500/5 border border-amber-500/10 text-slate-300 space-y-1 light:bg-amber-50/50 light:border-amber-200/50 light:text-slate-800">
            <span className="font-extrabold text-amber-500 tracking-wider">
              {report.coreCode}
            </span>：{report.summary.replace(report.coreCode + '：', '')}
            {report.nonStandard && (
              <div className="text-[10px] text-yellow-500 font-bold mt-2 flex items-center gap-1.5">
                <ShieldAlert size={12} />
                核心碼 {report.coreLen} 位，非 3/5 位標準，位置為通用推斷。
              </div>
            )}
          </div>

          {/* Life Number Levels Report */}
          {report.lifeReport && (
            <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
              <div className="flex items-center gap-3 border-b border-white/5 pb-3 light:border-slate-200">
                <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-black text-xl shadow-[0_4px_12px_rgba(245,158,11,0.3)]">
                  {report.lifeNumber}
                </div>
                <div>
                  <h4 className="text-sm font-black text-white light:text-slate-800">
                    主命數 {report.lifeNumber} 開示
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium light:text-slate-500">
                    核心主題：{report.lifeReport.theme}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Low Level */}
                <div className="border-l-4 border-rose-500 bg-rose-500/5 p-3 rounded-r-xl space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    低階
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {report.lifeReport.low.map((t: string, idx: number) => (
                      <span key={idx} className="text-[10px] font-bold bg-slate-950 px-2.5 py-1 rounded-lg text-slate-300 light:bg-slate-100 light:text-slate-700">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mid Level */}
                <div className="border-l-4 border-slate-500 bg-slate-500/5 p-3 rounded-r-xl space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded border border-slate-500/20">
                    中階
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {report.lifeReport.mid.map((t: string, idx: number) => (
                      <span key={idx} className="text-[10px] font-bold bg-slate-950 px-2.5 py-1 rounded-lg text-slate-300 light:bg-slate-100 light:text-slate-700">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* High Level */}
                <div className="border-l-4 border-emerald-500 bg-emerald-500/5 p-3 rounded-r-xl space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    高階
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {report.lifeReport.high.map((t: string, idx: number) => (
                      <span key={idx} className="text-[10px] font-bold bg-slate-950 px-2.5 py-1 rounded-lg text-slate-300 light:bg-slate-100 light:text-slate-700">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Xiu Level */}
                <div className="border-l-4 border-amber-500 bg-amber-500/5 p-3 rounded-r-xl space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    修
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {report.lifeReport.xiu.map((t: string, idx: number) => (
                      <span key={idx} className="text-[10px] font-bold bg-slate-950 px-2.5 py-1 rounded-lg text-slate-300 light:bg-slate-100 light:text-slate-700">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Five Fortunes Section */}
          {report && false && (
            <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
            <div>
              <h4 className="text-sm font-black text-white light:text-slate-800">
                五運・卡點與修煉功課
              </h4>
              <p className="text-[10px] text-slate-500 font-bold mt-1 leading-relaxed">
                依您命盤加權判定：主命數 <span className="text-amber-500">{report!.lifeNumber}</span>｜缺數 <span className="text-amber-500">{report!.missing.map(m=>m.digit).join('、') || '無'}</span>｜過多 <span className="text-amber-500">{report!.repeats.map(r=>r.digit).join('、') || '無'}</span>
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {report!.fiveFortunes.map((fortune) => {
                const getStatusStyle = (status: string) => {
                  switch (status) {
                    case 'core': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                    case 'over': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                    case 'missing': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
                    default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                  }
                };
                const getStatusText = (status: string) => {
                  switch (status) {
                    case 'core': return '核心主場';
                    case 'over': return '能量偏多';
                    case 'missing': return '能量不足';
                    default: return '平穩發揮';
                  }
                };

                return (
                  <div key={fortune.label} className="p-4 bg-slate-950 border border-slate-900 rounded-2xl space-y-2 light:bg-slate-50 light:border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getFiveFortuneEmoji(fortune.label)}
                        <span className="text-sm font-bold text-white light:text-slate-800">
                          {fortune.label}
                        </span>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusStyle(fortune.status)}`}>
                        {getStatusText(fortune.status)} · {fortune.num}
                      </span>
                    </div>

                    <div className="text-xs text-amber-500 font-bold leading-relaxed">
                      {fortune.oneLine}
                    </div>
                    
                    <div className="text-[11px] leading-relaxed text-slate-400 font-medium">
                      <span className="font-extrabold text-slate-500 mr-2">卡點</span>
                      {fortune.block}
                    </div>

                    <div className="text-[11px] leading-relaxed text-slate-300 font-medium">
                      <span className="font-extrabold text-slate-500 mr-2">功課</span>
                      {fortune.lesson}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {/* Full Text Analysis (Accordion) */}
          <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden light:bg-white light:border-slate-200">
            <button
              onClick={() => setShowFullText(!showFullText)}
              className="w-full flex items-center justify-between p-5 text-sm font-bold text-white light:text-slate-800 cursor-pointer"
            >
              <span>查看完整文字解析</span>
              {showFullText ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showFullText && (
              <div className="p-5 pt-0 border-t border-white/5 space-y-6 text-slate-300 light:border-slate-200 light:text-slate-700 animate-in fade-in duration-200">
                
                {/* Positions Analysis */}
                <div className="space-y-3 mt-4">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider light:text-slate-500">
                    一、 核心位置解讀 (核心碼 {report.coreCode})
                  </h5>
                  <div className="space-y-3">
                    {report.positions.map((pos, idx) => (
                      <div key={idx} className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl space-y-1.5 light:bg-slate-50 light:border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 flex items-center justify-center font-black rounded-lg text-xs ${pos.digit === 0 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                            {pos.digit}
                          </span>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-2">{pos.label}</span>
                            <span className="text-xs font-bold text-white light:text-slate-800">{pos.theme}</span>
                          </div>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-300 font-medium">
                          {pos.body}
                        </p>
                        {pos.summary && (
                          <div className="text-[10px] text-slate-500 font-bold">
                            {pos.summary}
                          </div>
                        )}
                        {pos.hint && (
                          <div className="text-[10px] text-yellow-500/75 font-bold">
                            {pos.hint}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing Numbers */}
                {report && false && (
                  <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider light:text-slate-500">
                    二、 缺少能量解析 (加權為0的數字)
                  </h5>
                  {report!.missing.length > 0 ? (
                    <div className="w-full overflow-hidden border border-white/5 rounded-2xl light:border-slate-200">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-950/40 text-slate-500 font-bold border-b border-white/5 light:bg-slate-100 light:border-slate-200">
                            <th className="py-2.5 px-4 w-16">數字</th>
                            <th className="py-2.5 px-4">需要後天補強的能力</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report!.missing.map((m) => (
                            <tr key={m.digit} className="border-b border-white/5 light:border-slate-200">
                              <td className="py-3 px-4 text-base font-black text-rose-500">{m.digit}</td>
                              <td className="py-3 px-4 font-medium text-slate-300 light:text-slate-700">{m.need}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 font-bold">
                      1–9 數字全部都有出現，您的命盤能量相對平穩完整。
                    </p>
                  )}
                  </div>
                )}

                {/* Over/Strong Numbers */}
                {report && false && (
                  <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider light:text-slate-500">
                    三、 重複/過多能量 (加權≥2的數字)
                  </h5>
                  {report!.repeats.length > 0 ? (
                    <div className="space-y-3">
                      {report!.repeats.map((rep) => (
                        <div key={rep.digit} className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl space-y-2 light:bg-slate-50 light:border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="w-6 h-6 flex items-center justify-center font-black rounded-full text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              {rep.digit}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">
                              加權能量: {rep.count} 次
                            </span>
                          </div>
                          
                          <div className="text-[11px] leading-relaxed">
                            <div className="font-medium text-emerald-400">
                              <span className="font-extrabold text-slate-500 mr-2">平衡發揮 (天賦)</span>
                              {rep.balanced}
                            </div>
                            <div className="font-medium text-rose-400 mt-1">
                              <span className="font-extrabold text-slate-500 mr-2">過度發揮 (卡點)</span>
                              {rep.excessive}
                            </div>
                            <div className="font-medium text-slate-300 mt-1">
                              <span className="font-extrabold text-slate-500 mr-2">修煉方向</span>
                              {rep.practice}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 font-bold">
                      沒有明顯重複或過多的數字。
                    </p>
                  )}
                  </div>
                )}

                {/* Practice List */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider light:text-slate-500">
                    二、 建議修煉功課 (Top 5)
                  </h5>
                  <ul className="list-decimal list-inside space-y-2 text-xs font-medium pl-1">
                    {report.practice.map((t, idx) => (
                      <li key={idx} className="leading-relaxed text-slate-300 light:text-slate-700">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Closing Summary */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider light:text-slate-500">
                    三、 最後開示總結
                  </h5>
                  <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-xs font-medium leading-relaxed text-amber-200/90 light:bg-amber-50 light:border-amber-200 light:text-amber-800">
                    {report.closing}
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed pt-2">
                  本報表依命盤固定規則自動產生，結果語氣採「可能/容易/傾向/需要修」，僅供修行覺察之對照，非絕對宿命。
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Local Saved Records (我的紀錄) */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
        <h3 className="text-sm font-black text-white flex items-center gap-2 light:text-slate-800">
          <Calendar size={16} className="text-slate-400" />
          我的紀錄
          {savedList.length > 0 && (
            <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              {savedList.length}
            </span>
          )}
        </h3>

        {savedList.length === 0 ? (
          <p className="text-xs text-slate-500 font-bold py-2">
            目前沒有儲存的測算紀錄。
          </p>
        ) : (
          <div className="space-y-2.5 max-h-48 overflow-y-auto scrollbar-none">
            {savedList.map((record) => (
              <div
                key={record.id}
                onClick={() => handleLoadRecord(record)}
                className="p-3.5 bg-slate-950 border border-slate-900 rounded-2xl flex items-center justify-between cursor-pointer hover:border-amber-500/50 transition-all light:bg-slate-50 light:border-slate-200 light:hover:border-amber-500/50"
              >
                <div>
                  <div className="text-xs font-bold text-white light:text-slate-950">
                    {record.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    生日: {record.birthday}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                    主命數: {record.lifeNumber || '0'}
                  </span>
                  <button
                    onClick={(e) => handleDeleteRecord(record.id, e)}
                    className="p-2 text-slate-600 hover:text-red-500 rounded-xl hover:bg-red-500/10 transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

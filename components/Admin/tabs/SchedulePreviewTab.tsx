// =====================================================================
// 後台「任務排程預覽」分頁 —— 從 AdminDashboard.tsx 抽出，行為/UI 不變。
// =====================================================================
import { useState, useEffect } from 'react';
import { Calendar, Check } from 'lucide-react';
import { Batch, MissionTemplate, BatchMissionTemplate, Mission, Submission } from '@/types';

interface SchedulePreviewTabProps {
  batches: Batch[];
  missionTemplates: MissionTemplate[];
  batchMissionTemplates: BatchMissionTemplate[];
  missionCategories: string[];
  missions: Mission[];
  submissions: Submission[];
  isSyncing: boolean;
  onDeleteMission?: (missionId: string) => Promise<void>;
  onGenerateMissions?: (batchId: string, previewData: Array<{
    templateId: string;
    title: string;
    description: string;
    type: 'daily' | 'weekly' | 'special' | 'limited';
    points: number;
    publishAt: string;
    deadlineAt: string;
    reviewType: 'auto' | 'leader' | 'admin';
  }>) => Promise<{ successCount: number; skipCount: number }>;
}

export function SchedulePreviewTab({ batches, missionTemplates, batchMissionTemplates, missionCategories, missions, submissions, isSyncing, onDeleteMission, onGenerateMissions }: SchedulePreviewTabProps) {
  const [selectedPreviewBatchId, setSelectedPreviewBatchId] = useState<string>('');

  // Auto select first batch if none selected
  useEffect(() => {
    if (batches.length > 0 && !selectedPreviewBatchId) {
      setSelectedPreviewBatchId(batches[0].id);
    }
  }, [batches, selectedPreviewBatchId]);

  const getSchedulePreview = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return [];
    
    const startDate = new Date(batch.start_date);
    const endDate = new Date(batch.end_date);
    const rules = batchMissionTemplates.filter(r => r.batch_id === batchId && r.is_enabled);
    
    const previews: Array<{
      date: string;
      title: string;
      type: 'daily' | 'weekly' | 'special' | 'limited';
      points: number;
      publishAt: string;
      deadlineAt: string;
      templateId: string;
      description: string;
      reviewType: 'auto' | 'leader' | 'admin';
      category?: string;
    }> = [];
    
    rules.forEach(rule => {
      const template = missionTemplates.find(t => t.id === rule.template_id);
      if (!template) return;
      
      const type = template.mission_type;
      const points = template.points;
      const title = template.title;
      const category = template.category;
      
      if (type === 'daily') {
        let cur = new Date(startDate);
        while (cur <= endDate) {
          const dayStr = cur.toISOString().substring(0, 10);
          previews.push({
            date: dayStr,
            title,
            type,
            points,
            publishAt: `${dayStr} 00:00:00`,
            deadlineAt: `${dayStr} 23:59:59`,
            templateId: rule.template_id,
            description: template.description,
            reviewType: template.review_type,
            category: category
          });
          cur.setDate(cur.getDate() + 1);
        }
      } else if (type === 'weekly') {
        const getMondayOfWeek = (dateStr: string) => {
          const date = new Date(dateStr);
          const day = date.getUTCDay();
          const diff = day === 0 ? -6 : 1 - day;
          const monday = new Date(date);
          monday.setUTCDate(date.getUTCDate() + diff);
          monday.setUTCHours(0, 0, 0, 0);
          return monday;
        };
        const firstMonday = getMondayOfWeek(batch.start_date);
        const weekOffset = rule.week_offset !== null ? rule.week_offset : 1;
        const dayOffset = rule.day_offset !== null ? rule.day_offset : 1;
        
        if (weekOffset === 0) {
          const lastMonday = getMondayOfWeek(batch.end_date);
          const totalWeeks = Math.round((lastMonday.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
          
          for (let w = 1; w <= totalWeeks; w++) {
            const publishDate = new Date(firstMonday);
            publishDate.setUTCDate(firstMonday.getUTCDate() + (w - 1) * 7 + (dayOffset - 1));
            
            const deadlineDate = new Date(publishDate);
            deadlineDate.setUTCDate(publishDate.getUTCDate() + 6);
            
            const pubStr = publishDate.toISOString().substring(0, 10);
            const deadStr = deadlineDate.toISOString().substring(0, 10);
            
            previews.push({
              date: pubStr,
              title,
              type,
              points,
              publishAt: `${pubStr} 00:00:00`,
              deadlineAt: `${deadStr} 23:59:59`,
              templateId: rule.template_id,
              description: template.description,
              reviewType: template.review_type,
              category: category
            });
          }
        } else {
          const publishDate = new Date(firstMonday);
          publishDate.setUTCDate(firstMonday.getUTCDate() + (weekOffset - 1) * 7 + (dayOffset - 1));
          
          const deadlineDate = new Date(publishDate);
          deadlineDate.setUTCDate(publishDate.getUTCDate() + 6);
          
          const pubStr = publishDate.toISOString().substring(0, 10);
          const deadStr = deadlineDate.toISOString().substring(0, 10);
          
          previews.push({
            date: pubStr,
            title,
            type,
            points,
            publishAt: `${pubStr} 00:00:00`,
            deadlineAt: `${deadStr} 23:59:59`,
            templateId: rule.template_id,
            description: template.description,
            reviewType: template.review_type,
            category: category
          });
        }
      } else if (type === 'special') {
        const dayStr = startDate.toISOString().substring(0, 10);
        previews.push({
          date: dayStr,
          title,
          type,
          points,
          publishAt: `${dayStr} 00:00:00`,
          deadlineAt: batch.end_date.substring(0, 10) + ' 23:59:59',
          templateId: rule.template_id,
          description: template.description,
          reviewType: template.review_type,
          category: category
        });
      } else if (type === 'limited') {
        const offset = rule.day_offset !== null ? Math.max(0, rule.day_offset - 1) : 0;
        const duration = rule.duration_days !== null ? rule.duration_days : 1;
        
        const pubDate = new Date(startDate);
        pubDate.setDate(pubDate.getDate() + offset);
        
        const deadDate = new Date(pubDate);
        deadDate.setDate(deadDate.getDate() + duration);
        
        const pubStr = pubDate.toISOString().substring(0, 10);
        const deadStr = deadDate.toISOString().substring(0, 10);
        
        previews.push({
          date: pubStr,
          title,
          type,
          points,
          publishAt: `${pubStr} 00:00:00`,
          deadlineAt: `${deadStr} 23:59:59`,
          templateId: rule.template_id,
          description: template.description,
          reviewType: template.review_type,
          category: category
        });
      }
    });
    
    return previews.sort((a, b) => a.date.localeCompare(b.date));
  };

  return (
        <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 animate-in fade-in duration-300 text-left light:bg-white light:border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none pb-4 border-b border-white/5 light:border-slate-100">
            <div>
              <h3 className="font-black text-white text-base flex items-center gap-2 light:text-slate-900">
                <Calendar size={18} className="text-red-500" />
                任務發布排程預覽
              </h3>
              <p className="text-xs text-slate-400 mt-1 light:text-slate-500">
                本頁面依據期數時間與已套用之任務發布規則，動態計算並展示各日期之實際任務預覽，不寫入資料庫。
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-300 font-bold light:text-slate-600 whitespace-nowrap">選擇預覽期數：</span>
              <select
                value={selectedPreviewBatchId}
                onChange={e => setSelectedPreviewBatchId(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900 font-bold"
              >
                <option value="">-- 請選擇期數 --</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 已產生任務（可單筆刪除）：解決『刪了模板但已產生任務還殘留在前台』的問題 */}
          {selectedPreviewBatchId && (() => {
            const batchMissions = missions
              .filter(m => m.batch_id === selectedPreviewBatchId)
              .sort((a, b) => String(a.publish_at).localeCompare(String(b.publish_at)));
            return (
              <div className="space-y-3 pb-2 border-b border-white/5 light:border-slate-100">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h4 className="font-black text-white text-sm light:text-slate-900">🗂️ 已產生的任務（{batchMissions.length}）</h4>
                  <span className="text-[10px] text-slate-500">可單筆刪除；刪除會一併移除該任務的打卡並自動退回經驗</span>
                </div>
                {batchMissions.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 select-none">此期數目前沒有已產生的任務。</p>
                ) : (
                  <div className="border border-white/5 rounded-2xl overflow-x-auto light:border-slate-200 max-h-96 overflow-y-auto">
                    <table className="w-full text-xs text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                      <thead className="sticky top-0">
                        <tr className="bg-slate-900 text-slate-400 border-b border-white/5 light:bg-slate-100 light:text-slate-600">
                          <th className="p-3">任務</th>
                          <th className="p-3">類型</th>
                          <th className="p-3">發布</th>
                          <th className="p-3">截止</th>
                          <th className="p-3 text-center">打卡數</th>
                          <th className="p-3 text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 light:divide-slate-200">
                        {batchMissions.map(m => {
                          const subCount = submissions.filter(s => s.mission_id === m.id).length;
                          const typeLabel = m.mission_type === 'daily' ? '每日' : m.mission_type === 'weekly' ? '每週' : m.mission_type === 'limited' ? '限時' : '特殊';
                          return (
                            <tr key={m.id} className="bg-slate-950/40 light:bg-white">
                              <td className="p-3 font-bold text-white light:text-slate-900">{m.title}</td>
                              <td className="p-3 text-slate-300 light:text-slate-600">{typeLabel}</td>
                              <td className="p-3 text-slate-400 font-mono">{String(m.publish_at).substring(0, 10)}</td>
                              <td className="p-3 text-slate-400 font-mono">{String(m.deadline_at).substring(0, 10)}</td>
                              <td className="p-3 text-center text-amber-500 font-bold">{subCount}</td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const msg = subCount > 0
                                      ? `確定刪除任務「${m.title}」嗎？\n\n它已有 ${subCount} 筆打卡，刪除會一併移除這些打卡並退回對應經驗。\n此操作無法復原。`
                                      : `確定刪除任務「${m.title}」嗎？\n此操作無法復原。`;
                                    if (window.confirm(msg) && onDeleteMission) {
                                      await onDeleteMission(m.id);
                                    }
                                  }}
                                  className="text-red-400 hover:text-white hover:bg-red-500 px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border border-red-500/30"
                                >
                                  刪除
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {selectedPreviewBatchId ? (() => {
            const previewData = getSchedulePreview(selectedPreviewBatchId);
            return (
              <div className="space-y-4">
                {previewData.length > 0 && (
                  <div className="flex justify-end select-none">
                    <button
                      onClick={async () => {
                        if (onGenerateMissions) {
                          try {
                            const res = await onGenerateMissions(selectedPreviewBatchId, previewData);
                            alert(`🎉 任務產生完成！\n成功產生：${res.successCount} 筆\n跳過重複：${res.skipCount} 筆`);
                          } catch (err: any) {
                            alert(`❌ 產生任務失敗，請稍後再試或重新登入。\n${err?.message || ''}`);
                          }
                        }
                      }}
                      disabled={isSyncing}
                      className="btn-action bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-black py-2.5 px-4 rounded-xl shadow-md shadow-red-500/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check size={14} />
                      確認產生任務
                    </button>
                  </div>
                )}
                <div className="bg-slate-950/60 border border-white/5 rounded-2xl overflow-hidden light:bg-slate-50 light:border-slate-300">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-500 font-bold uppercase light:border-slate-200 select-none">
                          <th className="p-3 w-32">預覽日期</th>
                          <th className="p-3 w-1/4">任務標題</th>
                          <th className="p-3 text-center w-24">類型</th>
                          <th className="p-3 text-center w-16">分數</th>
                          <th className="p-3">發布時間</th>
                          <th className="p-3">截止時間</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 light:divide-slate-200">
                        {previewData.map((item, index) => (
                          <tr key={index} className="hover:bg-white/[0.01] light:hover:bg-slate-100/30">
                            <td className="p-3 font-bold text-slate-300 light:text-slate-700 font-mono">{item.date}</td>
                            <td className="p-3 font-bold text-white light:text-slate-900">{item.title}</td>
                            <td className="p-3 text-center select-none">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                item.type === 'daily'
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : item.type === 'weekly'
                                  ? 'bg-purple-500/10 text-purple-400'
                                  : item.type === 'limited'
                                  ? 'bg-red-500/10 text-red-400'
                                  : 'bg-teal-500/10 text-teal-400'
                              }`}>
                                {item.type === 'daily'
                                  ? '每日'
                                  : item.type === 'weekly'
                                  ? '每週'
                                  : item.type === 'limited'
                                  ? '限時'
                                  : '特殊'}
                              </span>
                            </td>
                            <td className="p-3 text-center text-slate-300 light:text-slate-700 font-mono font-bold">{item.points}</td>
                            <td className="p-3 text-slate-200 light:text-slate-800 font-mono">{item.publishAt}</td>
                            <td className="p-3 text-slate-200 light:text-slate-800 font-mono">{item.deadlineAt}</td>
                          </tr>
                        ))}
                        {previewData.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                              此期數尚未設定任何啟用中的任務發布規則。
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="p-8 text-center text-slate-500 font-bold select-none">
              請在右上角選取一個課程期數以載入排程預覽。
            </div>
          )}
        </div>
  );
}

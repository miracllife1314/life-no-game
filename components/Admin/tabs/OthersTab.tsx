// =====================================================================
// 後台「公告 / 課程 / 成就」分頁 —— 從 AdminDashboard.tsx 抽出，行為/UI 完全不變。
// =====================================================================
import { useState } from 'react';
import { Calendar, Edit2, ImageIcon, Megaphone, Trophy, Trash2, X } from 'lucide-react';
import { Announcement, Course, Achievement, Batch, Mission } from '@/types';
import { BRAND, formatBrandText, formatAchievementText } from '@/lib/brand';
import { BadgeIcon } from '../../BadgeIcon';
import { PRESET_BADGE_ICONS } from '@/lib/badgeIcons';

const ANNOUNCEMENT_TEMPLATES = [
  {
    id: 'welcome',
    name: '📢 歡迎加入課程',
    title: '📢 歡迎加入 {batch_name}！',
    content: '各位修行者好，本系統提供完整的每日定課簽到、每週主線任務以及特殊限時加分功能。您可以透過持續修行解鎖高階成就徽章，爭奪排行榜榜首！請使用您在試算表上的中文姓名直接登入。'
  },
  {
    id: 'daily_reminder',
    name: '⏰ 每日定課修行提醒',
    title: '⏰ 每日定課修行提醒',
    content: '親愛的修行者，今天的每日定課完成了嗎？記得在每日截止前完成打卡，並上傳證明喔！'
  },
  {
    id: 'graduation',
    name: '🎓 結訓典禮與最後衝刺',
    title: '🎓 結訓典禮與最後衝刺公告',
    content: '課程已接近尾聲，請大家抓緊時間完成尚未結算的任務，爭奪最後的經驗值加成！'
  }
];

const COURSE_TEMPLATES = [
  {
    id: 'course_basic',
    name: BRAND.courseBasicName,
    courseName: BRAND.courseBasicName,
    description: BRAND.courseBasicDesc
  },
  {
    id: 'course_belief',
    name: '🚀 進階信念重塑工作坊',
    courseName: '🚀 進階信念重塑工作坊',
    description: '深入探索信念系統，重塑限制性信念。'
  },
  {
    id: 'course_influence',
    name: '🌟 影響力大師精進班',
    courseName: '🌟 影響力大師精進班',
    description: '掌握核心影響力工具，實現卓越溝通。'
  }
];

interface OthersTabProps {
  announcements: Announcement[];
  courses: Course[];
  achievements: Achievement[];
  batches: Batch[];
  missions: Mission[];
  isSyncing: boolean;
  onCreateAnnouncement: (title: string, content: string, batchId?: string | null, publishAt?: string | null) => Promise<void>;
  onUpdateAnnouncement?: (id: string, updates: Partial<Announcement>) => Promise<void>;
  onDeleteAnnouncement?: (id: string) => Promise<void>;
  onCreateCourse: (name: string, description: string, classDate: string, batchId?: string | null, registerUrl?: string | null) => Promise<void>;
  onUpdateCourse?: (id: string, updates: Partial<Course>) => Promise<void>;
  onDeleteCourse?: (courseId: string) => Promise<void>;
  onCreateAchievement: (
    title: string, 
    description: string, 
    value: number, 
    iconUrl?: string | null,
    conditionType?: 'total_score' | 'consecutive_checkins' | 'mission_count' | 'witness_post_count' | 'pet_stage',
    targetMissionId?: string | null
  ) => Promise<void>;
  onUpdateAchievement?: (id: string, updates: Partial<Achievement>) => Promise<void>;
  onDeleteAchievement?: (id: string) => Promise<void>;
}

export function OthersTab({ announcements, courses, achievements, batches, missions, isSyncing, onCreateAnnouncement, onUpdateAnnouncement, onDeleteAnnouncement, onCreateCourse, onUpdateCourse, onDeleteCourse, onCreateAchievement, onUpdateAchievement, onDeleteAchievement }: OthersTabProps) {
  const [announcementFilterBatch, setAnnouncementFilterBatch] = useState<string>('all');
  const [courseFilterBatch, setCourseFilterBatch] = useState<string>('all');
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annBatchId, setAnnBatchId] = useState('');
  const [annPublishTime, setAnnPublishTime] = useState('');
  const [annTemplate, setAnnTemplate] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseDate, setCourseDate] = useState('');
  const [courseBatchId, setCourseBatchId] = useState('');
  const [courseRegisterUrl, setCourseRegisterUrl] = useState('');
  const [courseTemplate, setCourseTemplate] = useState('');
  
  const [achTitle, setAchTitle] = useState('');
  const [achDesc, setAchDesc] = useState('');
  const [achValue, setAchValue] = useState<number | string>('');
  const [achIconUrl, setAchIconUrl] = useState<string | null>(null);
  const [achConditionType, setAchConditionType] = useState<'total_score' | 'consecutive_checkins' | 'mission_count' | 'witness_post_count' | 'pet_stage'>('total_score');
  const [achTargetMissionId, setAchTargetMissionId] = useState<string>('');

  // 編輯既有成就
  const [editingAchId, setEditingAchId] = useState<string | null>(null);
  const [editAchTitle, setEditAchTitle] = useState('');
  const [editAchDesc, setEditAchDesc] = useState('');
  const [editAchValue, setEditAchValue] = useState<number | string>('');
  const [editAchIconUrl, setEditAchIconUrl] = useState<string | null>(null);
  const [editAchConditionType, setEditAchConditionType] = useState<'total_score' | 'consecutive_checkins' | 'mission_count' | 'witness_post_count' | 'pet_stage'>('total_score');
  const [editAchTargetMissionId, setEditAchTargetMissionId] = useState<string>('');

  const isIconUsed = (iconName: string) => {
    return achievements.some(ach => ach.icon_url === iconName);
  };

  const handleStartEditAch = (ach: Achievement) => {
    setEditingAchId(ach.id);
    setEditAchTitle(ach.title);
    setEditAchDesc(ach.description || '');
    setEditAchValue(ach.condition_value);
    setEditAchIconUrl(ach.icon_url || null);
    setEditAchConditionType(ach.condition_type || 'total_score');
    setEditAchTargetMissionId(ach.target_mission_id || '');
  };
  const handleCancelEditAch = () => setEditingAchId(null);
  const handleSaveEditAch = async (id: string) => {
    if (!confirm('確定要儲存此成就的修改嗎？')) return;
    if (onUpdateAchievement) {
      await onUpdateAchievement(id, {
        title: editAchTitle,
        description: editAchDesc || null,
        condition_value: Number(editAchValue),
        icon_url: editAchIconUrl || 'Flame',
        condition_type: editAchConditionType,
        target_mission_id: editAchConditionType === 'mission_count' ? editAchTargetMissionId : null
      });
    }
    setEditingAchId(null);
  };

  // 編輯既有公告
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [editAnnTitle, setEditAnnTitle] = useState('');
  const [editAnnContent, setEditAnnContent] = useState('');
  const [editAnnBatchId, setEditAnnBatchId] = useState('');
  const [editAnnPublishTime, setEditAnnPublishTime] = useState('');
  const handleStartEditAnn = (ann: Announcement) => {
    setEditingAnnId(ann.id);
    setEditAnnTitle(ann.title);
    setEditAnnContent(ann.content);
    setEditAnnBatchId(ann.batch_id || '');
    setEditAnnPublishTime(ann.created_at ? new Date(ann.created_at).toISOString().slice(0, 16) : '');
  };
  const handleCancelEditAnn = () => setEditingAnnId(null);
  const handleSaveEditAnn = async (id: string) => {
    if (!confirm('確定要儲存此公告的修改嗎？')) return;
    if (onUpdateAnnouncement) {
      await onUpdateAnnouncement(id, {
        title: editAnnTitle,
        content: editAnnContent,
        batch_id: editAnnBatchId || null,
        created_at: editAnnPublishTime ? new Date(editAnnPublishTime).toISOString() : new Date().toISOString()
      });
    }
    setEditingAnnId(null);
  };

  // 編輯既有課程
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editCourseName, setEditCourseName] = useState('');
  const [editCourseDesc, setEditCourseDesc] = useState('');
  const [editCourseDate, setEditCourseDate] = useState('');
  const [editCourseBatchId, setEditCourseBatchId] = useState('');
  const [editCourseRegisterUrl, setEditCourseRegisterUrl] = useState('');
  const [editCourseSortOrder, setEditCourseSortOrder] = useState('0');
  const handleStartEditCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setEditCourseName(course.name);
    setEditCourseDesc(course.description || '');
    setEditCourseDate(course.class_date || '');
    setEditCourseBatchId(course.batch_id || '');
    setEditCourseRegisterUrl(course.register_url || '');
    setEditCourseSortOrder(String(course.sort_order ?? 0));
  };
  const handleCancelEditCourse = () => setEditingCourseId(null);
  const handleSaveEditCourse = async (id: string) => {
    if (!confirm('確定要儲存此課程的修改嗎？')) return;
    if (onUpdateCourse) {
      await onUpdateCourse(id, {
        name: editCourseName,
        description: editCourseDesc || null,
        class_date: editCourseDate,
        batch_id: editCourseBatchId || null,
        register_url: editCourseRegisterUrl || null,
        sort_order: parseInt(editCourseSortOrder, 10) || 0
      });
    }
    setEditingCourseId(null);
  };
  const handleAnnouncementTemplateChange = (templateId: string, currentBatchId: string) => {
    setAnnTemplate(templateId);
    if (!templateId) {
      setAnnTitle('');
      setAnnContent('');
      return;
    }
    const template = ANNOUNCEMENT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      const selectedBatch = batches.find(b => b.id === currentBatchId);
      const batchName = selectedBatch ? selectedBatch.name : '全體期數';
      setAnnTitle(template.title.replace('{batch_name}', batchName));
      setAnnContent(template.content);
    }
  };

  const handleAnnBatchChange = (batchId: string) => {
    setAnnBatchId(batchId);
    if (annTemplate) {
      const template = ANNOUNCEMENT_TEMPLATES.find(t => t.id === annTemplate);
      if (template) {
        const selectedBatch = batches.find(b => b.id === batchId);
        const batchName = selectedBatch ? selectedBatch.name : '全體期數';
        setAnnTitle(template.title.replace('{batch_name}', batchName));
      }
    }
  };

  const handleCourseTemplateChange = (templateId: string) => {
    setCourseTemplate(templateId);
    if (!templateId) {
      setCourseName('');
      setCourseDesc('');
      return;
    }
    const template = COURSE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setCourseName(template.courseName);
      setCourseDesc(template.description || '');
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent || !annBatchId) return;
    await onCreateAnnouncement(
      annTitle, 
      annContent, 
      annBatchId === 'all' ? null : annBatchId,
      annPublishTime || null
    );
    setAnnTitle('');
    setAnnContent('');
    setAnnBatchId('');
    setAnnPublishTime('');
    setAnnTemplate('');
    alert('公告發布成功！');
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName || !courseDate || !courseBatchId) return;
    await onCreateCourse(courseName, courseDesc, courseDate, courseBatchId === 'all' ? null : courseBatchId, courseRegisterUrl);
    setCourseName('');
    setCourseDesc('');
    setCourseDate('');
    setCourseBatchId('');
    setCourseRegisterUrl('');
    setCourseTemplate('');
    alert('課程建立成功！');
  };

  const handleCreateAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!achTitle || !achValue) return;
    await onCreateAchievement(
      achTitle, 
      achDesc, 
      Number(achValue), 
      achIconUrl, 
      achConditionType, 
      achConditionType === 'mission_count' ? achTargetMissionId : null
    );
    setAchTitle('');
    setAchDesc('');
    setAchValue('');
    setAchIconUrl(null);
    setAchConditionType('total_score');
    setAchTargetMissionId('');
    alert('成就建立成功！');
  };

  return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 select-none">
          {/* Announcements */}
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
            <h3 className="font-black text-white text-sm flex items-center gap-1.5">
              <Megaphone size={16} className="text-red-500" />
              發布系統公告
            </h3>
            
            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">選擇公告期數</label>
                <select
                  required
                  value={annBatchId}
                  onChange={e => handleAnnBatchChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                >
                  <option value="">請選擇期數...</option>
                  <option value="all">全體期數 (系統公告)</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">使用預設內容/模板</label>
                <select
                  disabled={!annBatchId}
                  value={annTemplate}
                  onChange={e => handleAnnouncementTemplateChange(e.target.value, annBatchId)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">-- 自訂公告 (不使用模板) --</option>
                  {ANNOUNCEMENT_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <input
                required
                disabled={!annBatchId}
                type="text"
                value={annTitle}
                onChange={e => setAnnTitle(e.target.value)}
                placeholder="公告標題"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <textarea
                required
                disabled={!annBatchId}
                rows={4}
                value={annContent}
                onChange={e => setAnnContent(e.target.value)}
                placeholder="公告內容正文..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">排程發布時間 (選填)</label>
                <input
                  disabled={!annBatchId}
                  type="datetime-local"
                  value={annPublishTime}
                  onChange={e => setAnnPublishTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="block text-[9px] text-slate-500 mt-1">※ 未設定時間則立即發布</span>
              </div>

              <button
                type="submit"
                disabled={isSyncing || !annBatchId}
                className="w-full btn-action py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                發布公告
              </button>
            </form>

            {/* Existing Announcements List */}
            {announcements && announcements.length > 0 && (
              <div className="pt-4 border-t border-white/5 light:border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-[10px] text-slate-400 font-bold">現有公告列表 ({announcements.filter(a => announcementFilterBatch === 'all' || (announcementFilterBatch === 'null' && !a.batch_id) || a.batch_id === announcementFilterBatch).length})</h4>
                  <select
                    value={announcementFilterBatch}
                    onChange={e => setAnnouncementFilterBatch(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-slate-300 text-[9px] rounded px-1.5 py-0.5 outline-none light:bg-slate-100 light:border-slate-300 light:text-slate-800"
                  >
                    <option value="all">顯示全部</option>
                    <option value="null">全體公告</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {announcements
                    .filter(a => announcementFilterBatch === 'all' || (announcementFilterBatch === 'null' && !a.batch_id) || a.batch_id === announcementFilterBatch)
                    .map(ann => {
                    const batch = batches.find(b => b.id === ann.batch_id);
                    if (editingAnnId === ann.id) {
                      return (
                        <div key={ann.id} className="p-3 rounded bg-slate-950 border border-amber-500/50 space-y-2">
                          <input type="text" value={editAnnTitle} onChange={e => setEditAnnTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[11px] text-white" placeholder="公告標題" />
                          <textarea value={editAnnContent} onChange={e => setEditAnnContent(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[11px] text-white" rows={2} placeholder="公告內容" />
                          <div className="flex gap-2">
                            <select value={editAnnBatchId} onChange={e => setEditAnnBatchId(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-[11px] text-white">
                              <option value="">全體公告</option>
                              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <input type="datetime-local" value={editAnnPublishTime} onChange={e => setEditAnnPublishTime(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-[11px] text-white" />
                          </div>
                          <div className="flex justify-end gap-2 mt-2">
                            <button onClick={handleCancelEditAnn} className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-[10px]">取消</button>
                            <button onClick={() => handleSaveEditAnn(ann.id)} disabled={isSyncing} className="px-3 py-1 bg-amber-500 text-white rounded text-[10px] font-bold">儲存</button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={ann.id} className="flex justify-between items-center text-[11px] p-2 rounded bg-slate-950/40 border border-white/5 light:bg-slate-50 light:border-slate-200">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-bold text-white truncate light:text-slate-800" title={ann.title}>{ann.title}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5 truncate">
                            {batch ? batch.name : '全體公告'} | {new Date(ann.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {onUpdateAnnouncement && (
                            <button type="button" onClick={() => handleStartEditAnn(ann)} className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 p-1.5 rounded-lg transition-colors cursor-pointer"><Edit2 size={12} /></button>
                          )}
                          {onDeleteAnnouncement && (
                            <button type="button" onClick={() => { if(confirm('確定刪除此公告？')) onDeleteAnnouncement(ann.id); }} disabled={isSyncing} className="text-red-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"><Trash2 size={12} /></button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Courses */}
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
            <h3 className="font-black text-white text-sm flex items-center gap-1.5">
              <Calendar size={16} className="text-red-500" />
              發布課程與日期
            </h3>
            
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">選擇課程期數</label>
                <select
                  required
                  value={courseBatchId}
                  onChange={e => setCourseBatchId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                >
                  <option value="">請選擇期數...</option>
                  <option value="all">全體期數 (公開課程)</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">使用預設內容/模板</label>
                <select
                  disabled={!courseBatchId}
                  value={courseTemplate}
                  onChange={e => handleCourseTemplateChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">-- 自訂課程 (不使用模板) --</option>
                  {COURSE_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <input
                required
                disabled={!courseBatchId}
                type="text"
                value={courseName}
                onChange={e => setCourseName(e.target.value)}
                placeholder="課程名稱"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <input
                disabled={!courseBatchId}
                type="text"
                value={courseDesc}
                onChange={e => setCourseDesc(e.target.value)}
                placeholder="簡短課程敘述 (選填)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <input
                required
                disabled={!courseBatchId}
                type="date"
                value={courseDate}
                onChange={e => setCourseDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <input
                disabled={!courseBatchId}
                type="url"
                value={courseRegisterUrl}
                onChange={e => setCourseRegisterUrl(e.target.value)}
                placeholder="課程報名連結網址 (選填)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={isSyncing || !courseBatchId}
                className="w-full btn-action py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                發布課程
              </button>
            </form>

            {/* Existing Courses List for deletion/management */}
            {courses && courses.length > 0 && (
              <div className="pt-4 border-t border-white/5 light:border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-[10px] text-slate-400 font-bold">已發布課程列表 ({courses.filter(c => courseFilterBatch === 'all' || (courseFilterBatch === 'null' && !c.batch_id) || c.batch_id === courseFilterBatch).length})</h4>
                  <select
                    value={courseFilterBatch}
                    onChange={e => setCourseFilterBatch(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-slate-300 text-[9px] rounded px-1.5 py-0.5 outline-none light:bg-slate-100 light:border-slate-300 light:text-slate-800"
                  >
                    <option value="all">顯示全部</option>
                    <option value="null">全體課程</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {courses
                    .filter(c => courseFilterBatch === 'all' || (courseFilterBatch === 'null' && !c.batch_id) || c.batch_id === courseFilterBatch)
                    .map(course => {
                    const batch = batches.find(b => b.id === course.batch_id);
                    if (editingCourseId === course.id) {
                      return (
                        <div key={course.id} className="p-3 rounded bg-slate-950 border border-amber-500/50 space-y-2">
                          <input type="text" value={editCourseName} onChange={e => setEditCourseName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[11px] text-white" placeholder="課程名稱" />
                          <textarea value={editCourseDesc} onChange={e => setEditCourseDesc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[11px] text-white" rows={3} placeholder="課程描述" />
                          <div className="flex gap-2">
                            <select value={editCourseBatchId} onChange={e => setEditCourseBatchId(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-[11px] text-white">
                              <option value="">全體課程</option>
                              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <input type="date" value={editCourseDate} onChange={e => setEditCourseDate(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-[11px] text-white" />
                          </div>
                          <input type="url" value={editCourseRegisterUrl} onChange={e => setEditCourseRegisterUrl(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[11px] text-white" placeholder="報名連結" />
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] text-slate-400 font-bold shrink-0">排序（數字越小越前面）</label>
                            <input type="number" value={editCourseSortOrder} onFocus={e => e.target.select()} onChange={e => setEditCourseSortOrder(e.target.value)} className="w-20 bg-slate-900 border border-slate-700 rounded p-1.5 text-[11px] text-white text-center font-mono" />
                          </div>
                          <div className="flex justify-end gap-2 mt-2">
                            <button onClick={handleCancelEditCourse} className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-[10px]">取消</button>
                            <button onClick={() => handleSaveEditCourse(course.id)} disabled={isSyncing} className="px-3 py-1 bg-amber-500 text-white rounded text-[10px] font-bold">儲存</button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={course.id} className="flex justify-between items-center text-[11px] p-2 rounded bg-slate-950/40 border border-white/5 light:bg-slate-50 light:border-slate-200">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-bold text-white truncate light:text-slate-800" title={formatBrandText(course.name)}>{formatBrandText(course.name)}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            {course.class_date} | {batch ? batch.name : '全體期數'}
                          </p>
                          {course.register_url && (
                            <p className="text-[9px] text-purple-400 truncate mt-0.5" title={course.register_url}>
                              連結: {course.register_url}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {onUpdateCourse && (
                            <button type="button" onClick={() => handleStartEditCourse(course)} className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 p-1.5 rounded-lg transition-colors cursor-pointer"><Edit2 size={12} /></button>
                          )}
                          {onDeleteCourse && (
                            <button type="button" onClick={() => { if(confirm('確定刪除此課程？')) onDeleteCourse(course.id); }} disabled={isSyncing} className="text-red-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"><Trash2 size={12} /></button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Achievements */}
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
            <h3 className="font-black text-white text-sm flex items-center gap-1.5">
              <Trophy size={16} className="text-red-500" />
              建立修行成就
            </h3>
            
            <form onSubmit={handleCreateAchievement} className="space-y-4">
              <input
                required
                type="text"
                value={achTitle}
                onChange={e => setAchTitle(e.target.value)}
                placeholder="成就稱號 (例如：通天大師)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
              />
              <input
                type="text"
                value={achDesc}
                onChange={e => setAchDesc(e.target.value)}
                placeholder="成就解鎖描述..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
              />
              
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">選擇解鎖條件類型</label>
                <select
                  value={achConditionType}
                  onChange={e => setAchConditionType(e.target.value as Achievement['condition_type'])}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                >
                  <option value="total_score">總修行分數達標 (total_score)</option>
                  <option value="consecutive_checkins">連續修行天數達標 (consecutive_checkins)</option>
                  <option value="mission_count">特定任務完成次數 (mission_count)</option>
                  <option value="witness_post_count">見證牆入選數 (witness_post_count)</option>
                  <option value="pet_stage">神獸進化至指定階段 (pet_stage)</option>
                </select>
              </div>

              {achConditionType === 'mission_count' && (
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">選擇目標任務</label>
                  <select
                    required
                    value={achTargetMissionId}
                    onChange={e => setAchTargetMissionId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                  >
                    <option value="">-- 請選擇一項任務 --</option>
                    {Array.from(new Map(missions.map(m => [m.template_id || m.id, m])).values()).map(m => (
                      <option key={m.template_id || m.id} value={m.template_id || m.id}>
                        {m.title} ({m.mission_type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <input
                required
                type="number"
                onFocus={(e) => e.target.select()}
                value={achValue}
                onChange={e => setAchValue(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={
                  achConditionType === 'total_score' ? '所需經驗分數門檻 (分)' :
                  achConditionType === 'consecutive_checkins' ? '所需連續定課天數 (天)' :
                  achConditionType === 'mission_count' ? '任務需要完成次數 (次)' :
                  achConditionType === 'witness_post_count' ? '入選見證牆門檻 (次)' :
                  '神獸所需最小階段代號 (1-4)'
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
              />
              
              <div className="space-y-2">
                <label className="block text-[10px] text-slate-400 font-bold">金色發光徽章圖標選取 (50款預設，已用者為金色)</label>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-64 overflow-y-auto custom-scrollbar">
                  {PRESET_BADGE_ICONS.map(iconName => {
                    const selected = achIconUrl === iconName;
                    const used = isIconUsed(iconName);
                    return (
                      <button
                        type="button"
                        key={iconName}
                        onClick={() => setAchIconUrl(iconName)}
                        title={`${iconName}${used ? ' (已使用)' : ''}`}
                        className={`w-10 h-10 rounded-full flex items-center justify-center bg-slate-950 transition-all hover:scale-110 cursor-pointer overflow-visible ${
                          selected 
                            ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 scale-110' 
                            : 'hover:bg-slate-900/50'
                        }`}
                      >
                        <BadgeIcon name={iconName} unlocked={selected || used} size={38} />
                      </button>
                    );
                  })}
                </div>
                
                <div className="flex items-center gap-2 select-none mt-2">
                  <span className="text-[10px] text-slate-500 font-bold">或自訂圖片上傳:</span>
                  {achIconUrl && (achIconUrl.startsWith('data:') || achIconUrl.startsWith('http')) ? (
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0">
                      <img src={achIconUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setAchIconUrl(null)}
                        className="absolute top-0 right-0 bg-black/75 hover:bg-black text-white p-0.5 rounded-bl"
                      >
                        <X size={8} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-white/5 text-[9px] font-bold text-slate-300 cursor-pointer hover:border-red-500/30 hover:text-red-300 transition-all">
                      <ImageIcon size={10} className="text-red-400" />
                      <span>上傳</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const rawBase64 = await new Promise<string>((resolve, reject) => {
                                const r = new FileReader();
                                r.onload = (ev) => resolve(ev.target?.result as string);
                                r.onerror = () => reject(new Error('檔案'));
                                  r.readAsDataURL(file);
                              });
                              setAchIconUrl(rawBase64);
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSyncing}
                className="w-full btn-action py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              >
                發布全新成就
              </button>
            </form>

            {/* 現有成就列表 */}
            {achievements && achievements.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-slate-400">現有成就列表 ({achievements.length})</h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                  {[...achievements].sort((a, b) => a.condition_value - b.condition_value).map(ach => (
                    <div key={ach.id} className="bg-slate-900 border border-white/5 p-3 rounded-xl flex flex-col gap-3">
                      {editingAchId === ach.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editAchTitle}
                            onChange={e => setEditAchTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none"
                            placeholder="成就稱號"
                          />
                          <input
                            type="text"
                            value={editAchDesc}
                            onChange={e => setEditAchDesc(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none"
                            placeholder="成就描述"
                          />
                          
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold mb-1">條件類型</label>
                            <select
                              value={editAchConditionType}
                              onChange={e => setEditAchConditionType(e.target.value as Achievement['condition_type'])}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none"
                            >
                              <option value="total_score">總修行分數達標</option>
                              <option value="consecutive_checkins">連續修行天數達標</option>
                              <option value="mission_count">特定任務完成次數</option>
                              <option value="witness_post_count">見證牆入選數</option>
                              <option value="pet_stage">神獸進化至指定階段</option>
                            </select>
                          </div>

                          {editAchConditionType === 'mission_count' && (
                            <div>
                              <label className="block text-[10px] text-slate-500 font-bold mb-1">選擇目標任務</label>
                              <select
                                required
                                value={editAchTargetMissionId}
                                onChange={e => setEditAchTargetMissionId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none"
                              >
                                <option value="">-- 請選擇一項任務 --</option>
                                {Array.from(new Map(missions.map(m => [m.template_id || m.id, m])).values()).map(m => (
                                  <option key={m.template_id || m.id} value={m.template_id || m.id}>
                                    {m.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <input
                            type="number"
                            onFocus={(e) => e.target.select()}
                            value={editAchValue}
                            onChange={e => setEditAchValue(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none"
                            placeholder="數值門檻"
                          />
                          
                          <div className="space-y-1">
                            <label className="block text-[10px] text-slate-500 font-bold">選取圖標 (50款預設，已用者為金色)</label>
                            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 bg-slate-950 p-2 rounded-lg border border-slate-800 max-h-48 overflow-y-auto custom-scrollbar">
                              {PRESET_BADGE_ICONS.map(iconName => {
                                const selected = editAchIconUrl === iconName;
                                const used = isIconUsed(iconName);
                                return (
                                  <button
                                    type="button"
                                    key={iconName}
                                    onClick={() => setEditAchIconUrl(iconName)}
                                    title={`${iconName}${used ? ' (已使用)' : ''}`}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-950 transition-all cursor-pointer overflow-visible ${
                                      selected 
                                        ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 scale-110' 
                                        : 'hover:bg-slate-900/50'
                                    }`}
                                  >
                                    <BadgeIcon name={iconName} unlocked={selected || used} size={32} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex justify-end gap-2 mt-2">
                              <button onClick={handleCancelEditAch} className="px-3 py-1 rounded-lg bg-slate-850 text-xs text-slate-300 hover:bg-slate-800">取消</button>
                              <button onClick={() => handleSaveEditAch(ach.id)} className="px-3 py-1 rounded-lg bg-amber-500 text-xs text-slate-950 font-bold hover:bg-amber-600">儲存</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <BadgeIcon name={ach.icon_url} unlocked={true} size={40} className="shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-white truncate">{formatAchievementText(ach.title)}</p>
                              <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
                                {ach.condition_type === 'total_score' ? `${ach.condition_value} 分` :
                                 ach.condition_type === 'consecutive_checkins' ? `${ach.condition_value} 天` :
                                 ach.condition_type === 'mission_count' ? (
                                   ach.title.includes('邀約') || 
                                   ach.title.includes('推薦') || 
                                   ach.title.includes('人') || 
                                   (ach.target_mission_id && (
                                     ach.target_mission_id.includes('invite') || 
                                     ach.target_mission_id.includes('recom') || 
                                     ach.target_mission_id.includes('2d77f56d') || 
                                     ach.target_mission_id.includes('1bcc0eeb')
                                   ))
                                     ? `${ach.condition_value} 人`
                                     : `${ach.condition_value} 次`
                                 ) :
                                 ach.condition_type === 'witness_post_count' ? `${ach.condition_value} 次` :
                                 `第 ${ach.condition_value} 階段`}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{formatAchievementText(ach.description || '')}</p>
                            <span className="text-[10px] text-slate-400 font-mono">
                               門檻：{
                                 ach.condition_type === 'total_score' ? `${ach.condition_value.toLocaleString()} 分` :
                                 ach.condition_type === 'consecutive_checkins' ? `連續修行 ${ach.condition_value} 天` :
                                 ach.condition_type === 'mission_count' ? (
                                   ach.title.includes('邀約') || 
                                   ach.title.includes('推薦') || 
                                   ach.title.includes('人') || 
                                   (ach.target_mission_id && (
                                     ach.target_mission_id.includes('invite') || 
                                     ach.target_mission_id.includes('recom') || 
                                     ach.target_mission_id.includes('2d77f56d') || 
                                     ach.target_mission_id.includes('1bcc0eeb')
                                   ))
                                     ? `特定任務完成 ${ach.condition_value} 人`
                                     : `特定任務完成 ${ach.condition_value} 次`
                                 ) :
                                 ach.condition_type === 'witness_post_count' ? `入選見證牆 ${ach.condition_value} 次` :
                                 `神獸進化至第 ${ach.condition_value} 階段`
                               }
                               {ach.target_mission_id && ` | 任務: ${ach.target_mission_id}`}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button onClick={() => handleStartEditAch(ach)} className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-300 transition-colors">
                              <Edit2 size={12} />
                            </button>
                             <button
                               onClick={() => {
                                 if (confirm(`確定要刪除成就「${ach.title}」嗎？`)) {
                                   onDeleteAchievement && onDeleteAchievement(ach.id);
                                 }
                               }}
                               className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                             >
                               <Trash2 size={12} />
                             </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Cohorts section hidden because it duplicates '期數管理' tab */}
          {/*
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
            <h3 className="font-black text-white text-sm flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-red-500" />
              開設新班次 (Cohort)
            </h3>
            
            <form onSubmit={handleCreateCohort} className="space-y-4">
              <input
                required
                type="text"
                value={cohortName}
                onChange={e => setCohortName(e.target.value)}
                placeholder={`班次名稱 (如: ${BRAND.shortName}台中50期)`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
              />
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">參賽開始時間</label>
                <input
                  required
                  type="datetime-local"
                  value={cohortStartTime}
                  onChange={e => setCohortStartTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">參賽結束時間</label>
                <input
                  required
                  type="datetime-local"
                  value={cohortEndTime}
                  onChange={e => setCohortEndTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                />
              </div>
              
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl select-none">
                <p className="text-[10px] text-red-400 font-bold leading-normal">
                  ⚠️ 提示：此簡易功能僅建立班次記錄。若您需要自動初始化小隊，建議至上方 **「期數管理」** 分頁進行更完整的設定。
                </p>
              </div>

              <button
                type="submit"
                disabled={isSyncing}
                className="w-full btn-action py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black"
              >
                開班並設定時間
              </button>
            </form>
          </section>
          */}
        </div>
  );
}

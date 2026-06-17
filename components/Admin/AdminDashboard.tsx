'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Profile, Team, Task, Submission, 
  Course, Achievement, Announcement, UserRole, TaskType, TaskTargetType,
  Pet, UserPet, PetLine, PetStage, PetEvolutionLog, Card, Deck, DeckCard, UserDeck, Batch, MissionTemplate, BatchMissionTemplate, Mission, CaptainCandidate, StudentNote, SquadRoleDef
} from '@/types';
import { 
  ShieldCheck, FileCheck, Calendar, Trophy, 
  UserPlus, Sliders, Check, X, Plus, Trash2, Edit2,
  TrendingUp, Megaphone, HelpCircle, Save,
  Sparkles, Layers, BookOpen, Upload, Image as ImageIcon, AlertCircle, Shield, Settings, Users
} from 'lucide-react';
import { supabase, isRealSupabase } from '@/lib/supabase';
import { parsePetOffset, trimCenterSquare, useTrimmedPetImage } from '@/lib/petImage';
import { BatchesTab } from './tabs/BatchesTab';
import { RosterTab } from './tabs/RosterTab';
import { TeamsTab } from './tabs/TeamsTab';
import { OthersTab } from './tabs/OthersTab';
import { MissionTemplatesTab } from './tabs/MissionTemplatesTab';
import { TasksTab } from './tabs/TasksTab';
import { BatchRulesTab } from './tabs/BatchRulesTab';
import { SchedulePreviewTab } from './tabs/SchedulePreviewTab';
import { DecksTab } from './tabs/DecksTab';
import { PetsTab } from './tabs/PetsTab';

export const MISSION_CATEGORIES = ['初階', '進階', 'VIP', '期數任務', '神獸進化'];



interface AdminDashboardProps {
  profiles: Profile[];
  teams: Team[];
  tasks: Task[];
  submissions: Submission[];
  courses: Course[];
  achievements: Achievement[];
  announcements?: Announcement[];
  pets: Pet[];
  userPets: UserPet[];
  cards: Card[];
  decks: Deck[];
  deckCards: DeckCard[];
  userDecks: UserDeck[];
  batches: Batch[];
  missions: Mission[];
  onDeleteMission?: (missionId: string) => Promise<void>;
  onViewAsStudent?: (studentId: string) => void;
  missionTemplates: MissionTemplate[];
  batchMissionTemplates: BatchMissionTemplate[];
  petLines: PetLine[];
  petStages: PetStage[];
  captainCandidates: CaptainCandidate[];
  squadRoles?: SquadRoleDef[];
  onCreateSquadRole?: (data: Omit<SquadRoleDef, 'id' | 'created_at'>) => Promise<void>;
  onUpdateSquadRole?: (id: string, updates: Partial<SquadRoleDef>) => Promise<void>;
  onDeleteSquadRole?: (id: string) => Promise<void>;
  onAddCaptainCandidate?: (profileId: string, status: 'eligible' | 'paused' | 'disabled') => Promise<void>;
  onUpdateCaptainCandidate?: (candidateId: string, status: 'eligible' | 'paused' | 'disabled') => Promise<void>;
  onDeleteCaptainCandidate?: (candidateId: string) => Promise<void>;
  onUpdateTeamSettings?: (teamId: string, settings: Partial<Team>) => Promise<void>;
  onUpdatePetStage?: (stageId: string, updatedFields: Partial<PetStage>) => Promise<void>;
  onUpdatePetLine?: (lineId: string, updatedFields: Partial<PetLine>) => Promise<void>;
  onReviewSubmission: (submissionId: string, status: 'approved' | 'rejected', shareToWitness?: boolean) => Promise<void>;
  onCreateTask: (taskData: Omit<Task, 'id' | 'created_at' | 'created_by'>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onAssignTeam: (studentId: string, teamId: string | null, role: UserRole, batchId?: string | null, divisionName?: string | null, directorId?: string | null, status?: 'active' | 'ended' | 'inactive') => Promise<void>;
  onManualAdjustScore: (studentId: string, amount: number, reason: string) => Promise<void>;
  onCreateAnnouncement: (title: string, content: string, batchId?: string | null, publishAt?: string | null) => Promise<void>;
  onUpdateAnnouncement?: (id: string, updates: Partial<Announcement>) => Promise<void>;
  onDeleteAnnouncement?: (id: string) => Promise<void>;
  onCreateCourse: (name: string, description: string, classDate: string, batchId?: string | null, registerUrl?: string | null) => Promise<void>;
  onUpdateCourse?: (id: string, updates: Partial<Course>) => Promise<void>;
  onDeleteCourse?: (courseId: string) => Promise<void>;
  onCreateAchievement: (title: string, description: string, value: number, iconUrl?: string | null) => Promise<void>;
  onUpdateAchievement?: (id: string, updates: Partial<Achievement>) => Promise<void>;
  onDeleteAchievement?: (id: string) => Promise<void>;
  onCreatePet: (petData: Omit<Pet, 'id' | 'created_at'>) => Promise<void>;
  onCreateCard: (cardData: Omit<Card, 'id' | 'created_at'>) => Promise<void>;
  onCreateDeck: (name: string, isTemplate: boolean, cardIds: { cardId: string; count: number }[]) => Promise<void>;
  onAwardPetSkin: (studentId: string, petId: string, skinName: string) => Promise<void>;
  onLevelUpPet: (userPetId: string) => Promise<void>;
  onCreateBatch?: (batchData: Omit<Batch, 'id' | 'created_at' | 'updated_at'>, teamCount?: number) => Promise<void>;
  onUpdateBatch?: (batchId: string, batchData: Partial<Batch>, teamCount?: number) => Promise<void>;
  onDeleteBatch?: (batchId: string) => Promise<void>;
  onCreateMissionTemplate?: (templateData: Omit<MissionTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateMissionTemplate?: (templateId: string, templateData: Partial<MissionTemplate>) => Promise<void>;
  onDeleteMissionTemplate?: (templateId: string) => Promise<void>;
  onSaveBatchMissionTemplates?: (batchId: string, rules: Omit<BatchMissionTemplate, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>;
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
  onAddProfile?: (profileData: { name: string; phone: string; role: UserRole; batchId: string; teamId: string; divisionName?: string | null; directorId?: string | null }) => Promise<void>;
  onUpdateProfile?: (profileId: string, updates: Partial<Profile>) => Promise<void>;
  onDeleteProfile?: (profileId: string) => Promise<void>;
  onHardDeleteProfile?: (profileId: string) => Promise<void>;
  onQuickAssignCaptain?: (batchId: string, captainProfileId: string, teamId: string, directorId: string | null) => Promise<void>;
  isSyncing: boolean;
  notes?: StudentNote[];
  onSaveNote?: (studentId: string, noteText: string) => Promise<void>;
  currentUserId?: string;
}

export function AdminDashboard({
  profiles,
  teams,
  tasks,
  submissions,
  missions,
  onDeleteMission,
  onViewAsStudent,
  courses,
  achievements,
  announcements = [],
  pets,
  userPets,
  petLines,
  petStages,
  captainCandidates,
  squadRoles = [],
  onAddCaptainCandidate,
  onUpdateCaptainCandidate,
  onDeleteCaptainCandidate,
  onCreateSquadRole,
  onUpdateSquadRole,
  onDeleteSquadRole,
  onUpdateAchievement,
  onDeleteAchievement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onUpdateCourse,
  onUpdateTeamSettings,
  onUpdatePetStage,
  onUpdatePetLine,
  cards,
  decks,
  deckCards,
  userDecks,
  batches,
  missionTemplates,
  batchMissionTemplates,
  onReviewSubmission,
  onCreateTask,
  onDeleteTask,
  onAssignTeam,
  onManualAdjustScore,
  onCreateAnnouncement,
  onCreateCourse,
  onDeleteCourse,
  onCreateAchievement,
  onCreatePet,
  onCreateCard,
  onCreateDeck,
  onAwardPetSkin,
  onLevelUpPet,
  onCreateBatch,
  onUpdateBatch,
  onDeleteBatch,
  onCreateMissionTemplate,
  onUpdateMissionTemplate,
  onDeleteMissionTemplate,
  onSaveBatchMissionTemplates,
  onGenerateMissions,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
  onHardDeleteProfile,
  onQuickAssignCaptain,
  isSyncing,
  notes = [],
  onSaveNote,
  currentUserId
}: AdminDashboardProps) {
  const [adminTab, setAdminTab] = useState<'reviews' | 'tasks' | 'teams' | 'adjust' | 'others' | 'pets' | 'decks' | 'batches' | 'mission_templates' | 'batch_rules' | 'schedule_preview' | 'captain_candidates' | 'roster'>('reviews');


  // Duty Assignment State
  const [selectedSettingMemberId, setSelectedSettingMemberId] = useState<string>('');
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    profiles.forEach(member => {
      // the note should belong to this member. Admin can act as the captain, or we just get any note since it's global
      const note = notes?.find(n => n.student_id === member.id)?.note || '';
      map[member.id] = note;
    });
    setNotesMap(map);
  }, [notes, profiles]);

  // Squad Role Editing state
  const [editingSquadRoleId, setEditingSquadRoleId] = useState<string | null>(null);
  const [editingSquadRoleName, setEditingSquadRoleName] = useState("");
  const [editingSquadRoleDuties, setEditingSquadRoleDuties] = useState("");
  const handleNoteChangeLocal = (memberId: string, value: string) => {
    setNotesMap(prev => ({ ...prev, [memberId]: value }));
  };

  const handleNoteBlur = async (memberId: string) => {
    const noteText = notesMap[memberId] || '';
    try {
      if (onSaveNote) await onSaveNote(memberId, noteText);
    } catch (err) {
      console.error('Error auto-saving note:', err);
    }
  };

  const handleSystemRoleChange = async (memberId: string, newRole: string) => {
    setSavingMemberId(memberId);
    try {
      if (onUpdateProfile) {
        await onUpdateProfile(memberId, { role: newRole as any });
      }
    } catch (err) {
      console.error('Error saving system role:', err);
    } finally {
      setSavingMemberId(null);
    }
  };

  // --- Captain Candidates Form State ---
  const [newCandProfileId, setNewCandProfileId] = useState('');
  const [newCandStatus, setNewCandStatus] = useState<'eligible' | 'paused' | 'disabled'>('eligible');

  // --- Submissions Review State ---
  const pendingSubmissions = submissions.filter(s => s.status === 'pending');

  // --- Task creation State ---






  const handleAddCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandProfileId || !onAddCaptainCandidate) return;
    try {
      await onAddCaptainCandidate(newCandProfileId, newCandStatus);
      setNewCandProfileId('');
      setNewCandStatus('eligible');
      alert('成功將學員加入小隊長候選名單！');
    } catch (err: any) {
      console.error(err);
      alert(err.message || '加入候選名單失敗');
    }
  };


  // --- Score adjust State ---
  const [adjustStudentId, setAdjustStudentId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState<string>('100');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustMessage, setAdjustMessage] = useState('');



  // --- Handlers ---

  const handleAdjustScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustStudentId || !adjustReason) return;
    const amountNum = Number(adjustAmount);
    // 大額調分（超過 5000）先確認，避免手滑打錯
    if (Math.abs(amountNum) > 5000 && !window.confirm(`確定要調整 ${amountNum > 0 ? '+' : ''}${amountNum} 分嗎？這是一個很大的數字，請確認沒有打錯。`)) {
      return;
    }
    const studentName = profiles.find(p => p.id === adjustStudentId)?.name || '學員';
    try {
      await onManualAdjustScore(adjustStudentId, amountNum, adjustReason);
      // 只有真的成功才顯示成功訊息
      setAdjustMessage(`🎉 成功對 ${studentName} 調整分數：${amountNum > 0 ? '+' : ''}${amountNum}`);
      setAdjustStudentId('');
      setAdjustReason('');
      setTimeout(() => setAdjustMessage(''), 3000);
    } catch (err: any) {
      setAdjustMessage(`❌ 調分失敗：${err?.message || '請稍後再試'}`);
      setTimeout(() => setAdjustMessage(''), 5000);
    }
  };



  const [missionCategories, setMissionCategories] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nlp_mission_categories');
      const cats = saved ? JSON.parse(saved) : MISSION_CATEGORIES;
      if (!cats.includes('神獸進化')) {
        cats.push('神獸進化');
        localStorage.setItem('nlp_mission_categories', JSON.stringify(cats));
      }
      return cats;
    }
    return MISSION_CATEGORIES;
  });




  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Admin Panel Header & inner sub-navigation */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 select-none">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">
              大會指揮部 (Admin Dashboard)
            </h2>
            <p className="text-xl font-black text-white mt-1">
              總控制面板
            </p>
          </div>
        </div>

        {/* Sub Navigation tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 light:border-slate-200">
          {[
            { key: 'reviews', label: '審核證明', icon: FileCheck },
            { key: 'batches', label: '期數管理', icon: ShieldCheck },
            { key: 'roster', label: '學員名單', icon: Users },
            { key: 'mission_templates', label: '任務模板庫', icon: BookOpen },
            { key: 'batch_rules', label: '期數任務設定', icon: Sliders },
            { key: 'schedule_preview', label: '任務排程預覽', icon: Calendar },
            { key: 'tasks', label: '任務管理', icon: Calendar },
            { key: 'pets', label: '神獸管理中心', icon: Sparkles },
            { key: 'decks', label: '卡牌與排組', icon: Layers },
            { key: 'teams', label: '小隊分配', icon: UserPlus },
            { key: 'captain_candidates', label: '小隊長候選', icon: Shield },
            { key: 'adjust', label: '手動調分', icon: Sliders },
            { key: 'others', label: '班次/公告/課程/成就', icon: Megaphone }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = adminTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setAdminTab(tab.key as any)}
                className={`py-2 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                    : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white light:bg-slate-100 light:border-slate-300 light:text-slate-500'
                }`}
              >
                <Icon size={14} />
                {tab.label}
                {tab.key === 'reviews' && pendingSubmissions.length > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-black h-4 px-1.5 rounded-full flex items-center justify-center">
                    {pendingSubmissions.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================== 1. 審核面板 ==================== */}
      {adminTab === 'reviews' && (
        <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
          <h3 className="font-black text-white text-base select-none">
            待處理簽到打卡證明 ({pendingSubmissions.length})
          </h3>

          {pendingSubmissions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-bold text-sm">
              🎉 目前沒有待審核的打卡證明，大家都很自律或全部審核完畢！
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSubmissions.map(sub => (
                <div key={sub.id} className="bg-slate-950/60 border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 light:bg-slate-50 light:border-slate-300/60">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 select-none">
                      <span className="font-bold text-white text-xs bg-slate-900 px-2 py-0.5 rounded border border-white/5 light:bg-slate-200 light:text-slate-900 light:border-slate-300">
                        學員：{sub.profile?.name}
                      </span>
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                        任務：{sub.mission?.title || tasks.find(t => t.id === sub.mission_id)?.name || '未知任務'}
                      </span>
                      <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                        +{sub.mission?.points || tasks.find(t => t.id === sub.mission_id)?.score || 0} 經驗
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-bold leading-relaxed">
                      證明描述：「 <span className="text-white italic">{sub.proof_text}</span> 」
                    </p>

                    {(sub.proof_link || sub.proof_image_url) && (
                      <div className="flex flex-wrap gap-3 pt-1.5 select-none">
                        {sub.proof_link && (
                          <a
                            href={sub.proof_link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-amber-500 hover:underline"
                          >
                            🔗 查看參考連結
                          </a>
                        )}
                        {sub.proof_image_url && (
                          <a
                            href={sub.proof_image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-amber-500 hover:underline"
                          >
                            🖼️ 查看佐證圖片
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions (Approve / Reject) */}
                  <div className="shrink-0 flex gap-2 select-none">
                    <button
                      onClick={() => onReviewSubmission(sub.id, 'rejected')}
                      disabled={isSyncing}
                      className="btn-action bg-slate-900 border border-red-500/30 hover:bg-red-500/10 text-red-400 p-2.5 rounded-xl text-xs font-black flex items-center gap-1 light:bg-slate-100"
                    >
                      <X size={14} />
                      退回
                    </button>
                    <button
                      onClick={() => onReviewSubmission(sub.id, 'approved', false)}
                      disabled={isSyncing}
                      className="btn-action bg-emerald-500 hover:bg-emerald-600 text-slate-950 p-2.5 rounded-xl text-xs font-black flex items-center gap-1"
                    >
                      <Check size={14} />
                      同意加分
                    </button>
                    <button
                      onClick={() => onReviewSubmission(sub.id, 'approved', true)}
                      disabled={isSyncing}
                      title="通過並分享到見證牆"
                      className="btn-action bg-purple-500 hover:bg-purple-600 text-white p-2.5 rounded-xl text-xs font-black flex items-center gap-1"
                    >
                      <Check size={14} />
                      上見證牆
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ==================== 2. 任務管理 ==================== */}
      {adminTab === 'tasks' && (
        <TasksTab
          tasks={tasks}
          batches={batches}
          missionCategories={missionCategories}
          isSyncing={isSyncing}
          onCreateTask={onCreateTask}
          onDeleteTask={onDeleteTask}
        />
      )}

      {/* ==================== 3. 小隊分配 ==================== */}
      {adminTab === 'teams' && (
        <TeamsTab
          profiles={profiles}
          teams={teams}
          batches={batches}
          captainCandidates={captainCandidates}
          notes={notes}
          currentUserId={currentUserId}
          isSyncing={isSyncing}
          onAssignTeam={onAssignTeam}
          onUpdateTeamSettings={onUpdateTeamSettings}
          onSaveNote={onSaveNote}
          onAddProfile={onAddProfile}
          onQuickAssignCaptain={onQuickAssignCaptain}
        />
      )}

      {/* ==================== 4. 手動調分與學員備註 ==================== */}
      {adminTab === 'adjust' && (
        <div className="space-y-6">
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 light:bg-white light:border-slate-200">
            <h3 className="font-black text-white text-base select-none">
              手動增減個別學員經驗值
            </h3>

            <form onSubmit={handleAdjustScoreSubmit} className="space-y-4 max-w-md select-none">
              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5">選擇學員</label>
                <select
                  required
                  value={adjustStudentId}
                  onChange={e => setAdjustStudentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none"
                >
                  <option value="">請選擇學員...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (經驗：{p.score})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1.5">調整數值 (正負皆可)</label>
                  <input
                    required
                    type="number"
                    onFocus={(e) => e.target.select()}
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value)}
                    placeholder="例如：500 或 -200"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1.5 pt-6 leading-relaxed">
                    ※ 扣減請輸入負數值，如 -200
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5">調整原因</label>
                <input
                  required
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="例如：實體研討會擔任志工表率、遲到扣分..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-red-500"
                />
              </div>

              {adjustMessage && (
                <p className="text-xs font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-center">
                  {adjustMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSyncing || !adjustStudentId || !adjustReason}
                className="btn-action bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-xl text-xs font-black"
              >
                確認調整分數
              </button>
            </form>
          </section>

          {/* ⚙️ 系統職稱設定 */}
          <section className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 text-left light:bg-white light:border-slate-200">
            <h3 className="text-sm font-black text-white border-b border-white/5 pb-3 flex items-center gap-2 select-none light:border-slate-200 light:text-slate-900">
              <Settings size={16} className="text-amber-500" />
              系統職稱設定
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5 max-w-md">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                  選擇學員
                </label>
                <select
                  value={selectedSettingMemberId}
                  onChange={(e) => setSelectedSettingMemberId(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5 text-slate-300 font-bold outline-none focus:border-amber-500 focus:bg-slate-950 transition-all light:bg-white light:border-slate-350 light:text-slate-800"
                >
                  <option value="">-- 請選擇學員 --</option>
                  {profiles.map(member => {
                    const t = teams.find(t => t.id === member.team_id);
                    return (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.role === 'admin' ? '大隊長' : member.role === 'captain' ? '小隊長' : '一般學員'}) {t ? `[${t.name}]` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedSettingMemberId && (() => {
                const member = profiles.find(m => m.id === selectedSettingMemberId);
                if (!member) return null;
                const noteText = notesMap[member.id] || '';
                const currentSystemRole = member.role || 'student';
                const currentRole = member.squad_role || '';

                return (
                  <div className="pt-4 border-t border-white/5 light:border-slate-200 animate-in fade-in duration-200 max-w-sm">
                    {/* System Role Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                        設定修行定位 (系統職稱)
                      </label>
                      <select
                        value={currentSystemRole}
                        onChange={(e) => handleSystemRoleChange(member.id, e.target.value)}
                        className="w-full text-xs bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5 text-amber-400 font-bold outline-none focus:border-amber-500 focus:bg-slate-950 transition-all light:bg-white light:border-amber-300 light:text-amber-700"
                      >
                        <option value="student">一般學員</option>
                        <option value="captain">小隊長</option>
                        <option value="admin">大隊長</option>
                      </select>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* 🛡️ 小隊職責自訂管理 */}
          <section className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 text-left light:bg-white light:border-slate-200">
            <h3 className="text-sm font-black text-white border-b border-white/5 pb-3 flex items-center gap-2 select-none light:border-slate-200 light:text-slate-900">
              <Shield size={16} className="text-teal-500" />
              自訂小隊職責管理
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {squadRoles.map(role => (
                  <div key={role.id} className="bg-slate-950/40 p-4 rounded-xl border border-white/5 flex flex-col justify-between light:bg-slate-50 light:border-slate-200">
                    {editingSquadRoleId === role.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingSquadRoleName}
                          onChange={e => setEditingSquadRoleName(e.target.value)}
                          className="w-full text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white outline-none focus:border-teal-500"
                          placeholder="角色名稱"
                        />
                        <input
                          type="text"
                          value={editingSquadRoleDuties}
                          onChange={e => setEditingSquadRoleDuties(e.target.value)}
                          className="w-full text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white outline-none focus:border-teal-500"
                          placeholder="職責說明 (用逗號分隔)"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => setEditingSquadRoleId(null)}
                            className="text-[10px] text-slate-400 hover:text-white px-2 py-1"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => {
                              if (onUpdateSquadRole && editingSquadRoleName.trim()) {
                                onUpdateSquadRole(role.id, {
                                  name: editingSquadRoleName.trim(),
                                  duties: editingSquadRoleDuties.split(',').map(d => d.trim()).filter(d => d)
                                });
                                setEditingSquadRoleId(null);
                              }
                            }}
                            className="text-[10px] bg-teal-600 text-white hover:bg-teal-500 px-3 py-1 rounded"
                          >
                            儲存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <h4 className="font-bold text-teal-400 text-sm mb-1">{role.name}</h4>
                          {role.duties.length > 0 && (
                            <ul className="list-disc list-inside text-xs text-slate-400 space-y-0.5">
                              {role.duties.map((duty, idx) => (
                                <li key={idx}>{duty}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingSquadRoleId(role.id);
                              setEditingSquadRoleName(role.name);
                              setEditingSquadRoleDuties(role.duties.join(', '));
                            }}
                            disabled={isSyncing}
                            className="text-[10px] text-teal-500 hover:text-teal-400 flex items-center gap-1 bg-teal-500/10 px-2 py-1 rounded"
                          >
                            <Edit2 size={12} /> 編輯
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm(`確定要刪除職責「${role.name}」嗎？這會移除所有已指派此職責的學員設定。`)) {
                                if (onDeleteSquadRole) onDeleteSquadRole(role.id);
                              }
                            }}
                            disabled={isSyncing}
                            className="text-[10px] text-red-500 hover:text-red-400 flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded"
                          >
                            <Trash2 size={12} /> 刪除
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3 mt-4 light:bg-slate-100 light:border-slate-200">
                <h4 className="text-xs font-bold text-slate-300 light:text-slate-700">新增小隊職責</h4>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const name = (form.elements.namedItem('roleName') as HTMLInputElement).value.trim();
                    const dutiesStr = (form.elements.namedItem('duties') as HTMLInputElement).value;
                    const duties = dutiesStr.split(',').map(d => d.trim()).filter(d => d);
                    
                    if (name && onCreateSquadRole) {
                      onCreateSquadRole({ name, duties });
                      form.reset();
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <input 
                      type="text" 
                      name="roleName" 
                      placeholder="角色名稱（如：康樂股長）" 
                      required
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 outline-none focus:border-teal-500 light:bg-white light:border-slate-300 light:text-slate-800"
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      name="duties" 
                      placeholder="職責說明（選填，多個職責請用逗號分隔）" 
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 outline-none focus:border-teal-500 light:bg-white light:border-slate-300 light:text-slate-800"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSyncing}
                    className="w-full btn-action bg-teal-600 hover:bg-teal-500 text-white text-xs py-2 rounded-lg font-bold flex items-center justify-center gap-1"
                  >
                    <Plus size={14} /> 新增職責
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ==================== 小隊長候選名單分頁 ==================== */}
      {adminTab === 'captain_candidates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300 text-left">
          {/* 新增候選人表單 */}
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 lg:col-span-1 select-none">
            <h3 className="font-black text-white text-base flex items-center gap-2 light:text-slate-900">
              <ShieldCheck size={18} className="text-amber-500" />
              新增小隊長候選人
            </h3>
            <form onSubmit={handleAddCandidateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 light:text-slate-500 font-bold mb-1.5">選擇修行學員</label>
                <select
                  required
                  value={newCandProfileId}
                  onChange={e => setNewCandProfileId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900 cursor-pointer"
                >
                  <option value="">請選擇學員...</option>
                  {profiles
                    .filter((p, index, self) => 
                      self.findIndex(t => t.profile_id === p.profile_id) === index
                    )
                    .filter(p => !captainCandidates.some(c => c.profile_id === p.profile_id))
                    .map(p => (
                      <option key={p.profile_id} value={p.profile_id}>
                        {p.name} ({p.phone ? `*${p.phone.slice(-3)}` : '無手機'})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 light:text-slate-500 font-bold mb-1.5">初始指派狀態</label>
                <select
                  value={newCandStatus}
                  onChange={e => setNewCandStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900 cursor-pointer"
                >
                  <option value="eligible">可指派 (eligible)</option>
                  <option value="paused">暫停帶隊 (paused)</option>
                  <option value="disabled">停用 (disabled)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isSyncing}
                className="w-full btn-action py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black shadow-md shadow-amber-500/10 transition-all"
              >
                加入小隊長候選名單
              </button>
            </form>
          </section>

          {/* 候選名單列表 */}
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 lg:col-span-2">
            <h3 className="font-black text-white text-base select-none light:text-slate-900">
              小隊長候選名單 ({captainCandidates.length})
            </h3>
            <div className="bg-slate-950/60 border border-white/5 rounded-2xl overflow-x-auto light:bg-slate-50 light:border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 font-bold uppercase light:border-slate-200 select-none">
                    <th className="p-3">姓名</th>
                    <th className="p-3">手機後3碼</th>
                    <th className="p-3">曾參與期數</th>
                    <th className="p-3">曾擔任角色</th>
                    <th className="p-3 text-center">狀態</th>
                    <th className="p-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 light:divide-slate-200">
                  {captainCandidates.map(cand => (
                    <tr key={cand.id} className="hover:bg-white/[0.01] light:hover:bg-slate-100/30">
                      <td className="p-3 font-bold text-white light:text-slate-900">{cand.name}</td>
                      <td className="p-3 text-slate-300 light:text-slate-700 font-mono">
                        {cand.phone ? `*${cand.phone.slice(-3)}` : '—'}
                      </td>
                      <td className="p-3 text-slate-300 light:text-slate-700">
                        {cand.past_cohorts && cand.past_cohorts.length > 0 ? cand.past_cohorts.join(', ') : '無'}
                      </td>
                      <td className="p-3 text-slate-300 light:text-slate-700">
                        {cand.past_roles && cand.past_roles.length > 0 ? cand.past_roles.join(', ') : '無'}
                      </td>
                      <td className="p-3 text-center">
                        <select
                          value={cand.status}
                          disabled={isSyncing}
                          onChange={e => onUpdateCaptainCandidate?.(cand.id, e.target.value as any)}
                          className="bg-slate-905 border border-slate-800 text-white rounded p-1.5 text-xs outline-none cursor-pointer light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                        >
                          <option value="eligible">可指派</option>
                          <option value="paused">暫停帶隊</option>
                          <option value="disabled">停用</option>
                        </select>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => onDeleteCaptainCandidate?.(cand.id)}
                          disabled={isSyncing}
                          className="px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all"
                        >
                          移出名單
                        </button>
                      </td>
                    </tr>
                  ))}
                  {captainCandidates.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                        目前尚無小隊長候選人。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ==================== 5. 公告/課程/成就管理 ==================== */}
      {adminTab === 'others' && (
        <OthersTab
          announcements={announcements}
          courses={courses}
          achievements={achievements}
          batches={batches}
          isSyncing={isSyncing}
          onCreateAnnouncement={onCreateAnnouncement}
          onUpdateAnnouncement={onUpdateAnnouncement}
          onDeleteAnnouncement={onDeleteAnnouncement}
          onCreateCourse={onCreateCourse}
          onUpdateCourse={onUpdateCourse}
          onDeleteCourse={onDeleteCourse}
          onCreateAchievement={onCreateAchievement}
          onUpdateAchievement={onUpdateAchievement}
          onDeleteAchievement={onDeleteAchievement}
        />
      )}

      {/* ==================== 寵物配置分頁 ==================== */}
      {adminTab === 'pets' && (
        <PetsTab
          petLines={petLines}
          petStages={petStages}
          userPets={userPets}
          missionTemplates={missionTemplates}
          batches={batches}
          isSyncing={isSyncing}
          onUpdatePetStage={onUpdatePetStage}
          onUpdatePetLine={onUpdatePetLine}
          onCreateMissionTemplate={onCreateMissionTemplate}
          onUpdateMissionTemplate={onUpdateMissionTemplate}
        />
      )}

      {/* ==================== 卡牌與排組分頁 ==================== */}
      {adminTab === 'decks' && (
        <DecksTab
          cards={cards}
          decks={decks}
          deckCards={deckCards}
          isSyncing={isSyncing}
          onCreateCard={onCreateCard}
          onCreateDeck={onCreateDeck}
        />
      )}

      {/* ==================== 學員名單管理分頁 ==================== */}
      {adminTab === 'roster' && (
        <RosterTab
          profiles={profiles}
          teams={teams}
          batches={batches}
          isSyncing={isSyncing}
          onUpdateProfile={onUpdateProfile}
          onDeleteProfile={onDeleteProfile}
          onHardDeleteProfile={onHardDeleteProfile}
          onViewAsStudent={onViewAsStudent}
        />
      )}

      {/* ==================== 期數管理分頁 ==================== */}
      {adminTab === 'batches' && (
        <BatchesTab
          batches={batches}
          teams={teams}
          isSyncing={isSyncing}
          onCreateBatch={onCreateBatch}
          onUpdateBatch={onUpdateBatch}
          onDeleteBatch={onDeleteBatch}
        />
      )}

      {/* ==================== 任務模板庫分頁 ==================== */}
      {adminTab === 'mission_templates' && (
        <MissionTemplatesTab
          missionTemplates={missionTemplates}
          missionCategories={missionCategories}
          setMissionCategories={setMissionCategories}
          isSyncing={isSyncing}
          onCreateMissionTemplate={onCreateMissionTemplate}
          onUpdateMissionTemplate={onUpdateMissionTemplate}
          onDeleteMissionTemplate={onDeleteMissionTemplate}
        />
      )}

      {/* ==================== 期數任務設定分頁 ==================== */}
      {adminTab === 'batch_rules' && (
        <BatchRulesTab
          batches={batches}
          missionTemplates={missionTemplates}
          missionCategories={missionCategories}
          batchMissionTemplates={batchMissionTemplates}
          isSyncing={isSyncing}
          onSaveBatchMissionTemplates={onSaveBatchMissionTemplates}
        />
      )}

      {/* ==================== 任務排程預覽分頁 ==================== */}
      {adminTab === 'schedule_preview' && (
        <SchedulePreviewTab
          batches={batches}
          missionTemplates={missionTemplates}
          batchMissionTemplates={batchMissionTemplates}
          missionCategories={missionCategories}
          missions={missions}
          submissions={submissions}
          isSyncing={isSyncing}
          onDeleteMission={onDeleteMission}
          onGenerateMissions={onGenerateMissions}
        />
      )}



    </div>
  );
}

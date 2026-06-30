'use client';

import React, { useState } from 'react';
import {
  Profile, Team, Task, Submission,
  Course, Achievement, Announcement, UserRole,
  Pet, UserPet, PetLine, PetStage, Card, Deck, DeckCard, UserDeck, Batch, MissionTemplate, BatchMissionTemplate, Mission, CaptainCandidate, StudentNote, SquadRoleDef
} from '@/types';
import {
  ShieldCheck, FileCheck, Calendar,
  UserPlus, Sliders, Megaphone,
  Sparkles, Layers, BookOpen, Shield, Users, Activity
} from 'lucide-react';
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
import { ReviewsTab } from './tabs/ReviewsTab';
import { AdjustTab } from './tabs/AdjustTab';
import { GuideTab } from './tabs/GuideTab';
import { HealthTab } from './tabs/HealthTab';

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
  onUpdateMission?: (missionId: string, updates: Record<string, any>) => Promise<void>;
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
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => Promise<void>;
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
  showToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export function AdminDashboard({
  profiles,
  teams,
  tasks,
  submissions,
  missions,
  onDeleteMission,
  onUpdateMission,
  onViewAsStudent,
  courses,
  achievements,
  announcements = [],
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
  batches,
  missionTemplates,
  batchMissionTemplates,
  onReviewSubmission,
  onCreateTask,
  onDeleteTask,
  onUpdateTask,
  onAssignTeam,
  onManualAdjustScore,
  onCreateAnnouncement,
  onCreateCourse,
  onDeleteCourse,
  onCreateAchievement,
  onCreateCard,
  onCreateDeck,
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
  currentUserId,
  showToast
}: AdminDashboardProps) {
  const [adminTab, setAdminTab] = useState<'reviews' | 'tasks' | 'teams' | 'adjust' | 'others' | 'pets' | 'decks' | 'batches' | 'mission_templates' | 'batch_rules' | 'schedule_preview' | 'captain_candidates' | 'roster' | 'guide' | 'health'>('reviews');



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
            { key: 'guide', label: '攻略設計', icon: Sliders },
            { key: 'decks', label: '卡牌與排組', icon: Layers },
            { key: 'teams', label: '小隊分配', icon: UserPlus },
            { key: 'captain_candidates', label: '小隊長候選', icon: Shield },
            { key: 'adjust', label: '手動調分', icon: Sliders },
            { key: 'others', label: '班次/公告/課程/成就', icon: Megaphone },
            { key: 'health', label: '系統健康', icon: Activity }
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
        <ReviewsTab
          pendingSubmissions={pendingSubmissions}
          tasks={tasks}
          isSyncing={isSyncing}
          onReviewSubmission={onReviewSubmission}
          profiles={profiles}
          teams={teams}
          submissions={submissions}
          batches={batches}
          missions={missions}
          showToast={showToast}
        />
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
          onUpdateTask={onUpdateTask}
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
          showToast={showToast}
        />
      )}

      {/* ==================== 4. 手動調分與學員備註 ==================== */}
      {adminTab === 'adjust' && (
        <AdjustTab
          profiles={profiles}
          teams={teams}
          batches={batches}
          squadRoles={squadRoles}
          notes={notes}
          isSyncing={isSyncing}
          onManualAdjustScore={onManualAdjustScore}
          onSaveNote={onSaveNote}
          onUpdateProfile={onUpdateProfile}
          onCreateSquadRole={onCreateSquadRole}
          onUpdateSquadRole={onUpdateSquadRole}
          onDeleteSquadRole={onDeleteSquadRole}
        />
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
          missions={missions}
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

      {/* ==================== 攻略配置分頁 ==================== */}
      {adminTab === 'guide' && (
        <GuideTab isSyncing={isSyncing} />
      )}

      {/* ==================== 系統健康(監控)分頁 ==================== */}
      {adminTab === 'health' && (
        <HealthTab />
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
          onUpdateMission={onUpdateMission}
          onGenerateMissions={onGenerateMissions}
        />
      )}



    </div>
  );
}

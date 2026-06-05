'use client';

import React, { useState } from 'react';
import { 
  Profile, Team, Task, Submission, 
  Course, Achievement, Announcement, UserRole, TaskType, TaskTargetType,
  Pet, UserPet, Card, Deck, DeckCard, UserDeck, Batch, MissionTemplate, BatchMissionTemplate
} from '@/types';
import { 
  ShieldCheck, FileCheck, Calendar, Trophy, 
  UserPlus, Sliders, Check, X, Plus, Trash2, 
  TrendingUp, Megaphone, HelpCircle, Save,
  Sparkles, Layers, BookOpen
} from 'lucide-react';

interface AdminDashboardProps {
  profiles: Profile[];
  teams: Team[];
  tasks: Task[];
  submissions: Submission[];
  courses: Course[];
  achievements: Achievement[];
  pets: Pet[];
  userPets: UserPet[];
  cards: Card[];
  decks: Deck[];
  deckCards: DeckCard[];
  userDecks: UserDeck[];
  batches: Batch[];
  missionTemplates: MissionTemplate[];
  batchMissionTemplates: BatchMissionTemplate[];
  onReviewSubmission: (submissionId: string, status: 'approved' | 'rejected') => Promise<void>;
  onCreateTask: (taskData: Omit<Task, 'id' | 'created_at' | 'created_by'>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onAssignTeam: (studentId: string, teamId: string | null, role: UserRole, batchId?: string | null) => Promise<void>;
  onManualAdjustScore: (studentId: string, amount: number, reason: string) => Promise<void>;
  onCreateAnnouncement: (title: string, content: string, batchId?: string | null) => Promise<void>;
  onCreateCourse: (name: string, description: string, classDate: string, batchId?: string | null, registerUrl?: string | null) => Promise<void>;
  onDeleteCourse?: (courseId: string) => Promise<void>;
  onCreateAchievement: (title: string, description: string, value: number) => Promise<void>;
  onCreatePet: (petData: Omit<Pet, 'id' | 'created_at'>) => Promise<void>;
  onCreateCard: (cardData: Omit<Card, 'id' | 'created_at'>) => Promise<void>;
  onCreateDeck: (name: string, isTemplate: boolean, cardIds: { cardId: string; count: number }[]) => Promise<void>;
  onAwardPetSkin: (studentId: string, petId: string, skinName: string) => Promise<void>;
  onLevelUpPet: (userPetId: string) => Promise<void>;
  onCreateBatch?: (batchData: Omit<Batch, 'id' | 'created_at' | 'updated_at'>, teamCount?: number) => Promise<void>;
  onUpdateBatch?: (batchId: string, batchData: Partial<Batch>, teamCount?: number) => Promise<void>;
  onCreateMissionTemplate?: (templateData: Omit<MissionTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateMissionTemplate?: (templateId: string, templateData: Partial<MissionTemplate>) => Promise<void>;
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
  onAddProfile?: (profileData: { name: string; phone: string; role: UserRole; batchId: string; teamId: string }) => Promise<void>;
  isSyncing: boolean;
}

export function AdminDashboard({
  profiles,
  teams,
  tasks,
  submissions,
  courses,
  achievements,
  pets,
  userPets,
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
  onCreateMissionTemplate,
  onUpdateMissionTemplate,
  onSaveBatchMissionTemplates,
  onGenerateMissions,
  onAddProfile,
  isSyncing
}: AdminDashboardProps) {
  const [adminTab, setAdminTab] = useState<'reviews' | 'tasks' | 'teams' | 'adjust' | 'others' | 'pets' | 'decks' | 'batches' | 'mission_templates' | 'batch_rules' | 'schedule_preview'>('reviews');

  // --- Submissions Review State ---
  const pendingSubmissions = submissions.filter(s => s.status === 'pending');

  // --- Task creation State ---
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('daily');
  const [taskScore, setTaskScore] = useState(100);
  const [taskReqProof, setTaskReqProof] = useState(true);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDateToLocal = (date: Date) => {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const [taskStartTime, setTaskStartTime] = useState(formatDateToLocal(new Date()));
  const [taskEndTime, setTaskEndTime] = useState(formatDateToLocal(new Date(Date.now() + 604800000)));
  const [taskBatchId, setTaskBatchId] = useState('');

  const handleBatchChange = (batchId: string) => {
    setTaskBatchId(batchId);
    if (!batchId) return;
    const selectedBatch = batches.find(b => b.id === batchId);
    if (selectedBatch) {
      setTaskStartTime(formatDateToLocal(new Date(selectedBatch.start_date)));
      setTaskEndTime(formatDateToLocal(new Date(selectedBatch.end_date)));
    }
  };

  const handleTaskTypeChange = (type: TaskType) => {
    setTaskType(type);
    if (type === 'daily' && taskBatchId) {
      const selectedBatch = batches.find(b => b.id === taskBatchId);
      if (selectedBatch) {
        setTaskStartTime(formatDateToLocal(new Date(selectedBatch.start_date)));
        setTaskEndTime(formatDateToLocal(new Date(selectedBatch.end_date)));
      }
    }
  };

  // --- Team assignment State ---
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignTeamId, setAssignTeamId] = useState('');
  const [assignCohortId, setAssignCohortId] = useState('');
  const [assignBatchId, setAssignBatchId] = useState('');
  const [assignRole, setAssignRole] = useState<UserRole>('student');

  // --- Add Profile Form State ---
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePhone, setNewProfilePhone] = useState('');
  const [newProfileBatchId, setNewProfileBatchId] = useState('');
  const [newProfileTeamId, setNewProfileTeamId] = useState('');
  const [newProfileRole, setNewProfileRole] = useState<UserRole>('captain');
  const [newProfileError, setNewProfileError] = useState<string | null>(null);
  const [newProfileSuccess, setNewProfileSuccess] = useState<string | null>(null);

  const handleAddProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim() || !newProfilePhone.trim()) return;
    setNewProfileError(null);
    setNewProfileSuccess(null);
    if (onAddProfile) {
      try {
        await onAddProfile({
          name: newProfileName.trim(),
          phone: newProfilePhone.trim(),
          role: newProfileRole,
          batchId: newProfileBatchId,
          teamId: newProfileTeamId
        });
        setNewProfileSuccess(`🎉 成功新增 ${newProfileRole === 'captain' ? '小隊長' : newProfileRole === 'admin' ? '管理員' : '學員'}：${newProfileName}`);
        setNewProfileName('');
        setNewProfilePhone('');
        setNewProfileBatchId('');
        setNewProfileTeamId('');
        setNewProfileRole('captain');
      } catch (err: any) {
        setNewProfileError(err.message || '新增失敗');
      }
    }
  };

  // --- Score adjust State ---
  const [adjustStudentId, setAdjustStudentId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState(100);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustMessage, setAdjustMessage] = useState('');

  // --- Pet system State ---
  const [petName, setPetName] = useState('');
  const [petDesc, setPetDesc] = useState('');
  const [petImgUrl, setPetImgUrl] = useState('');
  const [petEvoImgUrl, setPetEvoImgUrl] = useState('');
  const [petUnlockThreshold, setPetUnlockThreshold] = useState(0);

  // --- Card system State ---
  const [cardTitle, setCardTitle] = useState('');
  const [cardDesc, setCardDesc] = useState('');
  const [cardElement, setCardElement] = useState<'water' | 'fire' | 'wind' | 'earth'>('water');
  const [cardRarity, setCardRarity] = useState<'N' | 'R' | 'SR' | 'SSR'>('N');
  const [cardImgUrl, setCardImgUrl] = useState('');

  // --- Deck system State ---
  const [deckName, setDeckName] = useState('');
  const [selectedCards, setSelectedCards] = useState<Record<string, number>>({});

  // --- Others (Announcement, Course, Achievement) State ---
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annBatchId, setAnnBatchId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseDate, setCourseDate] = useState('');
  const [courseBatchId, setCourseBatchId] = useState('');
  const [courseRegisterUrl, setCourseRegisterUrl] = useState('');
  const [achTitle, setAchTitle] = useState('');
  const [achDesc, setAchDesc] = useState('');
  const [achValue, setAchValue] = useState(5000);

  // --- Handlers ---
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName) return;

    await onCreateTask({
      name: taskName,
      description: taskDesc,
      type: taskType,
      score: Number(taskScore),
      requires_approval: taskReqProof,
      requires_proof: taskReqProof,
      publish_time: new Date().toISOString(),
      start_time: new Date(taskStartTime).toISOString(),
      end_time: new Date(taskEndTime).toISOString(),
      target_type: 'all',
      target_team_id: null,
      target_user_id: null,
      batch_id: taskBatchId || null
    });

    setTaskName('');
    setTaskDesc('');
    setTaskScore(100);
    setTaskBatchId('');
    setShowTaskModal(false);
  };

  const handleAssignTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStudentId) return;
    await onAssignTeam(assignStudentId, assignTeamId || null, assignRole, assignBatchId || null);
    setAssignStudentId('');
    setAssignTeamId('');
    setAssignBatchId('');
  };

  const handleAssignBatchChange = (batchId: string) => {
    setAssignBatchId(batchId);
    setAssignTeamId('');
    setAssignStudentId('');
  };

  const handleAdjustScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustStudentId || !adjustReason) return;
    await onManualAdjustScore(adjustStudentId, Number(adjustAmount), adjustReason);
    
    const studentName = profiles.find(p => p.id === adjustStudentId)?.name || '學員';
    setAdjustMessage(`🎉 成功對 ${studentName} 調整分數：${adjustAmount > 0 ? '+' : ''}${adjustAmount}`);
    setAdjustStudentId('');
    setAdjustReason('');
    setTimeout(() => setAdjustMessage(''), 3000);
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent || !annBatchId) return;
    await onCreateAnnouncement(annTitle, annContent, annBatchId === 'all' ? null : annBatchId);
    setAnnTitle('');
    setAnnContent('');
    setAnnBatchId('');
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
    alert('課程建立成功！');
  };

  const handleCreateAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!achTitle || !achValue) return;
    await onCreateAchievement(achTitle, achDesc, Number(achValue));
    setAchTitle('');
    setAchDesc('');
    setAchValue(5000);
    alert('成就建立成功！');
  };

  // --- Cohort State ---
  const [cohortName, setCohortName] = useState('');
  const [cohortStartTime, setCohortStartTime] = useState(formatDateToLocal(new Date()));
  const [cohortEndTime, setCohortEndTime] = useState(formatDateToLocal(new Date(Date.now() + 30 * 86400000)));

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cohortName || !cohortStartTime || !cohortEndTime) return;
    if (onCreateBatch) {
      await onCreateBatch({
        name: cohortName,
        start_date: new Date(cohortStartTime).toISOString(),
        end_date: new Date(cohortEndTime).toISOString(),
        status: 'active',
      });
      setCohortName('');
      alert('期數建立成功！');
    }
  };

  // --- Batch Management States ---
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchStartDate, setNewBatchStartDate] = useState('');
  const [newBatchEndDate, setNewBatchEndDate] = useState('');
  const [newBatchStatus, setNewBatchStatus] = useState<'draft' | 'active' | 'ended'>('draft');
  const [newBatchTeamCount, setNewBatchTeamCount] = useState<number>(4);

  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editBatchName, setEditBatchName] = useState('');
  const [editBatchStartDate, setEditBatchStartDate] = useState('');
  const [editBatchEndDate, setEditBatchEndDate] = useState('');
  const [editBatchStatus, setEditBatchStatus] = useState<'draft' | 'active' | 'ended'>('draft');
  const [editBatchTeamCount, setEditBatchTeamCount] = useState<number>(4);

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
    if (onUpdateBatch) {
      await onUpdateBatch(batchId, {
        name: editBatchName,
        start_date: new Date(editBatchStartDate).toISOString(),
        end_date: new Date(editBatchEndDate).toISOString(),
        status: editBatchStatus
      }, editBatchTeamCount);
      setEditingBatchId(null);
      alert('期數與小隊更新成功！');
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
      }, newBatchTeamCount);
      setNewBatchName('');
      setNewBatchStartDate('');
      setNewBatchEndDate('');
      setNewBatchStatus('draft');
      setNewBatchTeamCount(4);
      alert('期數與小隊建立成功！');
    }
  };

  // --- Mission Template Management States ---
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateType, setNewTemplateType] = useState<'daily' | 'weekly' | 'special' | 'limited'>('daily');
  const [newTemplatePoints, setNewTemplatePoints] = useState<string | number>(50);
  const [newTemplateReviewType, setNewTemplateReviewType] = useState<'auto' | 'leader' | 'admin'>('leader');
  const [newTemplateActive, setNewTemplateActive] = useState<boolean>(true);

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editTemplateTitle, setEditTemplateTitle] = useState('');
  const [editTemplateDesc, setEditTemplateDesc] = useState('');
  const [editTemplateType, setEditTemplateType] = useState<'daily' | 'weekly' | 'special' | 'limited'>('daily');
  const [editTemplatePoints, setEditTemplatePoints] = useState<string | number>(50);
  const [editTemplateReviewType, setEditTemplateReviewType] = useState<'auto' | 'leader' | 'admin'>('leader');
  const [editTemplateActive, setEditTemplateActive] = useState<boolean>(true);

  const startEditTemplate = (template: MissionTemplate) => {
    setEditingTemplateId(template.id);
    setEditTemplateTitle(template.title);
    setEditTemplateDesc(template.description);
    setEditTemplateType(template.mission_type);
    setEditTemplatePoints(template.points);
    setEditTemplateReviewType(template.review_type ?? 'leader');
    setEditTemplateActive(template.is_active);
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
        is_active: editTemplateActive
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
        is_active: newTemplateActive
      });
      setNewTemplateTitle('');
      setNewTemplateDesc('');
      setNewTemplateType('daily');
      setNewTemplatePoints(50);
      setNewTemplateReviewType('leader');
      setNewTemplateActive(true);
      alert('任務模板建立成功！');
    }
  };

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
  React.useEffect(() => {
    if (batches.length > 0 && !selectedRuleBatchId) {
      setSelectedRuleBatchId(batches[0].id);
    }
  }, [batches, selectedRuleBatchId]);

  // Sync batch templates when selected batch or rules list changes
  React.useEffect(() => {
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
        week_offset: existingRule ? existingRule.week_offset : 1,
        day_offset: existingRule ? existingRule.day_offset : 1,
        duration_days: existingRule ? existingRule.duration_days : 1,
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

  const handleSaveBatchRulesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRuleBatchId) return;
    
    const rulesToSave: Omit<BatchMissionTemplate, 'id' | 'created_at' | 'updated_at'>[] = [];
    
    Object.entries(localRules).forEach(([templateId, rule]) => {
      if (rule.is_applied) {
        const template = missionTemplates.find(t => t.id === templateId);
        if (!template) return;
        
        rulesToSave.push({
          batch_id: selectedRuleBatchId,
          template_id: templateId,
          week_offset: template.mission_type === 'weekly' ? Number(rule.week_offset) : null,
          day_offset: template.mission_type === 'limited' ? Number(rule.day_offset) : null,
          duration_days: template.mission_type === 'limited' ? Number(rule.duration_days) : null,
          is_enabled: rule.is_enabled
        });
      }
    });
    
    if (onSaveBatchMissionTemplates) {
      await onSaveBatchMissionTemplates(selectedRuleBatchId, rulesToSave);
      alert('期數任務設定儲存成功！');
    }
  };

  // --- Schedule Preview States ---
  const [selectedPreviewBatchId, setSelectedPreviewBatchId] = useState<string>('');

  // Auto select first batch if none selected
  React.useEffect(() => {
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
    }> = [];
    
    rules.forEach(rule => {
      const template = missionTemplates.find(t => t.id === rule.template_id);
      if (!template) return;
      
      const type = template.mission_type;
      const points = template.points;
      const title = template.title;
      
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
            reviewType: template.review_type
          });
          cur.setDate(cur.getDate() + 1);
        }
      } else if (type === 'weekly') {
        const getMondayOfWeek = (dateStr: string) => {
          const date = new Date(dateStr);
          const day = date.getDay();
          const diff = day === 0 ? -6 : 1 - day;
          const monday = new Date(date);
          monday.setDate(date.getDate() + diff);
          monday.setHours(0, 0, 0, 0);
          return monday;
        };
        const firstMonday = getMondayOfWeek(batch.start_date);
        const weekOffset = rule.week_offset !== null ? rule.week_offset : 1;
        
        const publishDate = new Date(firstMonday);
        publishDate.setDate(firstMonday.getDate() + (weekOffset - 1) * 7);
        
        const deadlineDate = new Date(publishDate);
        deadlineDate.setDate(publishDate.getDate() + 6);
        
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
          reviewType: template.review_type
        });
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
          reviewType: template.review_type
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
          reviewType: template.review_type
        });
      }
    });
    
    return previews.sort((a, b) => a.date.localeCompare(b.date));
  };

  const handleCreatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petName) return;
    await onCreatePet({
      name: petName,
      description: petDesc,
      image_url: petImgUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=300',
      evolution_image_url: petEvoImgUrl || 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=300',
      unlock_score_threshold: Number(petUnlockThreshold)
    });
    setPetName('');
    setPetDesc('');
    setPetImgUrl('');
    setPetEvoImgUrl('');
    setPetUnlockThreshold(0);
    alert('寵物上架成功！');
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardTitle) return;
    await onCreateCard({
      title: cardTitle,
      description: cardDesc,
      element_type: cardElement,
      rarity: cardRarity,
      image_url: cardImgUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=300'
    });
    setCardTitle('');
    setCardDesc('');
    setCardImgUrl('');
    alert('卡牌建立成功！');
  };

  const handleCreateDeckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckName) return;
    const cardsToSubmit = Object.entries(selectedCards)
      .filter(([_, count]) => count > 0)
      .map(([cardId, count]) => ({ cardId, count }));
    
    if (cardsToSubmit.length === 0) {
      alert('請至少選擇一張卡牌放入排組！');
      return;
    }

    await onCreateDeck(deckName, true, cardsToSubmit);
    setDeckName('');
    setSelectedCards({});
    alert('預設排組建立成功！');
  };

  const handleCardCountChange = (cardId: string, amount: number) => {
    setSelectedCards(prev => {
      const current = prev[cardId] || 0;
      const next = Math.max(0, current + amount);
      return { ...prev, [cardId]: next };
    });
  };

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
            { key: 'mission_templates', label: '任務模板庫', icon: BookOpen },
            { key: 'batch_rules', label: '期數任務設定', icon: Sliders },
            { key: 'schedule_preview', label: '任務排程預覽', icon: Calendar },
            { key: 'tasks', label: '任務管理', icon: Calendar },
            { key: 'pets', label: '寵物配置', icon: Sparkles },
            { key: 'decks', label: '卡牌與排組', icon: Layers },
            { key: 'teams', label: '小隊分配', icon: UserPlus },
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
                        +{sub.mission?.points || tasks.find(t => t.id === sub.mission_id)?.score || 0} 修為
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
                      onClick={() => onReviewSubmission(sub.id, 'approved')}
                      disabled={isSyncing}
                      className="btn-action bg-emerald-500 hover:bg-emerald-600 text-slate-950 p-2.5 rounded-xl text-xs font-black flex items-center gap-1"
                    >
                      <Check size={14} />
                      同意加分
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
        <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
          <div className="flex justify-between items-center select-none">
            <h3 className="font-black text-white text-base">
              大會修行任務列表 ({tasks.length})
            </h3>
            <button
              onClick={() => setShowTaskModal(true)}
              className="btn-action bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1"
            >
              <Plus size={14} />
              建立新任務
            </button>
          </div>

          <div className="divide-y divide-white/5 max-h-96 overflow-y-auto light:divide-slate-200">
            {[...tasks].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).map(task => (
              <div key={task.id} className="py-4 flex justify-between items-center gap-4 first:pt-0 last:pb-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2 select-none">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                      task.type === 'daily' 
                        ? 'bg-amber-500/10 text-amber-500' 
                        : task.type === 'weekly' 
                        ? 'bg-purple-500/10 text-purple-400' 
                        : task.type === 'limited'
                        ? 'bg-rose-500/10 text-rose-400'
                        : 'bg-indigo-500/10 text-indigo-400'
                    }`}>
                      {task.type === 'daily' 
                        ? '每日定課' 
                        : task.type === 'weekly' 
                        ? '每週任務' 
                        : task.type === 'limited'
                        ? '限時任務'
                        : '特殊任務'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">
                      +{task.score} 分
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm mt-1">{task.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1 light:text-slate-500">{task.description}</p>
                </div>

                <button
                  onClick={() => onDeleteTask(task.id)}
                  disabled={isSyncing}
                  className="btn-action bg-slate-900 border border-white/5 hover:border-red-500/30 text-red-400 p-2 rounded-xl text-xs"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Create Task Modal */}
          {showTaskModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="glass-panel w-full max-w-md p-5 rounded-3xl border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200 light:bg-white light:border-slate-200 max-h-[85vh] overflow-y-auto scrollbar-thin">
                <div className="flex justify-between items-center mb-3 select-none">
                  <h3 className="text-base font-black text-white light:text-slate-900">
                    建立新修行任務
                  </h3>
                  <button 
                    type="button"
                    onClick={() => setShowTaskModal(false)}
                    className="p-1 rounded-full text-slate-400 hover:text-white light:hover:text-slate-900"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                <form onSubmit={handleCreateTask} className="space-y-3 text-left">
                  
                  {/* Group 1: 班次 */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest block select-none">
                      STEP 1. 梯次與期數設定
                    </span>
                    <div>
                      <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">
                        所屬期數 <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={taskBatchId}
                        onChange={e => handleBatchChange(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                      >
                        <option value="">請選擇期數...</option>
                        {batches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Group 2: 任務詳情 */}
                  <div className="space-y-2 pt-2.5 border-t border-white/5 light:border-slate-100">
                    <span className="text-[9px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest block select-none">
                      STEP 2. 任務內容詳情
                    </span>
                    <div>
                      <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">任務名稱</label>
                      <input
                        required
                        type="text"
                        value={taskName}
                        onChange={e => setTaskName(e.target.value)}
                        placeholder="例如：每日大笑與轉念"
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">描述說明</label>
                      <textarea
                        rows={2}
                        value={taskDesc}
                        onChange={e => setTaskDesc(e.target.value)}
                        placeholder="簡述任務實行步驟..."
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 select-none">
                      <div>
                        <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">任務類型</label>
                        <select
                          value={taskType}
                          onChange={e => handleTaskTypeChange(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                        >
                          <option value="daily">每日定課</option>
                          <option value="weekly">每週任務</option>
                          <option value="temporary">特殊任務</option>
                          <option value="limited">限時任務</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">獎勵修為分</label>
                        <input
                          required
                          type="number"
                          value={taskScore}
                          onChange={e => setTaskScore(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Group 3: 時間與審核 */}
                  <div className="space-y-2 pt-2.5 border-t border-white/5 light:border-slate-100">
                    <span className="text-[9px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest block select-none">
                      STEP 3. 時間與審核設定
                    </span>
                    <div className="grid grid-cols-2 gap-2.5 select-none">
                      <div>
                        <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">開始時間</label>
                        <input
                          required
                          type="datetime-local"
                          value={taskStartTime}
                          onChange={e => setTaskStartTime(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">截止時間</label>
                        <input
                          required
                          type="datetime-local"
                          value={taskEndTime}
                          onChange={e => setTaskEndTime(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-2 select-none p-2.5 rounded-xl bg-slate-900/40 border border-white/5 light:bg-slate-50 light:border-slate-200">
                      <input
                        type="checkbox"
                        id="reqProof"
                        checked={taskReqProof}
                        onChange={e => setTaskReqProof(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-red-500 focus:ring-red-500 mt-0.5 shrink-0 cursor-pointer"
                      />
                      <label htmlFor="reqProof" className="text-[10px] text-slate-300 light:text-slate-600 font-bold leading-normal cursor-pointer">
                        此任務打卡時需提供文字或連結證明 (需人工審核)
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2 select-none">
                    <button
                      type="button"
                      onClick={() => setShowTaskModal(false)}
                      className="flex-1 btn-action py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-800 transition-all light:bg-slate-100 light:border-slate-200 light:text-slate-600 light:hover:bg-slate-200 cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={isSyncing}
                      className="flex-1 btn-action py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-black shadow-md shadow-red-500/10 transition-all cursor-pointer"
                    >
                      確認發布
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ==================== 3. 小隊分配 ==================== */}
      {adminTab === 'teams' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 新增修行人員 / 小隊長 */}
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 light:bg-white light:border-slate-200">
              <h3 className="font-black text-white text-base select-none flex items-center gap-2">
                <UserPlus className="text-amber-500" size={18} />
                管理員新增修行者 / 小隊長
              </h3>
              <form onSubmit={handleAddProfileSubmit} className="space-y-4 select-none">
                <div>
                  <label className="block text-xs text-slate-405 font-bold mb-1.5">姓名</label>
                  <input
                    required
                    type="text"
                    value={newProfileName}
                    onChange={e => setNewProfileName(e.target.value)}
                    placeholder="輸入真實姓名"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-405 font-bold mb-1.5">手機號碼</label>
                  <input
                    required
                    type="tel"
                    value={newProfilePhone}
                    onChange={e => setNewProfilePhone(e.target.value)}
                    placeholder="輸入手機號碼"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-405 font-bold mb-1.5">指定期數</label>
                    <select
                      required
                      value={newProfileBatchId}
                      onChange={e => {
                        setNewProfileBatchId(e.target.value);
                        setNewProfileTeamId('');
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                    >
                      <option value="">請選擇...</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-405 font-bold mb-1.5">指定小隊</label>
                    <select
                      required
                      disabled={!newProfileBatchId}
                      value={newProfileTeamId}
                      onChange={e => setNewProfileTeamId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {!newProfileBatchId ? (
                        <option value="">請先選擇期數...</option>
                      ) : (
                        <>
                          <option value="">請選擇...</option>
                          {teams
                            .filter(t => t.batch_id === newProfileBatchId)
                            .map(t => (
                              <option key={t.id} value={t.id}>
                                {t.custom_name ? `${t.name} (${t.custom_name})` : t.name}
                              </option>
                            ))}
                        </>
                      )}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-405 font-bold mb-1.5">指定角色</label>
                  <select
                    value={newProfileRole}
                    onChange={e => setNewProfileRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                  >
                    <option value="captain">小隊長 (captain)</option>
                    <option value="student">一般學員 (student)</option>
                    <option value="admin">管理員 (admin)</option>
                  </select>
                </div>

                {newProfileError && (
                  <div className="text-red-500 text-xs font-bold bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-center">
                    {newProfileError}
                  </div>
                )}
                {newProfileSuccess && (
                  <div className="text-emerald-550 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center">
                    {newProfileSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSyncing}
                  className="btn-action bg-amber-500 hover:bg-amber-600 text-slate-950 py-3 px-6 rounded-xl text-xs font-black shadow-lg shadow-amber-500/10"
                >
                  新增修行者
                </button>
              </form>
            </section>

            {/* 角色與分配變更 */}
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 light:bg-white light:border-slate-200">
              <h3 className="font-black text-white text-base select-none">
                學員小隊分配與角色變更
              </h3>
              <form onSubmit={handleAssignTeamSubmit} className="space-y-4 select-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1.5">選擇期數 (Batch)</label>
                    <select
                      value={assignBatchId}
                      onChange={e => handleAssignBatchChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                    >
                      <option value="">請選擇期數...</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1.5">選擇小隊 (Team)</label>
                    <select
                      disabled={!assignBatchId}
                      value={assignTeamId}
                      onChange={e => setAssignTeamId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {!assignBatchId ? (
                        <option value="">請先選擇期數...</option>
                      ) : (
                        <>
                          <option value="">無 (獨立修行者)</option>
                          {teams
                            .filter(t => t.batch_id === assignBatchId)
                            .map(t => (
                              <option key={t.id} value={t.id}>
                                {t.custom_name ? `${t.name} (${t.custom_name})` : t.name}
                              </option>
                            ))}
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1.5">選擇修行者 (Practitioner)</label>
                    <select
                      required
                      disabled={!assignBatchId}
                      value={assignStudentId}
                      onChange={e => {
                        const studentId = e.target.value;
                        setAssignStudentId(studentId);
                        const profile = profiles.find(p => p.id === studentId);
                        if (profile) {
                          setAssignRole(profile.role);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {!assignBatchId ? (
                        <option value="">請先選擇期數...</option>
                      ) : (
                        <>
                          <option value="">請選擇...</option>
                          {profiles
                            .filter(p => p.batch_id === assignBatchId || !p.batch_id)
                            .map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.role === 'admin' ? '大隊長' : p.role === 'captain' ? '小隊長' : '學員'})
                              </option>
                            ))}
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1.5">變更角色 (Role)</label>
                    <select
                      disabled={!assignBatchId || !assignStudentId}
                      value={assignRole}
                      onChange={e => setAssignRole(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="student">學員 (student)</option>
                      <option value="captain">小隊長 (captain)</option>
                      <option value="admin">大隊長 (admin)</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSyncing || !assignStudentId || !assignBatchId}
                  className="btn-action bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-xl text-xs font-black shadow-lg shadow-red-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  儲存分配變更
                </button>
              </form>
            </section>
          </div>

          {/* Roster list overview */}
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-3 light:bg-white light:border-slate-200">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest select-none">
              目前名冊概覽
            </h4>
            <div className="bg-slate-950/60 border border-white/5 rounded-2xl overflow-hidden light:bg-slate-55 light:border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-505 font-bold uppercase light:border-slate-200 select-none">
                    <th className="p-3">姓名</th>
                    <th className="p-3">手機</th>
                    <th className="p-3">角色</th>
                    <th className="p-3">所屬班次</th>
                    <th className="p-3">所屬分隊</th>
                    <th className="p-3 text-right">當前修為</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 light:divide-slate-200">
                  {profiles.map(p => {
                    const team = teams.find(t => t.id === p.team_id);
                    const batch = batches.find(b => b.id === p.batch_id);
                    return (
                      <tr key={p.id}>
                        <td className="p-3 font-bold text-white">{p.name}</td>
                        <td className="p-3 text-slate-400 light:text-slate-600 font-mono">{p.phone || '—'}</td>
                        <td className="p-3 text-slate-400 light:text-slate-600 select-none">
                          {p.role === 'admin' ? '🔴 大隊長' : p.role === 'captain' ? '🟡 小隊長' : '🟢 學員'}
                        </td>
                        <td className="p-3 text-slate-400 light:text-slate-600 select-none">{batch ? batch.name : '—'}</td>
                        <td className="p-3 text-slate-400 light:text-slate-600 select-none">
                          {team ? (team.custom_name ? `${team.name} (${team.custom_name})` : team.name) : '—'}
                        </td>
                        <td className="p-3 text-right font-black text-amber-500 select-none">{p.score.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ==================== 4. 手動調分 ==================== */}
      {adminTab === 'adjust' && (
        <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 light:bg-white light:border-slate-200">
          <h3 className="font-black text-white text-base select-none">
            手動增減個別學員分數
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
                  <option key={p.id} value={p.id}>{p.name} (分數：{p.score})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5">調整金額 (正負皆可)</label>
                <input
                  required
                  type="number"
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(Number(e.target.value))}
                  placeholder="例如：500 或 -200"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-1.5 pt-6 leading-relaxed">
                  ※ 扣分請輸入負值，如 -200
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
      )}

      {/* ==================== 5. 公告/課程/成就管理 ==================== */}
      {adminTab === 'others' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 select-none">
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
                  onChange={e => setAnnBatchId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                >
                  <option value="">請選擇期數...</option>
                  <option value="all">全體期數 (系統公告)</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
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
              <button
                type="submit"
                disabled={isSyncing || !annBatchId}
                className="w-full btn-action py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                發布公告
              </button>
            </form>
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
                <h4 className="text-[10px] text-slate-400 font-bold mb-2">已發布課程列表 ({courses.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {courses.map(course => {
                    const batch = batches.find(b => b.id === course.batch_id);
                    return (
                      <div key={course.id} className="flex justify-between items-center text-[11px] p-2 rounded bg-slate-950/40 border border-white/5 light:bg-slate-50 light:border-slate-200">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-bold text-white truncate light:text-slate-800" title={course.name}>{course.name}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            {course.class_date} | {batch ? batch.name : '全體期數'}
                          </p>
                          {course.register_url && (
                            <p className="text-[9px] text-purple-400 truncate mt-0.5" title={course.register_url}>
                              連結: {course.register_url}
                            </p>
                          )}
                        </div>
                        {onDeleteCourse && (
                          <button
                            type="button"
                            onClick={() => onDeleteCourse(course.id)}
                            disabled={isSyncing}
                            className="text-red-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
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
              建立修為成就
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
              <input
                required
                type="number"
                value={achValue}
                onChange={e => setAchValue(Number(e.target.value))}
                placeholder="所需修為分數門檻"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
              />
              <button
                type="submit"
                disabled={isSyncing}
                className="w-full btn-action py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black"
              >
                建立成就
              </button>
            </form>
          </section>

          {/* Cohorts */}
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
                placeholder="班次名稱 (如: NLP台中50期)"
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
              <button
                type="submit"
                disabled={isSyncing}
                className="w-full btn-action py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black"
              >
                開班並設定時間
              </button>
            </form>
          </section>
        </div>
      )}

      {/* ==================== 寵物配置分頁 ==================== */}
      {adminTab === 'pets' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none">
            {/* 上架新寵物 */}
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 md:col-span-1">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Sparkles size={16} className="text-red-500" />
                上架新寵物
              </h3>
              <form onSubmit={handleCreatePet} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1">寵物名稱</label>
                  <input
                    required
                    type="text"
                    value={petName}
                    onChange={e => setPetName(e.target.value)}
                    placeholder="例如：卓越靜心靈貓"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1">寵物敘述</label>
                  <textarea
                    rows={2}
                    value={petDesc}
                    onChange={e => setPetDesc(e.target.value)}
                    placeholder="輸入寵物介紹與遊戲化描述..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1">解鎖修為門檻</label>
                  <input
                    required
                    type="number"
                    value={petUnlockThreshold}
                    onChange={e => setPetUnlockThreshold(Number(e.target.value))}
                    placeholder="解鎖所需的分數門檻"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1">幼體外觀圖片網址 (選填)</label>
                  <input
                    type="text"
                    value={petImgUrl}
                    onChange={e => setPetImgUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1">進化外觀圖片網址 (選填)</label>
                  <input
                    type="text"
                    value={petEvoImgUrl}
                    onChange={e => setPetEvoImgUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="w-full btn-action py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black"
                >
                  確認上架寵物
                </button>
              </form>
            </section>

            {/* 系統現有寵物列表 */}
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 md:col-span-2">
              <h3 className="font-black text-white text-base">
                🐉 目前系統寵物圖鑑 ({pets?.length || 0})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                {pets?.map(pet => (
                  <div key={pet.id} className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl flex gap-3 light:bg-slate-50 light:border-slate-300">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-slate-900">
                      <img src={pet.image_url} alt={pet.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-white text-sm">{pet.name}</h4>
                        <span className="text-[9px] font-black bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded">
                          {pet.unlock_score_threshold} 分解鎖
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed light:text-slate-600">{pet.description}</p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[9px] text-slate-500">進化體預覽：</span>
                        <a href={pet.evolution_image_url} target="_blank" rel="noreferrer" className="text-[9px] text-amber-500 hover:underline">查看進化圖</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* 全班學員寵物培育狀態 */}
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
            <h3 className="font-black text-white text-base select-none">
              🎓 學員寵物培育進度總覽 ({userPets?.length || 0})
            </h3>
            <div className="bg-slate-950/60 border border-white/5 rounded-2xl overflow-hidden light:bg-slate-50 light:border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 font-bold uppercase light:border-slate-200 select-none">
                    <th className="p-3">學員姓名</th>
                    <th className="p-3">當前修為</th>
                    <th className="p-3">契合寵物</th>
                    <th className="p-3 text-center">寵物等級</th>
                    <th className="p-3 text-center">契裝外觀</th>
                    <th className="p-3 text-right">寵物培育操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 light:divide-slate-200">
                  {userPets?.map(up => (
                    <tr key={up.id}>
                      <td className="p-3 font-bold text-white">{up.profile?.name || '未知學員'}</td>
                      <td className="p-3 text-amber-500 font-black">{up.profile?.score?.toLocaleString()}</td>
                      <td className="p-3 font-bold text-slate-300 light:text-slate-800">{up.pet?.name || '無'}</td>
                      <td className="p-3 text-center font-black text-indigo-400 select-none">LV. {up.pet_level}</td>
                      <td className="p-3 text-center text-slate-400 light:text-slate-600">{up.current_skin || '預設'}</td>
                      <td className="p-3 text-right space-x-2 select-none">
                        <button
                          onClick={async () => {
                            const skinName = prompt('請輸入要贈送給該學員的特殊裝扮名稱：', '光之冠冕');
                            if (skinName) {
                              await onAwardPetSkin(up.student_id, up.pet_id, skinName);
                            }
                          }}
                          className="btn-action px-2 py-1 bg-slate-900 border border-white/5 text-[10px] rounded hover:border-amber-500/30 text-amber-400 font-black light:bg-slate-100 light:border-slate-300"
                        >
                          贈送外觀
                        </button>
                        <button
                          onClick={async () => {
                            await onLevelUpPet(up.id);
                          }}
                          className="btn-action px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] rounded font-black"
                        >
                          手動升級
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(userPets?.length || 0) === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                        目前尚無學員解鎖或擁有寵物。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ==================== 卡牌與排組分頁 ==================== */}
      {adminTab === 'decks' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none">
            {/* 建立新卡牌 */}
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 md:col-span-1">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Layers size={16} className="text-red-500" />
                建立新卡牌
              </h3>
              <form onSubmit={handleCreateCard} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1">卡牌稱號</label>
                  <input
                    required
                    type="text"
                    value={cardTitle}
                    onChange={e => setCardTitle(e.target.value)}
                    placeholder="例如：卓越心錨卡"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1">卡牌加成說明</label>
                  <textarea
                    required
                    rows={2}
                    value={cardDesc}
                    onChange={e => setCardDesc(e.target.value)}
                    placeholder="如：每日定課修為加成 10%"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1">屬性</label>
                    <select
                      value={cardElement}
                      onChange={e => setCardElement(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                    >
                      <option value="water">水屬性 (調和)</option>
                      <option value="fire">火屬性 (爆發)</option>
                      <option value="wind">風屬性 (身捷)</option>
                      <option value="earth">地屬性 (穩重)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1">稀有度</label>
                    <select
                      value={cardRarity}
                      onChange={e => setCardRarity(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                    >
                      <option value="N">N</option>
                      <option value="R">R</option>
                      <option value="SR">SR</option>
                      <option value="SSR">SSR</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1">卡面圖片連結 (選填)</label>
                  <input
                    type="text"
                    value={cardImgUrl}
                    onChange={e => setCardImgUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="w-full btn-action py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black"
                >
                  確認建立卡牌
                </button>
              </form>
            </section>

            {/* 建立預設排組 */}
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 md:col-span-2">
              <h3 className="font-black text-white text-base">
                🛡️ 配置系統預設套牌 (Deck Templates)
              </h3>
              <form onSubmit={handleCreateDeckSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1">套牌名稱</label>
                  <input
                    required
                    type="text"
                    value={deckName}
                    onChange={e => setDeckName(e.target.value)}
                    placeholder="例如：新手必備定課加速流"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-2">挑選卡牌放入排組</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                    {cards?.map(card => {
                      const count = selectedCards[card.id] || 0;
                      return (
                        <div key={card.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                                card.rarity === 'SSR' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                              }`}>{card.rarity}</span>
                              <span className="font-bold text-xs text-white">{card.title}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{card.description}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCardCountChange(card.id, -1)}
                              className="w-6 h-6 rounded bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center hover:text-white"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold text-white min-w-4 text-center">{count}</span>
                            <button
                              type="button"
                              onClick={() => handleCardCountChange(card.id, 1)}
                              className="w-6 h-6 rounded bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center hover:text-white"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSyncing}
                  className="w-full btn-action py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black"
                >
                  儲存並發布預設排組
                </button>
              </form>
            </section>
          </div>

          {/* 現有卡牌與排組預覽 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
            {/* 卡牌庫 */}
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
              <h3 className="font-black text-white text-base">
                🃏 系統現有卡牌庫 ({cards?.length || 0})
              </h3>
              <div className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                {cards?.map(card => (
                  <div key={card.id} className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden group">
                    <div className="h-28 w-full bg-slate-900 relative">
                      <img src={card.image_url} alt={card.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-85 transition-opacity" />
                      <div className="absolute top-2 left-2 flex gap-1 items-center">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded shadow ${
                          card.rarity === 'SSR' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-white'
                        }`}>{card.rarity}</span>
                        <span className="text-[8px] font-bold bg-slate-900/80 px-1 py-0.5 rounded text-slate-300">{card.element_type.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="font-bold text-white text-xs">{card.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">{card.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 系統預設排組 */}
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
              <h3 className="font-black text-white text-base">
                🛡️ 發布套牌範本 ({decks?.length || 0})
              </h3>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {decks?.map(deck => {
                  // Find all deck cards in this deck
                  const cardsInDeck = deckCards?.filter(dc => dc.deck_id === deck.id) || [];
                  return (
                    <div key={deck.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-white text-sm">🛡️ {deck.name}</h4>
                        <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          範本套牌
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-1">
                        {cardsInDeck.map(dc => (
                          <div key={dc.id} className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px] text-slate-300 flex items-center gap-1">
                            <span className="font-bold text-amber-500">{dc.card?.title || '卡牌'}</span>
                            <span className="text-slate-500">x{dc.count}</span>
                          </div>
                        ))}
                        {cardsInDeck.length === 0 && (
                          <p className="text-[10px] text-slate-600">此套牌未配置任何卡牌。</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ==================== 期數管理分頁 ==================== */}
      {adminTab === 'batches' && (
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
                  placeholder="例如：NLP初階50期"
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
                  min="1"
                  max="20"
                  value={newBatchTeamCount}
                  onChange={e => setNewBatchTeamCount(Number(e.target.value))}
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
                    <th className="p-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 light:divide-slate-200">
                  {batches.map(batch => {
                    const isEditing = editingBatchId === batch.id;
                    const teamCount = teams.filter(t => t.batch_id === batch.id).length;
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
                                min="1"
                                max="20"
                                value={editBatchTeamCount}
                                onChange={e => setEditBatchTeamCount(Number(e.target.value))}
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
                                batch.status === 'active' 
                                  ? 'bg-emerald-500/10 text-emerald-400' 
                                  : batch.status === 'draft'
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {batch.status === 'active' 
                                  ? '進行中' 
                                  : batch.status === 'draft'
                                  ? '草稿'
                                  : '已結束'}
                              </span>
                            </td>
                            <td className="p-3 text-right select-none">
                              <button
                                onClick={() => startEditBatch(batch)}
                                className="px-2 py-1 bg-slate-900 border border-white/5 text-[10px] rounded hover:border-amber-500/30 text-amber-400 font-bold light:bg-slate-100 light:border-slate-300 cursor-pointer"
                              >
                                編輯期數
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {batches.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                        目前尚無任何課程期數。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ==================== 任務模板庫分頁 ==================== */}
      {adminTab === 'mission_templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300 text-left">
          {/* 新增任務模板表單 */}
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 lg:col-span-1 select-none">
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

          {/* 任務模板列表與編輯區 */}
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 lg:col-span-2">
            <h3 className="font-black text-white text-base select-none light:text-slate-900">
              預設任務模板列表 ({missionTemplates.length})
            </h3>
            <div className="bg-slate-950/60 border border-white/5 rounded-2xl overflow-hidden light:bg-slate-50 light:border-slate-300">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 font-bold uppercase light:border-slate-200 select-none">
                      <th className="p-3 w-1/4">模板名稱</th>
                      <th className="p-3 w-1/3">任務說明</th>
                      <th className="p-3 text-center">類型</th>
                      <th className="p-3 text-center">分數</th>
                      <th className="p-3 text-center">審核</th>
                      <th className="p-3 text-center">狀態</th>
                      <th className="p-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 light:divide-slate-200">
                    {missionTemplates.map(template => {
                      const isEditing = editingTemplateId === template.id;
                      return (
                        <tr key={template.id} className="hover:bg-white/[0.01] light:hover:bg-slate-100/30">
                          {isEditing ? (
                            <>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={editTemplateTitle}
                                  onChange={e => setEditTemplateTitle(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 text-xs outline-none"
                                />
                              </td>
                              <td className="p-2">
                                <textarea
                                  rows={2}
                                  value={editTemplateDesc}
                                  onChange={e => setEditTemplateDesc(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 text-xs outline-none resize-none"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <select
                                  value={editTemplateType}
                                  onChange={e => setEditTemplateType(e.target.value as any)}
                                  className="bg-slate-950 border border-slate-800 text-white rounded p-1.5 text-xs outline-none"
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
                                  className="w-16 bg-slate-950 border border-slate-800 text-white rounded p-1.5 text-xs text-center outline-none"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <select
                                  value={editTemplateReviewType}
                                  onChange={e => setEditTemplateReviewType(e.target.value as 'auto' | 'leader' | 'admin')}
                                  className="bg-slate-950 border border-slate-800 text-white rounded p-1 text-xs outline-none"
                                >
                                  <option value="auto">免</option>
                                  <option value="leader">隊長</option>
                                  <option value="admin">管理</option>
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
                              <td className="p-3 font-bold text-white light:text-slate-900">{template.title}</td>
                              <td className="p-3 text-slate-300 light:text-slate-700">{template.description}</td>
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
                              <td className="p-3 text-center select-none">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                  template.is_active
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {template.is_active ? '啟用中' : '已停用'}
                                </span>
                              </td>
                              <td className="p-3 text-right select-none">
                                <button
                                  onClick={() => startEditTemplate(template)}
                                  className="px-2 py-1 bg-slate-900 border border-white/5 text-[10px] rounded hover:border-amber-500/30 text-amber-400 font-bold light:bg-slate-100 light:border-slate-300"
                                >
                                  編輯模板
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {missionTemplates.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
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
      )}

      {/* ==================== 期數任務設定分頁 ==================== */}
      {adminTab === 'batch_rules' && (
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
                      {missionTemplates.filter(t => t.is_active).map(template => {
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
                                    <span className="text-slate-500 font-bold select-none">無需額外設定 (比賽期間內限做一次)</span>
                                  )}
                                  
                                  {template.mission_type === 'weekly' && (
                                    <div className="flex items-center gap-2">
                                       <span className="text-slate-400 light:text-slate-600 font-bold">於活動第</span>
                                      <select
                                        value={localRule.week_offset ?? 1}
                                        onChange={e => updateLocalRuleField(template.id, 'week_offset', Number(e.target.value))}
                                        className="bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs outline-none focus:border-red-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900 font-bold"
                                      >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(w => (
                                          <option key={w} value={w}>{w}</option>
                                        ))}
                                      </select>
                                      <span className="text-slate-400 light:text-slate-600 font-bold">週的禮拜一上架，當週結束關閉</span>
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
                                          onChange={e => updateLocalRuleField(template.id, 'day_offset', Number(e.target.value))}
                                          className="w-16 shrink-0 bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs text-center outline-none focus:border-red-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900 font-mono"
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
                                          onChange={e => updateLocalRuleField(template.id, 'duration_days', Number(e.target.value))}
                                          className="w-16 shrink-0 bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs text-center outline-none focus:border-red-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900 font-mono"
                                        />
                                        <span className="text-slate-400 light:text-slate-600 font-bold">天</span>
                                      </div>
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
                儲存此期數任務設定
              </button>
            </form>
          ) : (
            <div className="p-8 text-center text-slate-500 font-bold select-none">
              請在右上角選取一個課程期數以載入配置介面。
            </div>
          )}
        </div>
      )}

      {/* ==================== 任務排程預覽分頁 ==================== */}
      {adminTab === 'schedule_preview' && (
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

          {selectedPreviewBatchId ? (() => {
            const previewData = getSchedulePreview(selectedPreviewBatchId);
            return (
              <div className="space-y-4">
                {previewData.length > 0 && (
                  <div className="flex justify-end select-none">
                    <button
                      onClick={async () => {
                        if (onGenerateMissions) {
                          const res = await onGenerateMissions(selectedPreviewBatchId, previewData);
                          alert(`🎉 任務產生完成！\n成功產生：${res.successCount} 筆\n跳過重複：${res.skipCount} 筆`);
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
                            <td className="p-3 text-slate-400 light:text-slate-600 font-mono">{item.publishAt}</td>
                            <td className="p-3 text-slate-400 light:text-slate-600 font-mono">{item.deadlineAt}</td>
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
      )}

    </div>
  );
}

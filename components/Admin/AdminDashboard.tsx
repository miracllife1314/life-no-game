'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Profile, Team, Task, Submission, 
  Course, Achievement, Announcement, UserRole, TaskType, TaskTargetType,
  Pet, UserPet, PetLine, PetStage, PetEvolutionLog, Card, Deck, DeckCard, UserDeck, Batch, MissionTemplate, BatchMissionTemplate, CaptainCandidate, StudentNote, SquadRoleDef
} from '@/types';
import { 
  ShieldCheck, FileCheck, Calendar, Trophy, 
  UserPlus, Sliders, Check, X, Plus, Trash2, Edit2,
  TrendingUp, Megaphone, HelpCircle, Save,
  Sparkles, Layers, BookOpen, Upload, Image as ImageIcon, AlertCircle, Shield, Settings, Users
} from 'lucide-react';
import { supabase, isRealSupabase } from '@/lib/supabase';
import { parsePetOffset, trimCenterSquare } from '@/lib/petImage';

export const MISSION_CATEGORIES = ['初階', '進階', 'VIP', '期數任務', '神獸進化'];

const QUEST_ROLES_DEFS = [
  { id: 'role-lantern', name: '提燈人', duties: ['協助引導隊員打卡', '記錄分享會要點'] },
  { id: 'role-dawn', name: '破曉行者', duties: ['帶頭進行每日打卡', '每日分享轉念心法'] },
  { id: 'role-guardian', name: '金剛護法', duties: ['維護學習紀律', '協助解答技術問題'] }
];

const DEFAULT_CHARACTERS: Record<string, string> = {
  '劉定洋': '如來佛祖(大隊長)',
  '張品嬋': '嫦娥(抱抱)',
  '胡俊宇': '觀音菩薩(副隊長)',
  '莊俊琦': '哪吒(衝衝)',
  '許特龍': '豬八戒(樂樂)',
  '郭炫妙': '沙悟淨(踏實)',
  '沈又希': '提燈人(小隊長)',
  '林玉庭': '降龍羅漢(自律)',
  '陳振揚': '伏虎羅漢(敏銳)',
  '曾浩程': '托塔天王(大氣)',
  '蕭意儒': '麻姑獻壽(親和)',
  '鄭群譯': '二郎神(透視)',
};

export const ANNOUNCEMENT_TEMPLATES = [
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

export const COURSE_TEMPLATES = [
  {
    id: 'course_basic',
    name: '📖 基礎人性溝通術',
    courseName: '📖 基礎人性溝通術',
    description: '學習基礎人性溝通概念，奠定良好的修行基礎。'
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

  // Roster Tab State
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterBatchFilter, setRosterBatchFilter] = useState('all');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingProfileData, setEditingProfileData] = useState<Partial<Profile>>({});

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
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showApplyConfirmModal, setShowApplyConfirmModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('daily');
  const [taskScore, setTaskScore] = useState(100);
  const [taskReqProof, setTaskReqProof] = useState(true);
  const [taskCategory, setTaskCategory] = useState<string>('初階');
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

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
  
  // --- Quick Captain Assignment State ---
  const [quickBatchId, setQuickBatchId] = useState('');
  const [quickCaptainId, setQuickCaptainId] = useState('');
  const [quickTeamId, setQuickTeamId] = useState('');
  const [quickDirectorId, setQuickDirectorId] = useState('');
  const [assignRole, setAssignRole] = useState<UserRole>('student');
  const [assignDivisionName, setAssignDivisionName] = useState('');
  const [assignDirectorId, setAssignDirectorId] = useState('');
  const [assignStatus, setAssignStatus] = useState<'active' | 'ended' | 'inactive'>('active');

  // --- Role Assignment & Notes State ---
  const [adminNoteText, setAdminNoteText] = useState('');
  const [squadRolesMap, setSquadRolesMap] = useState<Record<string, string[]>>({});

  const [roleSettingStudentId, setRoleSettingStudentId] = useState('');

  // When roleSettingStudentId changes, load note and roles
  React.useEffect(() => {
    if (roleSettingStudentId) {
      const student = profiles.find(p => p.id === roleSettingStudentId);
      // Load Note
      if (student && currentUserId) {
        const note = notes.find(n => n.student_id === roleSettingStudentId && n.captain_id === currentUserId)?.note || '';
        setAdminNoteText(note);
      } else {
        setAdminNoteText('');
      }

      // Load Roles from localStorage
      if (student && student.team_id) {
        const key = `nlp_captain_settings_${student.team_id}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.squadRoles) {
              setSquadRolesMap(parsed.squadRoles);
            } else {
              setSquadRolesMap({});
            }
          } catch (e) {
            setSquadRolesMap({});
          }
        } else {
          setSquadRolesMap({});
        }
      } else {
        setSquadRolesMap({});
      }
    }
  }, [roleSettingStudentId, profiles, notes, currentUserId]);

  const handleAdminNoteBlur = async () => {
    if (!roleSettingStudentId || !onSaveNote) return;
    try {
      await onSaveNote(roleSettingStudentId, adminNoteText);
    } catch (err) {
      console.error('Error saving note:', err);
    }
  };

  const handleAdminRoleChange = (roleId: string) => {
    if (!roleSettingStudentId) return;
    const student = profiles.find(p => p.id === roleSettingStudentId);
    if (!student || !student.team_id) return;
    
    const nextSquadRoles = { ...squadRolesMap };
    if (roleId) {
      nextSquadRoles[roleSettingStudentId] = [roleId];
    } else {
      delete nextSquadRoles[roleSettingStudentId];
    }
    setSquadRolesMap(nextSquadRoles);
    
    // Save to localStorage immediately
    const key = `nlp_captain_settings_${student.team_id}`;
    const stored = localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : {};
    parsed.squadRoles = nextSquadRoles;
    localStorage.setItem(key, JSON.stringify(parsed));
  };

  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [announcementFilterBatch, setAnnouncementFilterBatch] = useState<string>('all');
  const [courseFilterBatch, setCourseFilterBatch] = useState<string>('all');

  // --- Add Profile Form State ---
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePhone, setNewProfilePhone] = useState('');
  const [newProfileBatchId, setNewProfileBatchId] = useState('');
  const [newProfileTeamId, setNewProfileTeamId] = useState('');
  const [newProfileRole, setNewProfileRole] = useState<UserRole>('captain');
  const [newProfileDivisionName, setNewProfileDivisionName] = useState('');
  const [newProfileDirectorId, setNewProfileDirectorId] = useState('');
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
          teamId: newProfileTeamId,
          divisionName: newProfileRole === 'admin' ? newProfileDivisionName.trim() : null,
          directorId: newProfileRole === 'captain' ? newProfileDirectorId : null
        });
        setNewProfileSuccess(`🎉 成功新增 ${newProfileRole === 'captain' ? '小隊長' : newProfileRole === 'admin' ? '大隊長' : '學員'}：${newProfileName}`);
        setNewProfileName('');
        setNewProfilePhone('');
        setNewProfileBatchId('');
        setNewProfileTeamId('');
        setNewProfileRole('captain');
        setNewProfileDivisionName('');
        setNewProfileDirectorId('');
      } catch (err: any) {
        setNewProfileError(err.message || '新增失敗');
      }
    }
  };

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

  const handleQuickAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBatchId || !quickCaptainId || !quickTeamId || !onQuickAssignCaptain) return;
    try {
      await onQuickAssignCaptain(quickBatchId, quickCaptainId, quickTeamId, quickDirectorId || null);
      setQuickCaptainId('');
      setQuickTeamId('');
      setQuickDirectorId('');
    } catch (err: any) {
      console.error(err);
      alert(err.message || '指派小隊長失敗');
    }
  };

  // --- Score adjust State ---
  const [adjustStudentId, setAdjustStudentId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState<string>('100');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustMessage, setAdjustMessage] = useState('');

  // --- Divine Beast Edit State ---
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editStageName, setEditStageName] = useState('');
  const [editAnimationType, setEditAnimationType] = useState('animate-pulse');
  const [editGlowColor, setEditGlowColor] = useState('#A855F7');
  const [editDescription, setEditDescription] = useState('');
  const [editEvolutionText, setEditEvolutionText] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editMinLevel, setEditMinLevel] = useState(0);
  const [editMaxLevel, setEditMaxLevel] = useState(99);
  const [editStageActive, setEditStageActive] = useState(true);

  // --- Divine Beast Image Upload State & Handlers ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [bgWarning, setBgWarning] = useState('');

  const checkImageTransparency = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(true);
            return;
          }
          ctx.drawImage(img, 0, 0);
          try {
            const w = img.width;
            const h = img.height;
            const corners = [
              ctx.getImageData(0, 0, 1, 1).data,
              ctx.getImageData(w - 1, 0, 1, 1).data,
              ctx.getImageData(0, h - 1, 1, 1).data,
              ctx.getImageData(w - 1, h - 1, 1, 1).data
            ];
            const hasOpaqueCorner = corners.some(pixel => pixel[3] === 255);
            resolve(!hasOpaqueCorner);
          } catch (e) {
            resolve(true);
          }
        };
        img.onerror = () => resolve(true);
      };
      reader.onerror = () => resolve(true);
    });
  };

  const compressAndConvertToWebP = (file: File): Promise<{ blob: Blob; base64: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1024;
          let width = img.width;
          let height = img.height;

          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            } else {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('無法建立 2D 繪圖環境'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to WebP base64
          const base64 = canvas.toDataURL('image/webp', 0.9);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ blob, base64 });
              } else {
                reject(new Error('圖片壓縮 Blob 轉換失敗'));
              }
            },
            'image/webp',
            0.9
          );
        };
        img.onerror = () => reject(new Error('圖片載入失敗'));
      };
      reader.onerror = () => reject(new Error('圖片讀取失敗'));
    });
  };

  const resizeAndKeepPNG = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 512;
          let width = img.width;
          let height = img.height;

          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            } else {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('無法建立 2D 繪圖環境'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to compressed WebP base64 to save localStorage space
          const base64 = canvas.toDataURL('image/webp', 0.8);
          resolve(base64);
        };
        img.onerror = () => reject(new Error('圖片載入失敗'));
      };
      reader.onerror = () => reject(new Error('圖片讀取失敗'));
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log("selected image:", file);

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('圖片大小不可超過 10MB');
      return;
    }

    // Validate type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('僅支援 PNG、JPG、JPEG 或 WEBP 格式');
      return;
    }

    setUploadError('');
    setBgWarning('');
    setIsUploadingImage(true);

    try {
      // Check transparency warning first
      const isTransparent = await checkImageTransparency(file);
      if (!isTransparent) {
        setBgWarning('此圖片可能不是透明背景，建議先使用去背工具或重新上傳透明 PNG。');
      }

      // 上傳前：裁切主體 + 置中到方形畫布（透明圖才有效，非透明圖則沿用原檔）
      const objUrl = URL.createObjectURL(file);
      const processed = await trimCenterSquare(objUrl);
      URL.revokeObjectURL(objUrl);

      if (isRealSupabase) {
        // Real Supabase Storage Upload
        const uploadBody: Blob = processed || file;
        const fileExt = processed ? 'png' : (file.name.split('.').pop() || 'png');
        const contentType = processed ? 'image/png' : file.type;
        const fileName = `stage-${editingStageId || 'new'}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload file to 'pet-images' bucket
        const { error: uploadError } = await supabase.storage
          .from('pet-images')
          .upload(filePath, uploadBody, {
            contentType,
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('pet-images')
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          setEditImageUrl(urlData.publicUrl);
        } else {
          throw new Error('無法取得公開網址');
        }
      } else {
        // Mock Mode: 用裁切置中後的圖（若有），否則沿用原本壓縮
        if (processed) {
          const base64 = await new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.readAsDataURL(processed);
          });
          setEditImageUrl(base64);
        } else {
          const pngBase64 = await resizeAndKeepPNG(file);
          setEditImageUrl(pngBase64);
        }
      }
    } catch (err: any) {
      console.error('圖片上傳與壓縮失敗:', err);
      setUploadError(err.message || '圖片上傳與壓縮失敗，請重試');
    } finally {
      setIsUploadingImage(false);
      // Reset input value
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setEditImageUrl('');
    setUploadError('');
    setBgWarning('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- Divine Beast Line Edit State ---
  const [petSubTab, setPetSubTab] = useState<'stages' | 'lines' | 'progress'>('stages');
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editLineName, setEditLineName] = useState('');
  const [editLineDesc, setEditLineDesc] = useState('');
  const [editLineTraits, setEditLineTraits] = useState('');
  const [editLineActive, setEditLineActive] = useState(true);
  const [editLineUnlockLevel, setEditLineUnlockLevel] = useState(5);
  const [editLineTaskTemplateId, setEditLineTaskTemplateId] = useState<string | null>(null);
  const [editLineSortOrder, setEditLineSortOrder] = useState(1);
  const [progressBatchId, setProgressBatchId] = useState('all');
  const [editLineTaskTitle, setEditLineTaskTitle] = useState('');
  const [editLineTaskDesc, setEditLineTaskDesc] = useState('');
  const [editLineTaskPoints, setEditLineTaskPoints] = useState<number>(500);
  const [editLineTaskReviewType, setEditLineTaskReviewType] = useState<'auto' | 'leader' | 'admin'>('leader');
  const [editLineTaskMaxCompletions, setEditLineTaskMaxCompletions] = useState<number>(1);
  const [editLineTaskActive, setEditLineTaskActive] = useState<boolean>(true);

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
  const [achValue, setAchValue] = useState(5000);
  const [achIconUrl, setAchIconUrl] = useState<string | null>(null);
  // 編輯既有成就
  const [editingAchId, setEditingAchId] = useState<string | null>(null);
  const [editAchTitle, setEditAchTitle] = useState('');
  const [editAchDesc, setEditAchDesc] = useState('');
  const [editAchValue, setEditAchValue] = useState(5000);
  const [editAchIconUrl, setEditAchIconUrl] = useState<string | null>(null);
  const handleStartEditAch = (ach: Achievement) => {
    setEditingAchId(ach.id);
    setEditAchTitle(ach.title);
    setEditAchDesc(ach.description || '');
    setEditAchValue(ach.condition_value);
    setEditAchIconUrl(ach.icon_url || null);
  };
  const handleCancelEditAch = () => setEditingAchId(null);
  const handleSaveEditAch = async (id: string) => {
    if (onUpdateAchievement) {
      await onUpdateAchievement(id, {
        title: editAchTitle,
        description: editAchDesc || null,
        condition_value: Number(editAchValue),
        icon_url: editAchIconUrl || 'Flame',
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
  const handleStartEditCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setEditCourseName(course.name);
    setEditCourseDesc(course.description || '');
    setEditCourseDate(course.class_date || '');
    setEditCourseBatchId(course.batch_id || '');
    setCourseRegisterUrl(course.register_url || '');
  };
  const handleCancelEditCourse = () => setEditingCourseId(null);
  const handleSaveEditCourse = async (id: string) => {
    if (onUpdateCourse) {
      await onUpdateCourse(id, {
        name: editCourseName,
        description: editCourseDesc || null,
        class_date: editCourseDate,
        batch_id: editCourseBatchId || null,
        register_url: editCourseRegisterUrl || null
      });
    }
    setEditingCourseId(null);
  };

  // --- Handlers ---
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName) return;

    // 立即關閉對話框並清空輸入，避免非同步載入重渲染時閃爍
    const currentTaskData = {
      name: taskName,
      description: taskDesc,
      type: taskType,
      score: Number(taskScore),
      requires_approval: taskReqProof,
      requires_proof: taskReqProof,
      publish_time: new Date().toISOString(),
      start_time: new Date(taskStartTime).toISOString(),
      end_time: new Date(taskEndTime).toISOString(),
      target_type: 'all' as TaskTargetType,
      target_team_id: null,
      target_user_id: null,
      batch_id: taskBatchId || null,
      category: taskCategory
    };

    setTaskName('');
    setTaskDesc('');
    setTaskScore(100);
    setTaskBatchId('');
    setTaskCategory('初階');
    setShowTaskModal(false);

    try {
      await onCreateTask(currentTaskData);
    } catch (err) {
      console.error('建立任務失敗:', err);
      // 若失敗，則恢復狀態供使用者調整
      setTaskName(currentTaskData.name);
      setTaskDesc(currentTaskData.description);
      setTaskScore(currentTaskData.score);
      setTaskBatchId(currentTaskData.batch_id || '');
      setTaskCategory(currentTaskData.category);
      setShowTaskModal(true);
    }
  };

  const handleAssignTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStudentId) return;
    await onAssignTeam(
      assignStudentId, 
      assignTeamId || null, 
      assignRole, 
      assignBatchId || null,
      assignRole === 'admin' ? assignDivisionName.trim() : null,
      assignRole === 'captain' ? assignDirectorId : null,
      assignStatus
    );
    setAssignStudentId('');
    setAssignTeamId('');
    setAssignBatchId('');
    setAssignDivisionName('');
    setAssignDirectorId('');
    setAssignStatus('active');
  };

  const handleAssignBatchChange = (batchId: string) => {
    setAssignBatchId(batchId);
    setAssignTeamId('');
    setAssignStudentId('');
    setAssignDivisionName('');
    setAssignDirectorId('');
    setAssignStatus('active');
  };

  const handleAdjustScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustStudentId || !adjustReason) return;
    const amountNum = Number(adjustAmount);
    await onManualAdjustScore(adjustStudentId, amountNum, adjustReason);
    
    const studentName = profiles.find(p => p.id === adjustStudentId)?.name || '學員';
    setAdjustMessage(`🎉 成功對 ${studentName} 調整分數：${amountNum > 0 ? '+' : ''}${amountNum}`);
    setAdjustStudentId('');
    setAdjustReason('');
    setTimeout(() => setAdjustMessage(''), 3000);
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
    await onCreateAchievement(achTitle, achDesc, Number(achValue), achIconUrl);
    setAchTitle('');
    setAchDesc('');
    setAchValue(5000);
    setAchIconUrl(null);
    alert('成就建立成功！');
  };

  // --- Cohort State (Hidden in favor of Batches Management) ---
  // const [cohortName, setCohortName] = useState('');
  // const [cohortStartTime, setCohortStartTime] = useState(formatDateToLocal(new Date()));
  // const [cohortEndTime, setCohortEndTime] = useState(formatDateToLocal(new Date(Date.now() + 30 * 86400000)));
  // 
  // const handleCreateCohort = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!cohortName || !cohortStartTime || !cohortEndTime) return;
  //   if (onCreateBatch) {
  //     await onCreateBatch({
  //       name: cohortName,
  //       start_date: new Date(cohortStartTime).toISOString(),
  //       end_date: new Date(cohortEndTime).toISOString(),
  //       status: 'active',
  //     });
  //     setCohortName('');
  //     alert('期數建立成功！');
  //   }
  // };

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
  const [rulesFilterCategory, setRulesFilterCategory] = useState<string>('全部');
  const [teamsFilterBatchId, setTeamsFilterBatchId] = useState<string>('全部');

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
      await onSaveBatchMissionTemplates(selectedRuleBatchId, rulesToSave);
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

  const handleSavePetStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStageId || !onUpdatePetStage) return;
    console.log("form image_url before save:", editImageUrl);

    console.log('[PET SAVE] handleSavePetStage saving stage:', {
      stageId: editingStageId,
      stage_name: editStageName,
      animation_type: editAnimationType,
      glow_color: editGlowColor,
      description: editDescription,
      evolution_text: editEvolutionText,
      image_url: editImageUrl,
      min_level: editMinLevel,
      max_level: editMaxLevel,
      is_active: editStageActive
    });
    
    await onUpdatePetStage(editingStageId, {
      stage_name: editStageName,
      animation_type: editAnimationType,
      glow_color: editGlowColor,
      description: editDescription,
      evolution_text: editEvolutionText,
      image_url: editImageUrl,
      min_level: Number(editMinLevel),
      max_level: Number(editMaxLevel),
      is_active: editStageActive
    });
    
    setEditingStageId(null);
    setEditStageName('');
    setEditAnimationType('animate-pulse');
    setEditGlowColor('#A855F7');
    setEditDescription('');
    setEditEvolutionText('');
    setEditImageUrl('');
    setEditMinLevel(0);
    setEditMaxLevel(99);
    setEditStageActive(true);
    setUploadError('');
    setBgWarning('');
  };

  const handleSavePetLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLineId || !onUpdatePetLine) return;
    
    let targetTemplateId = editLineTaskTemplateId;
    if (editLineTaskTemplateId === 'new') {
      if (!editLineTaskTitle.trim()) {
        alert('請輸入新建任務之名稱！');
        return;
      }
      if (onCreateMissionTemplate) {
        try {
          const newTemplate = await onCreateMissionTemplate({
            title: editLineTaskTitle,
            description: editLineTaskDesc,
            mission_type: 'special',
            points: editLineTaskPoints,
            review_type: editLineTaskReviewType,
            is_active: editLineTaskActive,
            category: '神獸進化',
            max_completions: editLineTaskMaxCompletions
          });
          if (newTemplate && newTemplate.id) {
            targetTemplateId = newTemplate.id;
          } else {
            alert('全新任務模板建立未成功返回，請確認！');
            return;
          }
        } catch (err) {
          console.error(err);
          alert('建立修行任務模板失敗！');
          return;
        }
      }
    } else if (editLineTaskTemplateId && onUpdateMissionTemplate) {
      await onUpdateMissionTemplate(editLineTaskTemplateId, {
        title: editLineTaskTitle,
        description: editLineTaskDesc,
        points: editLineTaskPoints,
        review_type: editLineTaskReviewType,
        is_active: editLineTaskActive,
        max_completions: editLineTaskMaxCompletions
      });
    }

    await onUpdatePetLine(editingLineId, {
      name: editLineName,
      description: editLineDesc,
      core_traits: editLineTraits,
      is_active: editLineActive,
      image_url: editImageUrl,
      unlock_level: editLineUnlockLevel,
      task_template_id: targetTemplateId,
      sort_order: editLineSortOrder
    });
    
    setEditingLineId(null);
    setEditLineName('');
    setEditLineDesc('');
    setEditLineTraits('');
    setEditLineActive(true);
    setEditImageUrl('');
    setEditLineUnlockLevel(5);
    setEditLineTaskTemplateId(null);
    setEditLineSortOrder(1);
    setEditLineTaskTitle('');
    setEditLineTaskDesc('');
    setEditLineTaskPoints(500);
    setEditLineTaskReviewType('leader');
    setEditLineTaskMaxCompletions(1);
    setEditLineTaskActive(true);
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
            {[...tasks].sort((a, b) => {
              const order = { daily: 1, weekly: 2, temporary: 3, limited: 4 };
              const typeDiff = (order[a.type] || 5) - (order[b.type] || 5);
              if (typeDiff !== 0) return typeDiff;
              return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            }).map(task => (
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


        </section>
      )}

      {/* ==================== 3. 小隊分配 ==================== */}
      {adminTab === 'teams' && (
        <div className="space-y-6">
          {/* ⚡ 快速期數小隊長指派 (小隊長綁定小隊與大隊) */}
          <section className="glass-panel p-6 rounded-3xl border border-amber-500/20 bg-amber-500/[0.01] space-y-4 light:bg-white light:border-slate-200 shadow-lg shadow-amber-500/[0.02] text-left">
            <h3 className="font-black text-white text-base select-none flex items-center gap-2 light:text-slate-900">
              <ShieldCheck className="text-amber-500" size={18} />
              ⚡ 快速期數小隊長指派 (小隊長綁定小隊與大隊)
            </h3>
            
            <form onSubmit={handleQuickAssignSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5 light:text-slate-500">1. 選擇班次期數 (Batch)</label>
                <select
                  required
                  value={quickBatchId}
                  onChange={e => {
                    setQuickBatchId(e.target.value);
                    setQuickTeamId('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900 cursor-pointer"
                >
                  <option value="">請選擇期數...</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5 light:text-slate-500">2. 安排指派小隊 (Team)</label>
                <select
                  required
                  disabled={!quickBatchId}
                  value={quickTeamId}
                  onChange={e => {
                    const selectedTeamId = e.target.value;
                    setQuickTeamId(selectedTeamId);
                    
                    // Auto-fill existing captain & director if set
                    const currentTeam = teams.find(t => t.id === selectedTeamId);
                    if (currentTeam && currentTeam.captain_id) {
                      setQuickCaptainId(currentTeam.captain_id);
                      const capProfile = profiles.find(p => p.profile_id === currentTeam.captain_id && p.batch_id === quickBatchId);
                      if (capProfile && capProfile.director_id) {
                        setQuickDirectorId(capProfile.director_id);
                      } else {
                        setQuickDirectorId('');
                      }
                    } else {
                      setQuickCaptainId('');
                      setQuickDirectorId('');
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed light:bg-slate-50 light:border-slate-200 light:text-slate-900 cursor-pointer"
                >
                  {!quickBatchId ? (
                    <option value="">請先選擇期數...</option>
                  ) : (
                    <>
                      <option value="">請選擇指派小隊...</option>
                      {teams
                        .filter(t => t.batch_id === quickBatchId)
                        .map(t => {
                          const cap = profiles.find(p => p.profile_id === t.captain_id && p.batch_id === quickBatchId);
                          const teamLabel = t.custom_name ? `${t.name} (${t.custom_name})` : t.name;
                          const capLabel = cap ? `(小隊長: ${cap.name})` : '(無小隊長)';
                          return (
                            <option key={t.id} value={t.id}>
                              {teamLabel} {capLabel}
                            </option>
                          );
                        })}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5 light:text-slate-500">3. 選擇小隊長候選人 (Captain Candidate)</label>
                <select
                  required
                  disabled={!quickTeamId}
                  value={quickCaptainId}
                  onChange={e => setQuickCaptainId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed light:bg-slate-50 light:border-slate-200 light:text-slate-900 cursor-pointer"
                >
                  {!quickTeamId ? (
                    <option value="">請先選擇小隊...</option>
                  ) : (
                    <>
                      <option value="">請選擇小隊長候選人...</option>
                      {captainCandidates
                        .filter(c => c.status === 'eligible' || c.profile_id === quickCaptainId)
                        .filter(c => {
                          if (quickBatchId) {
                            const isAlreadyCaptain = teams.some(t => t.batch_id === quickBatchId && t.captain_id === c.profile_id && t.id !== quickTeamId);
                            return !isAlreadyCaptain;
                          }
                          return true;
                        })
                        .map(c => (
                          <option key={c.id} value={c.profile_id}>
                            {c.name} ({c.phone ? `*${c.phone.slice(-3)}` : '無手機'})
                          </option>
                        ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5 light:text-slate-500">4. 綁定所屬大隊長 (Director - 選填)</label>
                <div className="flex gap-2">
                  <select
                    value={quickDirectorId}
                    onChange={e => setQuickDirectorId(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900 cursor-pointer"
                  >
                    <option value="">無 / 未指派...</option>
                    {profiles
                      .filter(p => p.role === 'admin')
                      .map(p => (
                        <option key={p.id} value={p.profile_id}>
                          👑 {p.name} {p.division_name ? `(${p.division_name})` : ''}
                        </option>
                      ))}
                  </select>
                  
                  <button
                    type="submit"
                    disabled={isSyncing || !quickBatchId || !quickCaptainId || !quickTeamId}
                    className="btn-action bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-3 rounded-xl text-xs font-black shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    儲存指派
                  </button>
                </div>
              </div>
            </form>
          </section>

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
                      disabled={!newProfileBatchId}
                      value={newProfileTeamId}
                      onChange={e => setNewProfileTeamId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {!newProfileBatchId ? (
                        <option value="">請先選擇期數...</option>
                      ) : (
                        <>
                          <option value="">無 / 未分配</option>
                          {teams
                            .filter(t => t.batch_id === newProfileBatchId)
                            .map(t => {
                              const cap = profiles.find(p => p.profile_id === t.captain_id && p.batch_id === newProfileBatchId);
                              const teamLabel = t.custom_name ? `${t.name} (${t.custom_name})` : t.name;
                              return (
                                <option key={t.id} value={t.id}>
                                  {teamLabel} {cap ? `(小隊長: ${cap.name})` : '(無小隊長)'}
                                </option>
                              );
                            })}
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
                    <option value="admin">大隊長 (admin)</option>
                    <option value="captain">小隊長 (captain)</option>
                    <option value="student">一般學員 (student)</option>
                  </select>
                </div>

                {newProfileRole === 'admin' && (
                  <div>
                    <label className="block text-xs text-slate-405 font-bold mb-1.5">大隊名稱</label>
                    <input
                      required
                      type="text"
                      value={newProfileDivisionName}
                      onChange={e => setNewProfileDivisionName(e.target.value)}
                      placeholder="例如：定洋大隊"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {newProfileRole === 'captain' && (
                  <div>
                    <label className="block text-xs text-slate-405 font-bold mb-1.5">指派大隊長</label>
                    <select
                      value={newProfileDirectorId}
                      onChange={e => setNewProfileDirectorId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                    >
                      <option value="">無 / 未指派...</option>
                      {profiles
                        .filter(p => p.role === 'admin')
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            👑 {p.name} {p.division_name ? `(${p.division_name})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

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
                      value={assignTeamId}
                      onChange={e => setAssignTeamId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">無 (獨立修行者)</option>
                      {teams
                        .filter(t => !assignBatchId || t.batch_id === assignBatchId)
                        .map(t => {
                          const cap = profiles.find(p => p.profile_id === t.captain_id && (!assignBatchId || p.batch_id === assignBatchId));
                          const teamLabel = t.custom_name ? `${t.name} (${t.custom_name})` : t.name;
                          return (
                            <option key={t.id} value={t.id}>
                              {teamLabel} {cap ? `(小隊長: ${cap.name})` : '(無小隊長)'}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1.5">選擇修行者 (Practitioner)</label>
                    <select
                      required
                      value={assignStudentId}
                      onChange={e => {
                        const studentId = e.target.value;
                        setAssignStudentId(studentId);
                        const profile = profiles.find(p => p.id === studentId);
                        if (profile) {
                          setAssignRole(profile.role);
                          setAssignDivisionName(profile.division_name || '');
                          setAssignDirectorId(profile.director_id || '');
                          setAssignStatus(profile.status || 'active');
                          if (profile.batch_id) setAssignBatchId(profile.batch_id);
                        } else {
                          setAssignDivisionName('');
                          setAssignDirectorId('');
                          setAssignStatus('active');
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">請選擇...</option>
                      {profiles
                        .filter(p => !assignBatchId || p.batch_id === assignBatchId || !p.batch_id)
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.role === 'admin' ? '大隊長' : p.role === 'captain' ? '小隊長' : '學員'})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1.5">變更角色 (Role)</label>
                    <select
                      disabled={!assignStudentId}
                      value={assignRole}
                      onChange={e => setAssignRole(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="student">學員 (student)</option>
                      <option value="captain">小隊長 (captain)</option>
                      <option value="admin">大隊長 (admin)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-bold mb-1.5">期數狀態 (Status)</label>
                    <select
                      disabled={!assignStudentId}
                      value={assignStatus}
                      onChange={e => setAssignStatus(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="active">進行中 (active)</option>
                      <option value="ended">已結束 (ended)</option>
                      <option value="inactive">已停用 (inactive)</option>
                    </select>
                  </div>

                  {assignRole === 'admin' && (
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-400 font-bold mb-1.5">大隊名稱</label>
                      <input
                        required
                        type="text"
                        value={assignDivisionName}
                        onChange={e => setAssignDivisionName(e.target.value)}
                        placeholder="例如：定洋大隊"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                      />
                    </div>
                  )}

                  {assignRole === 'captain' && (
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-400 font-bold mb-1.5">指派大隊長</label>
                      <select
                        value={assignDirectorId}
                        onChange={e => setAssignDirectorId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                      >
                        <option value="">無 / 未指派...</option>
                        {profiles
                          .filter(p => p.role === 'admin')
                          .map(p => (
                            <option key={p.id} value={p.id}>
                              👑 {p.name} {p.division_name ? `(${p.division_name})` : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSyncing || !assignStudentId}
                  className="btn-action bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-xl text-xs font-black shadow-lg shadow-red-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  儲存分配變更
                </button>
              </form>
            </section>

            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
              <h3 className="font-black text-white text-base flex items-center gap-2 select-none light:text-slate-900">
                <Settings size={18} className="text-amber-500" />
                小隊成員備註與職責指派
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    選擇修行學員
                  </label>
                  <select
                    value={roleSettingStudentId}
                    onChange={(e) => setRoleSettingStudentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 transition-all light:bg-slate-50 light:border-slate-300 light:text-slate-800"
                  >
                    <option value="">請選擇學員...</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.role === 'captain' ? '(小隊長)' : p.role === 'admin' ? '(大隊長)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {roleSettingStudentId && (() => {
                  const student = profiles.find(p => p.id === roleSettingStudentId);
                  const isCaptain = student?.role === 'captain';

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5 light:border-slate-200 animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                          編輯角色與備註（如：嫦娥(抱抱)）
                        </label>
                        <input
                          type="text"
                          value={adminNoteText}
                          placeholder={DEFAULT_CHARACTERS[student?.name || ''] || "例如：如來佛祖(大隊長)"}
                          onBlur={handleAdminNoteBlur}
                          onChange={(e) => setAdminNoteText(e.target.value)}
                          className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-300 outline-none focus:border-amber-500 transition-all light:bg-slate-50 light:border-slate-300 light:text-slate-800"
                        />
                        <p className="text-[9px] text-slate-500 italic">備註輸入後移開焦點（Blur）將自動同步與儲存</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                          指派小組職責 {isCaptain && <span className="text-amber-500">(小隊長為系統預設角色)</span>}
                        </label>
                        {isCaptain ? (
                          <div className="w-full text-xs bg-slate-950/40 border border-white/5 rounded-xl px-3 py-2.5 text-slate-500 font-bold select-none light:bg-slate-100 light:border-slate-250">
                            👑 系統預設：小隊長
                          </div>
                        ) : (
                          <select
                            value={squadRolesMap[roleSettingStudentId]?.[0] || ''}
                            onChange={(e) => handleAdminRoleChange(e.target.value)}
                            className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-300 font-bold outline-none focus:border-teal-500 transition-all light:bg-slate-50 light:border-slate-300 light:text-slate-800"
                          >
                            <option value="">未分配職責</option>
                            {QUEST_ROLES_DEFS.map(role => (
                              <option key={role.id} value={role.id}>
                                🛡️ {role.name} ({role.duties.join(' · ')})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </section>
          </div>

          {/* 小隊與小隊長指派控制台 */}
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
            <h3 className="font-black text-white text-base select-none light:text-slate-900 flex items-center gap-2">
              🛡️ 小隊與小隊長指派控制台 (批次管理)
            </h3>
            
            {teamsFilterBatchId === '全部' ? (
              <div className="text-center py-6 text-slate-500 font-bold select-none text-xs">
                💡 請在上方篩選特定期數以指派小隊長。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams
                  .filter(t => t.batch_id === teamsFilterBatchId)
                  .map(t => {
                    const memberCount = profiles.filter(p => p.team_id === t.id && p.role === 'student' && p.batch_id === teamsFilterBatchId && p.status !== 'inactive').length;
                    return (
                      <div key={t.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3 relative light:bg-slate-50 light:border-slate-200 select-none text-left">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-white text-sm light:text-slate-900">
                              {t.custom_name ? `${t.name} (${t.custom_name})` : t.name}
                            </h4>
                            <div className="flex gap-3 text-[10px] text-slate-400 mt-1 light:text-slate-500 font-mono">
                              <span>成員：{memberCount} 人</span>
                              <span>代碼：{t.invite_code}</span>
                              <span className={t.invite_enabled ? 'text-emerald-400' : 'text-red-400'}>
                                {t.invite_enabled ? '已招募' : '關閉'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2 border-t border-white/5 light:border-slate-200">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-bold select-none light:text-slate-500">
                              👤 小隊長:
                            </span>
                            <select
                              value={t.captain_id || ''}
                              disabled={isSyncing}
                              onChange={async (e) => {
                                if (onUpdateTeamSettings) {
                                  try {
                                    await onUpdateTeamSettings(t.id, { captain_id: e.target.value || null });
                                    alert('成功更新小隊長指派！');
                                  } catch (err: any) {
                                    alert(err.message || '指派小隊長失敗');
                                  }
                                }
                              }}
                              className="bg-slate-900 border border-slate-800 text-amber-500 rounded px-1.5 py-0.5 text-[10px] font-black outline-none cursor-pointer light:bg-slate-100 light:border-slate-300"
                            >
                              <option value="">-- 未指派 --</option>
                              {captainCandidates
                                .filter(c => c.status === 'eligible' || c.profile_id === t.captain_id)
                                .filter(c => {
                                  const isCaptainOfOtherTeam = teams.some(team => team.batch_id === t.batch_id && team.captain_id === c.profile_id && team.id !== t.id);
                                  return !isCaptainOfOtherTeam;
                                })
                                .map(c => (
                                  <option key={c.id} value={c.profile_id}>
                                    {c.name}
                                  </option>
                                ))}
                            </select>
                          </div>

                          {t.captain_id && (() => {
                            const cap = profiles.find(p => p.profile_id === t.captain_id && p.batch_id === teamsFilterBatchId);
                            if (!cap) return null;
                            return (
                              <div className="flex items-center gap-1.5 flex-wrap animate-in slide-in-from-top-1 duration-200">
                                <span className="text-[10px] text-slate-400 font-bold select-none light:text-slate-500">
                                  👑 所屬大隊:
                                </span>
                                <select
                                  value={cap.director_id || ''}
                                  disabled={isSyncing}
                                  onChange={async (e) => {
                                    if (onAssignTeam) {
                                      try {
                                        await onAssignTeam(
                                          cap.id,
                                          t.id,
                                          'captain',
                                          t.batch_id,
                                          null,
                                          e.target.value || null,
                                          cap.status
                                        );
                                        alert('成功變更大隊！');
                                      } catch (err: any) {
                                        alert(err.message || '變更大隊失敗');
                                      }
                                    }
                                  }}
                                  className="bg-slate-900 border border-slate-800 text-purple-400 rounded px-1.5 py-0.5 text-[10px] font-black outline-none cursor-pointer light:bg-slate-100 light:border-slate-300"
                                >
                                  <option value="">-- 未指定大隊 --</option>
                                  {profiles
                                    .filter(p => p.role === 'admin')
                                    .map(p => (
                                      <option key={p.id} value={p.profile_id}>
                                        👑 {p.name} {p.division_name ? `(${p.division_name})` : ''}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                {teams.filter(t => t.batch_id === teamsFilterBatchId).length === 0 && (
                  <div className="col-span-full text-center py-6 text-slate-500 font-bold text-xs">
                    本期數下尚無任何小隊。
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Roster list overview */}
          <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-3 light:bg-white light:border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 select-none">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                目前名冊概覽
              </h4>
              
              {/* Batch Filter Pills */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-slate-400 font-bold">期數篩選:</span>
                {['全部', ...batches.map(b => b.id)].map(batchId => {
                  const label = batchId === '全部' ? '全部' : (batches.find(b => b.id === batchId)?.name || batchId);
                  const isActive = teamsFilterBatchId === batchId;
                  return (
                    <button
                      key={batchId}
                      type="button"
                      onClick={() => setTeamsFilterBatchId(batchId)}
                      className={`py-1 px-2.5 rounded-lg text-[9px] font-black transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white light:bg-slate-100 light:border-slate-300 light:text-slate-500'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-white/5 rounded-2xl overflow-hidden light:bg-slate-50 light:border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-300 font-bold uppercase light:border-slate-200 select-none">
                    <th className="p-3">姓名</th>
                    <th className="p-3">手機</th>
                    <th className="p-3">角色</th>
                    <th className="p-3">所屬班次</th>
                    <th className="p-3">所屬分隊</th>
                    <th className="p-3">狀態</th>
                    <th className="p-3 text-right">當前經驗</th>
                    <th className="p-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 light:divide-slate-200">
                  {profiles
                    .filter(p => teamsFilterBatchId === '全部' || p.batch_id === teamsFilterBatchId)
                    .map(p => {
                      const team = teams.find(t => t.id === p.team_id);
                      const batch = batches.find(b => b.id === p.batch_id);
                      return (
                        <tr key={p.id}>
                          <td className="p-3 font-bold text-white">{p.name}</td>
                          <td className="p-3 text-slate-200 light:text-slate-800 font-mono">{p.phone || '—'}</td>
                          <td className="p-3 text-slate-200 light:text-slate-800 select-none">
                            {p.role === 'admin'
                              ? `🔴 大隊長 ${p.division_name ? `(${p.division_name})` : ''}`
                              : p.role === 'captain'
                              ? `🟡 小隊長 ${p.director_id ? `(大隊長: ${profiles.find(leader => leader.id === p.director_id)?.name || '未填寫'})` : ''}`
                              : '🟢 學員'}
                          </td>
                          <td className="p-3 text-slate-200 light:text-slate-800 select-none">{batch ? batch.name : '—'}</td>
                          <td className="p-3 text-slate-200 light:text-slate-800 select-none">
                            {team ? (
                              (() => {
                                const cap = profiles.find(prof => prof.profile_id === team.captain_id && prof.batch_id === team.batch_id);
                                const teamLabel = team.custom_name ? `${team.name} (${team.custom_name})` : team.name;
                                return cap ? `${teamLabel} (小隊長: ${cap.name})` : `${teamLabel} (無小隊長)`;
                              })()
                            ) : '—'}
                          </td>
                          <td className="p-3 text-slate-200 light:text-slate-800 select-none">
                            {(!p.status || p.status === 'active') ? (
                              <span className="text-emerald-400 font-black">進行中</span>
                            ) : p.status === 'ended' ? (
                              <span className="text-slate-400 font-bold">已結束</span>
                            ) : (
                              <span className="text-red-400 font-bold">已停用</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-black text-amber-500 select-none">{p.score.toLocaleString()}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                setAssignStudentId(p.id);
                                setAssignRole(p.role);
                                setAssignDivisionName(p.division_name || '');
                                setAssignDirectorId(p.director_id || '');
                                setAssignStatus(p.status || 'active');
                                if (p.batch_id) setAssignBatchId(p.batch_id);
                                if (p.team_id) setAssignTeamId(p.team_id);
                                window.scrollTo({ top: 300, behavior: 'smooth' });
                              }}
                              className="bg-amber-500/20 hover:bg-amber-500 text-amber-500 hover:text-slate-950 font-bold py-1 px-3 rounded-lg text-xs transition-colors outline-none cursor-pointer"
                            >
                              編輯
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
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
              建立經驗成就
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
                placeholder="所需經驗分數門檻"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
              />
              
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400 font-bold mb-1">成就徽章圖片 (選填)</label>
                <div className="flex items-center gap-2 select-none">
                  {achIconUrl ? (
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={achIconUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setAchIconUrl(null)}
                        className="absolute top-0.5 right-0.5 bg-black/75 hover:bg-black text-white p-0.5 rounded-full"
                      >
                        <X size={8} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/5 text-[10px] font-bold text-slate-300 cursor-pointer hover:border-red-500/30 hover:text-red-300 transition-all">
                      <ImageIcon size={12} className="text-red-400" />
                      <span>上傳徽章圖片</span>
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
                                r.onerror = () => reject(new Error('檔案讀取失敗'));
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
                className="w-full btn-action py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black"
              >
                建立成就
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
                          <input
                            type="number"
                            value={editAchValue}
                            onChange={e => setEditAchValue(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none"
                            placeholder="分數門檻"
                          />
                          <div className="flex items-center gap-2">
                            {editAchIconUrl ? (
                              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={editAchIconUrl} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => setEditAchIconUrl(null)}
                                  className="absolute top-0 right-0 bg-black/75 hover:bg-black text-white p-0.5 rounded-bl-lg"
                                >
                                  <X size={8} />
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950 border border-white/5 text-[10px] font-bold text-slate-300 cursor-pointer hover:border-red-500/30 hover:text-red-300 transition-all shrink-0">
                                <ImageIcon size={10} className="text-red-400" />
                                <span>上傳圖片</span>
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
                                          r.onerror = () => reject(new Error('檔案讀取失敗'));
                                          r.readAsDataURL(file);
                                        });
                                        setEditAchIconUrl(rawBase64);
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>
                            )}
                            <div className="flex-1 flex justify-end gap-2">
                              <button onClick={handleCancelEditAch} className="px-3 py-1 rounded-lg bg-slate-800 text-xs text-white hover:bg-slate-700">取消</button>
                              <button onClick={() => handleSaveEditAch(ach.id)} className="px-3 py-1 rounded-lg bg-red-500 text-xs text-white font-bold hover:bg-red-600">儲存</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-white/5">
                            {ach.icon_url && (ach.icon_url.startsWith('data:') || ach.icon_url.startsWith('http')) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={ach.icon_url} alt="icon" className="w-6 h-6 object-contain" />
                            ) : (
                              <Trophy size={16} className="text-amber-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-white truncate">{ach.title}</p>
                              <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
                                {ach.condition_value} 分
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{ach.description}</p>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button onClick={() => handleStartEditAch(ach)} className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-300 transition-colors">
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => onDeleteAchievement && onDeleteAchievement(ach.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
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
      )}

      {/* ==================== 寵物配置分頁 ==================== */}
      {adminTab === 'pets' && (
        <div className="space-y-6">
          {/* Sub-navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4 select-none light:border-slate-200">
            <button
              onClick={() => setPetSubTab('stages')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                petSubTab === 'stages'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white light:bg-slate-100 light:text-slate-600 light:hover:text-slate-900'
              }`}
            >
              🐉 神獸階段管理
            </button>
            <button
              onClick={() => setPetSubTab('lines')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                petSubTab === 'lines'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white light:bg-slate-100 light:text-slate-600 light:hover:text-slate-900'
              }`}
            >
              ✨ 神獸進化路線設定
            </button>
            <button
              onClick={() => setPetSubTab('progress')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                petSubTab === 'progress'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white light:bg-slate-100 light:text-slate-600 light:hover:text-slate-900'
              }`}
            >
              🎓 學員培育進度
            </button>
          </div>

          {/* ==================== 1. 神獸階段管理 ==================== */}
          {petSubTab === 'stages' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none animate-in fade-in duration-200">
              {/* 編輯神獸階段設定 */}
              <section className={`glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 ${
                editingStageId ? 'md:col-span-3' : 'md:col-span-1'
              }`}>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Sparkles size={16} className="text-red-500" />
                  編輯神獸階段設定
                </h3>
                
                {!editingStageId ? (
                  <div className="text-center py-12 text-slate-500 text-xs font-bold border border-dashed border-white/10 rounded-2xl">
                    請從右側列表選擇一個神獸階段<br />以進行客製化設定。
                  </div>
                ) : (
                  <form onSubmit={handleSavePetStage} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Input Fields */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-slate-400 font-bold mb-1">階段名稱</label>
                        <input
                          required
                          type="text"
                          value={editStageName}
                          onChange={e => setEditStageName(e.target.value)}
                          placeholder="例如：語意烈焰龍 (幼體)"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 font-bold mb-1">外觀圖片網址</label>
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editImageUrl}
                            onChange={e => setEditImageUrl(e.target.value)}
                            placeholder="https://images.unsplash.com/..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono text-[11px]"
                          />

                          {/* Image Preview & Operations */}
                          {editImageUrl ? (
                            <div className="flex items-center gap-3 p-3 bg-slate-900/40 border border-white/5 rounded-2xl">
                              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-slate-950 relative flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={editImageUrl} 
                                  alt="預覽" 
                                  className="w-12 h-12 object-contain"
                                  style={{ filter: `drop-shadow(0 0 8px ${editGlowColor || '#A855F7'})` }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-slate-400 font-bold truncate">目前已設定圖片</p>
                                <button
                                  type="button"
                                  onClick={handleRemoveImage}
                                  className="mt-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-black rounded-lg hover:bg-red-500/20 transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 size={10} />
                                  移除圖片網址
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center p-3 border border-dashed border-white/5 rounded-2xl bg-slate-900/10 text-slate-500 text-[10px] font-bold">
                              尚未設定圖片，請輸入網址或從下方上傳。
                            </div>
                          )}

                          {/* Upload Button */}
                          <div>
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/jpg, image/webp"
                              id="beast-image-upload"
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                              className="hidden"
                              disabled={isUploadingImage}
                            />
                            <label
                              htmlFor="beast-image-upload"
                              className={`w-full py-3.5 border border-dashed border-slate-800 hover:border-red-500/50 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition-all select-none ${
                                isUploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {isUploadingImage ? (
                                <>
                                  <div className="w-4 h-4 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    {isRealSupabase ? '圖片上傳中...' : '圖片讀取中...'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Upload size={14} className="text-slate-500" />
                                  <span className="text-[10px] text-slate-400 font-bold">上傳新圖片 (限制 10MB, 支援 PNG/JPG/JPEG/WEBP)</span>
                                </>
                              )}
                            </label>
                            <p className="text-[9px] text-slate-500 font-bold mt-1.5 leading-relaxed">
                              💡 建議上傳：透明背景 PNG / WebP | 尺寸 1024x1024 | 主體置中 | 不要白底 | 不要方框 | 不要卡片背景。
                            </p>
                          </div>

                          {uploadError && (
                            <div className="flex items-center gap-1.5 p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 font-bold select-none">
                              <AlertCircle size={12} className="shrink-0" />
                              <span>{uploadError}</span>
                            </div>
                          )}

                          {bgWarning && (
                            <div className="flex items-start gap-1.5 p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-[10px] text-yellow-500 font-bold leading-normal select-none">
                              <AlertCircle size={12} className="shrink-0 mt-0.5" />
                              <span>⚠️ {bgWarning}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 font-bold mb-1">最低等級 (min)</label>
                          <input
                            required
                            type="number"
                            min={0}
                            max={99}
                            value={editMinLevel}
                            onChange={e => setEditMinLevel(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 font-bold mb-1">最高等級 (max)</label>
                          <input
                            required
                            type="number"
                            min={0}
                            max={99}
                            value={editMaxLevel}
                            onChange={e => setEditMaxLevel(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 font-bold mb-1">光環特效顏色 (Hex)</label>
                        <div className="flex gap-2">
                          <input
                            required
                            type="color"
                            value={editGlowColor}
                            onChange={e => setEditGlowColor(e.target.value)}
                            className="w-10 h-9 bg-slate-950 border border-slate-800 rounded-xl outline-none cursor-pointer"
                          />
                          <input
                            required
                            type="text"
                            value={editGlowColor}
                            onChange={e => setEditGlowColor(e.target.value)}
                            placeholder="#A855F7"
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 font-mono uppercase"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 font-bold mb-1">動畫律動類型</label>
                        <select
                          value={editAnimationType}
                          onChange={e => setEditAnimationType(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                        >
                          <option value="float">浮空滑行 (float)</option>
                          <option value="bounce">上下彈跳 (bounce)</option>
                          <option value="breath">緩慢膨脹 (breath)</option>
                          <option value="wiggle">輕微擺動 (wiggle)</option>
                          <option value="glow">呼吸光環 (glow)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 font-bold mb-1">神獸敘述</label>
                        <textarea
                          rows={3}
                          value={editDescription}
                          onChange={e => setEditDescription(e.target.value)}
                          placeholder="輸入神獸介紹與屬性加成描述..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 font-bold mb-1">進化提示條件說明</label>
                        <textarea
                          rows={2}
                          value={editEvolutionText}
                          onChange={e => setEditEvolutionText(e.target.value)}
                          placeholder="例如：需達到 LV.5 且於 3 天內破殼..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                        />
                      </div>
                      <div className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          id="editStageActive"
                          checked={editStageActive}
                          onChange={e => setEditStageActive(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-red-500 focus:ring-red-500 focus:ring-offset-slate-950 cursor-pointer"
                        />
                        <label htmlFor="editStageActive" className="text-xs text-slate-400 font-bold select-none cursor-pointer">
                          啟用此神獸階段
                        </label>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStageId(null);
                            setEditStageName('');
                            setEditImageUrl('');
                            setEditDescription('');
                            setEditEvolutionText('');
                            setEditMinLevel(0);
                            setEditMaxLevel(99);
                            setEditStageActive(true);
                            setUploadError('');
                            setBgWarning('');
                          }}
                          className="flex-1 btn-action py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold"
                        >
                          取消
                        </button>
                        <button
                          type="submit"
                          disabled={isSyncing}
                          className="flex-1 btn-action py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black"
                        >
                          儲存設定
                        </button>
                      </div>
                    </div>

                    {/* Right: Live Preview Panel */}
                    <div className="flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-white/5 pt-6 md:pt-0 md:pl-6 light:border-slate-200 relative select-none">
                      {typeof window !== 'undefined' ? (console.log('[PET PREVIEW] Rendering live preview:', {
                        editStageName,
                        editImageUrl,
                        editGlowColor,
                        editAnimationType
                      }), null) : null}
                      <span className="absolute top-0 right-0 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-black">
                        LIVE 實時預覽 (LV.30)
                      </span>
                      
                      <div className="mt-4 flex flex-col items-center justify-center">
                        {/* 寵物舞台 */}
                        <div className="relative flex items-center justify-center">
                          <div 
                            className="pet-stage"
                            style={{ 
                              '--glow-color': editGlowColor || '#A855F7',
                            } as React.CSSProperties}
                          >
                            <div className="pet-aura"></div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {editImageUrl ? (
                              <img
                                src={editImageUrl}
                                alt={editStageName || '預覽神獸'}
                                className={`pet-image animate-${editAnimationType || 'float'}`}
                                style={{ 
                                  '--pet-scale': (() => {
                                    let zoom = 1.0; // 預設放大的倍率
                                    if (editImageUrl) {
                                      const match = editImageUrl.match(/[#&?]zoom=([0-9.]+)/i) || editImageUrl.match(/[#&?]scale=([0-9.]+)/i);
                                      if (match && match[1]) {
                                        const parsed = parseFloat(match[1]);
                                        if (!isNaN(parsed) && parsed > 0) zoom = parsed;
                                      }
                                    }
                                    return Math.min(0.85 + (30 % 5) * 0.05, 1.1) * zoom;
                                  })(),
                                  '--pet-x': `${parsePetOffset(editImageUrl).x}px`,
                                  '--pet-y': `${parsePetOffset(editImageUrl).y}px`,
                                  '--glow-color': editGlowColor || '#A855F7'
                                } as React.CSSProperties}
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs font-bold border border-dashed border-white/10 rounded-2xl">
                                暫無圖片
                              </div>
                            )}
                            <div className="pet-shadow"></div>
                            <div className="pet-particles"></div>
                          </div>
                        </div>

                        {/* 寵物文字區 */}
                        <div className="text-center mt-2 flex flex-col items-center w-full px-2">
                          <h4 className="text-sm font-black text-amber-500 uppercase tracking-widest">
                            {editStageName || '未命名神獸'}
                          </h4>
                          <span className="text-[10px] font-black text-slate-500 bg-slate-950 px-2 py-0.5 rounded-full mt-1 inline-block light:bg-slate-100">
                            成長等級：LV.30
                          </span>
                          
                          {/* 說明文字區 */}
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed light:text-slate-500 max-w-xs text-center min-h-[40px]">
                            {editDescription || '尚未輸入神獸敘述描述...'}
                          </p>
                        </div>

                        {/* 偏移量微調 (右側預覽專用) */}
                        <div className="w-full max-w-[240px] mt-6 space-y-2.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                          <div className="text-center text-[10px] text-slate-400 font-bold mb-2">
                            ✨ 拖曳微調神獸位置與大小
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-500 font-bold w-6 shrink-0">X</span>
                            <input 
                              type="range" 
                              min="-200" max="200" step="1"
                              value={parsePetOffset(editImageUrl).x} 
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0;
                                const current = parsePetOffset(editImageUrl);
                                current.x = val;
                                
                                // 保留舊的 zoom 參數
                                let zoomVal = 1.0;
                                const match = editImageUrl?.match(/[#&?]zoom=([0-9.]+)/i);
                                if (match && match[1]) { zoomVal = parseFloat(match[1]); }
                                
                                const cleanUrl = editImageUrl.split('#')[0];
                                setEditImageUrl(`${cleanUrl}#x=${current.x}&y=${current.y}&zoom=${zoomVal}`);
                              }}
                              className="flex-1 accent-red-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-[9px] text-slate-400 font-mono w-6 text-right">{parsePetOffset(editImageUrl).x}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-500 font-bold w-6 shrink-0">Y</span>
                            <input 
                              type="range" 
                              min="-200" max="200" step="1"
                              value={parsePetOffset(editImageUrl).y} 
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0;
                                const current = parsePetOffset(editImageUrl);
                                current.y = val;

                                // 保留舊的 zoom 參數
                                let zoomVal = 1.0;
                                const match = editImageUrl?.match(/[#&?]zoom=([0-9.]+)/i);
                                if (match && match[1]) { zoomVal = parseFloat(match[1]); }

                                const cleanUrl = editImageUrl.split('#')[0];
                                setEditImageUrl(`${cleanUrl}#x=${current.x}&y=${current.y}&zoom=${zoomVal}`);
                              }}
                              className="flex-1 accent-red-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-[9px] text-slate-400 font-mono w-6 text-right">{parsePetOffset(editImageUrl).y}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-500 font-bold w-6 shrink-0">大小</span>
                            <input 
                              type="range" 
                              min="0.5" max="3" step="0.1"
                              value={(() => {
                                let zoom = 1.0;
                                const match = editImageUrl?.match(/[#&?]zoom=([0-9.]+)/i) || editImageUrl?.match(/[#&?]scale=([0-9.]+)/i);
                                if (match && match[1]) { zoom = parseFloat(match[1]); }
                                return zoom;
                              })()}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 1.0;
                                const current = parsePetOffset(editImageUrl);
                                const cleanUrl = editImageUrl.split('#')[0];
                                setEditImageUrl(`${cleanUrl}#x=${current.x}&y=${current.y}&zoom=${val}`);
                              }}
                              className="flex-1 accent-amber-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-[9px] text-slate-400 font-mono w-6 text-right">
                              {(() => {
                                let zoom = 1.0;
                                const match = editImageUrl?.match(/[#&?]zoom=([0-9.]+)/i) || editImageUrl?.match(/[#&?]scale=([0-9.]+)/i);
                                if (match && match[1]) { zoom = parseFloat(match[1]); }
                                return zoom.toFixed(1);
                              })()}x
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </section>

              {/* 系統現有神獸階段列表 */}
              <section className={`glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 ${
                editingStageId ? 'md:col-span-3' : 'md:col-span-2'
              }`}>
                <h3 className="font-black text-white text-base">
                  🐉 目前神獸進化階段圖鑑 ({petStages?.length || 0})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[560px] overflow-y-auto pr-1">
                  {[...(petStages || [])].sort((a, b) => {
                    if (a.line_key !== b.line_key) {
                      return (a.line_key || '').localeCompare(b.line_key || '');
                    }
                    return a.min_level - b.min_level;
                  }).map(stage => {
                    const cleanAnim = (stage.animation_type || '').replace('animate-', '');
                    const isGlow = cleanAnim === 'glow';
                    const glowAnimClass = isGlow ? 'animate-glow-pulse' : `animate-${cleanAnim}`;

                    return (
                      <div key={stage.id} className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl flex gap-3 light:bg-slate-50 light:border-slate-300">
                        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-slate-900 relative flex items-center justify-center">
                          {stage.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={stage.image_url} 
                              alt={stage.stage_name} 
                              className={`w-16 h-16 object-contain ${glowAnimClass}`}
                              style={{ filter: `drop-shadow(0 0 10px ${stage.glow_color || '#A855F7'})` }}
                            />
                          ) : (
                            <div className="text-[10px] text-slate-500 font-bold text-center">無圖片</div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-black text-white text-sm">{stage.stage_name}</h4>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${stage.is_active !== false ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                  {stage.is_active !== false ? '已啟用' : '已停用'}
                                </span>
                              </div>
                              <span className="text-[9px] font-bold text-slate-500">
                                {stage.line_key ? `流派：${stage.line_key === 'dragon' ? '影響力龍系' : stage.line_key === 'lion' ? '行動力獅系' : stage.line_key === 'fox' ? '親和力狐系' : '穩定靈獸系'}` : '通用流派'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                console.log('Editing stage selected:', stage);
                                setEditingStageId(stage.id);
                                setEditStageName(stage.stage_name || '');
                                setEditImageUrl(stage.image_url || '');
                                setEditGlowColor(stage.glow_color || '#A855F7');
                                const anim = stage.animation_type || 'pulse';
                                const cleanedAnim = anim.startsWith('animate-') ? anim.replace('animate-', '') : anim;
                                setEditAnimationType(cleanedAnim);
                                setEditDescription(stage.description || '');
                                setEditEvolutionText(stage.evolution_text || '');
                                setEditMinLevel(stage.min_level ?? 0);
                                setEditMaxLevel(stage.max_level ?? 99);
                                setEditStageActive(stage.is_active !== false);
                                setUploadError('');
                                setBgWarning('');
                              }}
                              className="btn-action px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-black rounded-lg hover:bg-red-500/20"
                            >
                              編輯設定
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed light:text-slate-600">{stage.description}</p>
                          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[9px] text-slate-500">
                            <span>階段: {stage.stage_index}</span>
                            <span>•</span>
                            <span>等級條件: LV.{stage.min_level ?? 0} ~ LV.{stage.max_level ?? 99}</span>
                            <span>•</span>
                            <span style={{ color: stage.glow_color }}>光環: {stage.glow_color}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* ==================== 2. 神獸進化路線設定 ==================== */}
          {petSubTab === 'lines' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none animate-in fade-in duration-200">
              {/* 編輯神獸進化路線設定 */}
              <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 md:col-span-1">
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Sparkles size={16} className="text-red-500" />
                  編輯神獸進化路線設定
                </h3>
                
                {!editingLineId ? (
                  <div className="text-center py-12 text-slate-500 text-xs font-bold border border-dashed border-white/10 rounded-2xl">
                    請從右側列表選擇一個神獸進化方向<br />以進行客製化設定。
                  </div>
                ) : (
                  <form onSubmit={handleSavePetLine} className="space-y-4">
                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">進化鍵值 (不可編輯)</label>
                      <input
                        disabled
                        type="text"
                        value={petLines.find(l => l.id === editingLineId)?.line_key || ''}
                        className="w-full bg-slate-950/40 border border-slate-900 rounded-xl p-2.5 text-xs text-slate-500 outline-none cursor-not-allowed font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">進化名稱</label>
                      <input
                        required
                        type="text"
                        value={editLineName}
                        onChange={e => setEditLineName(e.target.value)}
                        placeholder="例如：影響力龍系"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                      />
                    </div>
                    
                    {/* 進化後神獸圖片 */}
                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">進化後神獸圖片網址 (或從下方上傳)</label>
                      <div className="flex gap-2">
                        <input
                          required
                          type="text"
                          value={editImageUrl}
                          onChange={e => setEditImageUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                        />
                      </div>
                      
                      {/* Image Preview & Operations */}
                      {editImageUrl ? (
                        <div className="mt-2 relative w-fit group select-none">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={editImageUrl} 
                            alt="Preview" 
                            className="w-16 h-16 object-contain rounded-xl border border-white/10"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold hover:bg-red-600 shadow"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <label 
                            htmlFor="line-image-upload" 
                            className="btn-action inline-flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl hover:bg-red-500/20 select-none cursor-pointer"
                          >
                            <Upload size={12} />
                            {isUploadingImage ? '圖片上傳中...' : '選擇圖片檔案'}
                          </label>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            id="line-image-upload"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={isUploadingImage}
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">解鎖等級 (預設 Lv.5)</label>
                      <input
                        required
                        type="number"
                        min={1}
                        max={99}
                        value={editLineUnlockLevel}
                        onChange={e => setEditLineUnlockLevel(parseInt(e.target.value, 10) || 5)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">對應升級任務</label>
                      <select
                        value={editLineTaskTemplateId || ''}
                        onChange={e => {
                          const val = e.target.value || null;
                          setEditLineTaskTemplateId(val);
                          if (val === 'new') {
                            setEditLineTaskTitle('');
                            setEditLineTaskDesc('');
                            setEditLineTaskPoints(500);
                            setEditLineTaskReviewType('leader');
                            setEditLineTaskMaxCompletions(1);
                            setEditLineTaskActive(true);
                          } else if (val) {
                            const matched = missionTemplates.find(t => t.id === val);
                            setEditLineTaskTitle(matched?.title || '');
                            setEditLineTaskDesc(matched?.description || '');
                            setEditLineTaskPoints(matched?.points || 500);
                            setEditLineTaskReviewType(matched?.review_type || 'leader');
                            setEditLineTaskMaxCompletions(matched?.max_completions || 1);
                            setEditLineTaskActive(matched?.is_active !== false);
                          } else {
                            setEditLineTaskTitle('');
                            setEditLineTaskDesc('');
                            setEditLineTaskPoints(500);
                            setEditLineTaskReviewType('leader');
                            setEditLineTaskMaxCompletions(1);
                            setEditLineTaskActive(true);
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500 light:bg-white light:border-slate-300 light:text-slate-800"
                      >
                        <option value="">-- 請選擇一個任務模板 --</option>
                        <option value="new">➕ 建立並綁定全新修行任務模板</option>
                        {missionTemplates.map(t => (
                          <option key={t.id} value={t.id}>{t.title} (+{t.points} EXP)</option>
                        ))}
                      </select>
                    </div>

                    {(editLineTaskTemplateId === 'new' || (editLineTaskTemplateId && missionTemplates.some(t => t.id === editLineTaskTemplateId))) && (
                      <div className="p-3.5 bg-slate-900/60 border border-white/5 rounded-2xl space-y-3.5 light:bg-slate-50 light:border-slate-300">
                        <div className="text-[10px] text-red-500 font-black tracking-wider flex items-center gap-1">
                          🛠️ {editLineTaskTemplateId === 'new' ? '建立全新對應修行任務模板' : '編輯此任務模板內容'}
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-1">任務名稱</label>
                          <input
                            required
                            type="text"
                            value={editLineTaskTitle}
                            onChange={e => setEditLineTaskTitle(e.target.value)}
                            placeholder="例如：發表一次 NLP 主題感召分享"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus:border-red-500 light:bg-white light:border-slate-300 light:text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-1">任務描述/要求</label>
                          <textarea
                            required
                            rows={3}
                            value={editLineTaskDesc}
                            onChange={e => setEditLineTaskDesc(e.target.value)}
                            placeholder="例如：在小組或社群中發表一次..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus:border-red-500 light:bg-white light:border-slate-300 light:text-slate-800 font-medium"
                          />
                        </div>

                        {/* 🛠️ 新增任務規則設定 (積分, 審核, 次數限制, 啟用狀態) */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-bold mb-1">修行經驗積分</label>
                            <input
                              required
                              type="number"
                              min={0}
                              value={editLineTaskPoints}
                              onChange={e => setEditLineTaskPoints(Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus:border-red-500 light:bg-white light:border-slate-300 light:text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 font-bold mb-1">審核方式設定</label>
                            <select
                              value={editLineTaskReviewType}
                              onChange={e => setEditLineTaskReviewType(e.target.value as any)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus:border-red-500 light:bg-white light:border-slate-300 light:text-slate-800"
                            >
                              <option value="auto">免審核 (自動核准)</option>
                              <option value="leader">隊長審核</option>
                              <option value="admin">管理員審核</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-bold mb-1">最大打卡次數限制</label>
                            <input
                              required
                              type="number"
                              min={1}
                              value={editLineTaskMaxCompletions}
                              onChange={e => setEditLineTaskMaxCompletions(Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus:border-red-500 light:bg-white light:border-slate-300 light:text-slate-800"
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-4">
                            <input
                              type="checkbox"
                              id="editLineTaskActive"
                              checked={editLineTaskActive}
                              onChange={e => setEditLineTaskActive(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-red-500 focus:ring-red-500 focus:ring-offset-slate-950 cursor-pointer"
                            />
                            <label htmlFor="editLineTaskActive" className="text-[10px] text-slate-400 font-bold select-none cursor-pointer">
                              啟用此任務模板
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">顯示順序</label>
                      <input
                        required
                        type="number"
                        min={1}
                        value={editLineSortOrder}
                        onChange={e => setEditLineSortOrder(parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">核心特質描述</label>
                      <input
                        required
                        type="text"
                        value={editLineTraits}
                        onChange={e => setEditLineTraits(e.target.value)}
                        placeholder="例如：氣場、引導、說服力"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 font-bold mb-1">進化路線介紹</label>
                      <textarea
                        rows={3}
                        value={editLineDesc}
                        onChange={e => setEditLineDesc(e.target.value)}
                        placeholder="輸入對應神獸進化方向的成長背景與NLP溝通術流派介紹..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-red-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        id="editLineActive"
                        checked={editLineActive}
                        onChange={e => setEditLineActive(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-red-500 focus:ring-red-500 focus:ring-offset-slate-950 cursor-pointer"
                      />
                      <label htmlFor="editLineActive" className="text-xs text-slate-400 font-bold select-none cursor-pointer">
                        啟用此進化方向
                      </label>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLineId(null);
                          setEditLineName('');
                          setEditLineTraits('');
                          setEditLineDesc('');
                          setEditLineActive(true);
                          setEditImageUrl('');
                          setEditLineUnlockLevel(5);
                          setEditLineTaskTemplateId(null);
                          setEditLineSortOrder(1);
                          setEditLineTaskTitle('');
                          setEditLineTaskDesc('');
                          setEditLineTaskPoints(500);
                          setEditLineTaskReviewType('leader');
                          setEditLineTaskMaxCompletions(1);
                          setEditLineTaskActive(true);
                        }}
                        className="flex-1 btn-action py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={isSyncing}
                        className="flex-1 btn-action py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black"
                      >
                        儲存設定
                      </button>
                    </div>
                  </form>
                )}
              </section>

              {/* 系統現有神獸進化方向列表 */}
              <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 md:col-span-2">
                <h3 className="font-black text-white text-base">
                  ✨ 目前神獸進化方向列表 ({petLines?.length || 0})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[560px] overflow-y-auto pr-1">
                  {petLines?.map(line => {
                    const matchedTemplate = missionTemplates.find(t => t.id === line.task_template_id);
                    return (
                      <div key={line.id} className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl flex flex-col justify-between gap-3 light:bg-slate-50 light:border-slate-300">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-black text-white text-sm">{line.name}</h4>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${line.is_active !== false ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                  {line.is_active !== false ? '已啟用' : '已停用'}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono text-slate-500">
                                鍵值：{line.line_key} | 順序：{line.sort_order || 0}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                console.log('Editing line selected:', line);
                                setEditingLineId(line.id);
                                setEditLineName(line.name || '');
                                setEditLineTraits(line.core_traits || '');
                                setEditLineDesc(line.description || '');
                                setEditLineActive(line.is_active !== false);
                                setEditImageUrl(line.image_url || '');
                                setEditLineUnlockLevel(line.unlock_level || 5);
                                setEditLineTaskTemplateId(line.task_template_id || null);
                                setEditLineSortOrder(line.sort_order || 1);
                                
                                const matchedTemplate = missionTemplates.find(t => t.id === line.task_template_id);
                                setEditLineTaskTitle(matchedTemplate?.title || '');
                                setEditLineTaskDesc(matchedTemplate?.description || '');
                                setEditLineTaskPoints(matchedTemplate?.points || 500);
                                setEditLineTaskReviewType(matchedTemplate?.review_type || 'leader');
                                setEditLineTaskMaxCompletions(matchedTemplate?.max_completions || 1);
                                setEditLineTaskActive(matchedTemplate?.is_active !== false);
                              }}
                              className="btn-action px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-black rounded-lg hover:bg-red-500/20"
                            >
                              編輯設定
                            </button>
                          </div>
                          
                          {/* Evolved Beast Preview */}
                          {line.image_url && (
                            <div className="flex items-center gap-2 bg-slate-900/40 p-2 rounded-xl light:bg-white/40 border border-white/5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={line.image_url} alt={line.name} className="w-8 h-8 object-contain rounded" />
                              <div className="flex flex-col">
                                <span className="text-[9px] text-slate-400 font-bold">解鎖等級門檻：Lv.{line.unlock_level || 5}</span>
                                <span className="text-[9px] text-amber-500 truncate max-w-[180px]">任務：{matchedTemplate ? matchedTemplate.title : '未設定'}</span>
                              </div>
                            </div>
                          )}

                          <p className="text-[11px] text-slate-400 leading-relaxed light:text-slate-600">{line.description}</p>
                        </div>
                        <div className="border-t border-white/5 pt-2 mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[9px] text-slate-500 light:border-slate-200">
                          <span>核心特質:</span>
                          <span className="text-amber-500 font-bold">{line.core_traits || '未設定'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* ==================== 3. 學員培育進度 ==================== */}
          {petSubTab === 'progress' && (
            <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 select-none pb-2 border-b border-white/5 light:border-slate-200">
                <h3 className="font-black text-white text-base">
                  🎓 學員神獸培育進度總覽
                </h3>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 font-bold">篩選期數：</label>
                  <select
                    value={progressBatchId}
                    onChange={e => setProgressBatchId(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-red-500 light:bg-white light:border-slate-300 light:text-slate-800"
                  >
                    <option value="all">全部期數</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-white/5 rounded-2xl overflow-hidden light:bg-slate-50 light:border-slate-300">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 font-bold uppercase light:border-slate-200 select-none">
                      <th className="p-3">學員姓名</th>
                      <th className="p-3">當前經驗 (EXP)</th>
                      <th className="p-3">成長等級</th>
                      <th className="p-3">契合流派</th>
                      <th className="p-3">進化型態 / 考驗進度</th>
                      <th className="p-3 text-right">進化判定時間點</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 light:divide-slate-200">
                    {(() => {
                      const filteredUserPets = userPets?.filter(up => {
                        if (progressBatchId === 'all') return true;
                        return up.profile?.batch_id === progressBatchId;
                      }) || [];

                      if (filteredUserPets.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                              目前該期數尚無學員解鎖或擁有神獸。
                            </td>
                          </tr>
                        );
                      }

                      return filteredUserPets.map(up => {
                        const lineLabel = up.pet_line === 'dragon' ? '影響力龍系' : up.pet_line === 'lion' ? '行動力獅系' : up.pet_line === 'fox' ? '親和力狐系' : up.pet_line === 'spirit' ? '穩定靈獸系' : '無/混沌之卵';
                        const evolved = up.current_stage_index > 1;
                        
                        // Determine evolution status description
                        let evolutionStatusText = '混沌之卵';
                        if (evolved) {
                          evolutionStatusText = `已進化 (${up.stage?.stage_name || '神獸型態'})`;
                        } else if (up.level >= 5) {
                          if (up.selected_evolution_line) {
                            const selectedLine = petLines.find(l => l.line_key === up.selected_evolution_line);
                            const template = selectedLine ? missionTemplates.find(t => t.id === selectedLine.task_template_id) : null;
                            evolutionStatusText = `進化考驗中：${template ? template.title : '未知任務'}`;
                          } else {
                            evolutionStatusText = '可進化 (待學員點選)';
                          }
                        } else {
                          evolutionStatusText = '培育中 (未達 Lv.5)';
                        }

                        return (
                          <tr key={up.id}>
                            <td className="p-3 font-bold text-white">{up.profile?.name || '未知學員'}</td>
                            <td className="p-3 text-amber-500 font-black">{up.profile?.score?.toLocaleString()} EXP</td>
                            <td className="p-3 text-indigo-400 font-black">LV. {up.level || 0}</td>
                            <td className="p-3 font-bold text-slate-300 light:text-slate-800">
                              <span className={up.pet_line ? 'text-pink-400 animate-pulse' : 'text-slate-500'}>{lineLabel}</span>
                            </td>
                            <td className="p-3 font-bold text-slate-200 light:text-slate-800">
                              {evolutionStatusText}
                            </td>
                            <td className="p-3 text-right text-slate-500 font-mono">
                              {up.first_reached_lv5_at ? new Date(up.first_reached_lv5_at).toLocaleString() : '未達 LV.5'}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </section>
          )}
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
                    placeholder="如：每日定課經驗加成 10%"
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

      {/* ==================== 學員名單管理分頁 ==================== */}
      {adminTab === 'roster' && (
        <div className="space-y-6 animate-in fade-in duration-300 text-left">
          
          <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 light:bg-white light:border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="font-black text-white text-lg flex items-center gap-2 light:text-slate-900">
                <Users size={20} className="text-amber-500" />
                學員名單管理 ({profiles.length} 人)
              </h3>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={rosterBatchFilter}
                  onChange={(e) => setRosterBatchFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-800"
                >
                  <option value="all">所有期數</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="搜尋姓名或手機..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-800 w-full sm:w-48"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-450 font-bold border-b border-white/5 light:bg-slate-100 light:border-slate-300 light:text-slate-600">
                    <th className="p-3">姓名</th>
                    <th className="p-3">手機</th>
                    <th className="p-3">期數</th>
                    <th className="p-3">角色/小隊</th>
                    <th className="p-3">狀態</th>
                    <th className="p-3">經驗值</th>
                    <th className="p-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles
                    .filter(p => rosterBatchFilter === 'all' || p.batch_id === rosterBatchFilter)
                    .filter(p => p.name.includes(rosterSearch) || (p.phone && p.phone.includes(rosterSearch)))
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map(p => {
                      const isEditing = editingProfileId === p.id;
                      const batchName = batches.find(b => b.id === p.batch_id)?.name || '未指定';
                      const teamName = teams.find(t => t.id === p.team_id)?.name || '未分配';
                      return (
                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors light:border-slate-200 light:hover:bg-slate-50">
                          {isEditing ? (
                            <>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={editingProfileData.name || ''}
                                  onChange={e => setEditingProfileData({ ...editingProfileData, name: e.target.value })}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white outline-none focus:border-amber-500"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={editingProfileData.phone || ''}
                                  onChange={e => setEditingProfileData({ ...editingProfileData, phone: e.target.value })}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white outline-none focus:border-amber-500"
                                />
                              </td>
                              <td className="p-3">
                                <select
                                  value={editingProfileData.batch_id || ''}
                                  onChange={e => setEditingProfileData({ ...editingProfileData, batch_id: e.target.value })}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white outline-none focus:border-amber-500"
                                >
                                  <option value="">未指定</option>
                                  {batches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-3">
                                <div className="space-y-1">
                                  <select
                                    value={editingProfileData.role || 'student'}
                                    onChange={e => setEditingProfileData({ ...editingProfileData, role: e.target.value as UserRole })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white outline-none focus:border-amber-500"
                                  >
                                    <option value="student">學員</option>
                                    <option value="captain">小隊長</option>
                                    <option value="admin">大隊長</option>
                                  </select>
                                  <select
                                    value={editingProfileData.team_id || ''}
                                    onChange={e => setEditingProfileData({ ...editingProfileData, team_id: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white outline-none focus:border-amber-500"
                                  >
                                    <option value="">未分配小隊</option>
                                    {teams.filter(t => !editingProfileData.batch_id || t.batch_id === editingProfileData.batch_id).map(t => (
                                      <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                              <td className="p-3">
                                <select
                                  value={editingProfileData.status || 'active'}
                                  onChange={e => setEditingProfileData({ ...editingProfileData, status: e.target.value as any })}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white outline-none focus:border-amber-500"
                                >
                                  <option value="active">使用中</option>
                                  <option value="ended">已結業</option>
                                  <option value="inactive">已停用</option>
                                </select>
                              </td>
                              <td className="p-3 text-emerald-400 font-bold">{p.score}</td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={async () => {
                                      if (onUpdateProfile) {
                                        await onUpdateProfile(p.id, editingProfileData);
                                        setEditingProfileId(null);
                                      }
                                    }}
                                    disabled={isSyncing}
                                    className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded transition-colors"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => setEditingProfileId(null)}
                                    className="p-1.5 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-3 font-bold text-white light:text-slate-900">{p.name}</td>
                              <td className="p-3 text-slate-400 font-mono">{p.phone || '-'}</td>
                              <td className="p-3 text-purple-400 font-bold">{batchName}</td>
                              <td className="p-3">
                                <div className="flex flex-col gap-1">
                                  <span className={`text-[10px] px-2 py-0.5 rounded w-max font-bold ${
                                    p.role === 'admin' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                                    p.role === 'captain' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                    'bg-slate-800 text-slate-300 light:bg-slate-200'
                                  }`}>
                                    {p.role === 'admin' ? '大隊長' : p.role === 'captain' ? '小隊長' : '學員'}
                                  </span>
                                  <span className="text-slate-500">{teamName}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                                  p.status === 'inactive' ? 'border-red-500 text-red-500' :
                                  p.status === 'ended' ? 'border-slate-500 text-slate-500' :
                                  'border-emerald-500 text-emerald-500'
                                }`}>
                                  {p.status === 'inactive' ? '停用' : p.status === 'ended' ? '結業' : '使用中'}
                                </span>
                              </td>
                              <td className="p-3 text-emerald-400 font-bold">{p.score}</td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingProfileId(p.id);
                                      setEditingProfileData({
                                        name: p.name,
                                        phone: p.phone,
                                        batch_id: p.batch_id,
                                        role: p.role,
                                        team_id: p.team_id,
                                        status: p.status
                                      });
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded transition-colors"
                                    title="編輯"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`確定要將學員 ${p.name} 設為「停用」嗎？\n資料會保留但不顯示。`)) {
                                        if (onDeleteProfile) {
                                          await onDeleteProfile(p.id);
                                        }
                                      }
                                    }}
                                    disabled={isSyncing}
                                    className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-500/10 rounded transition-colors"
                                    title="停用"
                                  >
                                    <X size={14} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`【警告】確定要徹底刪除學員 ${p.name} 的所有資料嗎？\n這個操作無法復原，會導致連帶的小隊分數異常，強烈建議使用「停用」功能就好！\n如果堅持刪除，請按確定。`)) {
                                        if (onHardDeleteProfile) {
                                          await onHardDeleteProfile(p.id);
                                        }
                                      }
                                    }}
                                    disabled={isSyncing}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                    title="強制徹底刪除"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
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
                    <th className="p-3 text-center">排行榜公開</th>
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
                            <td className="p-2 text-center">
                              {/* Placeholder for rankings_visible column in editing mode */}
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
                            <td className="p-3 text-center select-none">
                              {(() => {
                                const isEndWithin7Days = (new Date(batch.end_date).getTime() - Date.now()) <= 7 * 86400000;
                                return (
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                    batch.rankings_visible === true
                                      ? 'bg-green-500/10 text-green-400'
                                      : batch.rankings_visible === false
                                      ? 'bg-red-500/10 text-red-400'
                                      : isEndWithin7Days
                                      ? 'bg-red-500/10 text-red-400'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {batch.rankings_visible === true 
                                      ? '公開中 (手動)' 
                                      : batch.rankings_visible === false 
                                      ? '封印中 (手動)' 
                                      : isEndWithin7Days 
                                      ? '封印中 (倒數)' 
                                      : '常規公開'}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="p-3 text-right select-none space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => startEditBatch(batch)}
                                className="px-2 py-1 bg-slate-900 border border-white/5 text-[10px] rounded hover:border-amber-500/30 text-amber-400 font-bold light:bg-slate-100 light:border-slate-300 cursor-pointer inline-block"
                              >
                                編輯期數
                              </button>
                              {(() => {
                                const isEndWithin7Days = (new Date(batch.end_date).getTime() - Date.now()) <= 7 * 86400000;
                                const isCurrentlyLocked = batch.rankings_visible === false || (batch.rankings_visible !== true && isEndWithin7Days);
                                return (
                                  <button
                                    onClick={() => onUpdateBatch?.(batch.id, { rankings_visible: isCurrentlyLocked })}
                                    className={`px-2 py-1 border text-[10px] rounded font-bold cursor-pointer inline-block ${
                                      !isCurrentlyLocked 
                                        ? 'bg-slate-800 border-white/5 text-slate-300 hover:text-white' 
                                        : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
                                    }`}
                                  >
                                    {!isCurrentlyLocked ? '隱藏排行' : '公開排行'}
                                  </button>
                                );
                              })()}
                              {onDeleteBatch && (
                                <button
                                  onClick={() => {
                                    if (confirm(`⚠️ 確定要刪除「${batch.name}」這個期數嗎？\n\n此操作無法復原，該期數的相關任務與規則資料也會一併刪除。`)) {
                                      onDeleteBatch(batch.id);
                                    }
                                  }}
                                  className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-[10px] rounded hover:bg-red-500 hover:text-white text-red-400 font-bold cursor-pointer inline-block transition-colors"
                                >
                                  🗑️ 刪除
                                </button>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {batches.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
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
                                    <span className="text-slate-500 font-bold select-none">無需額外設定 (比賽期間內限做 {template.max_completions || 1} 次)</span>
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
                                          onChange={e => updateLocalRuleField(template.id, 'duration_days', Number(e.target.value))}
                                          className="w-16 shrink-0 bg-slate-950 border border-slate-800 text-white rounded-lg p-2 text-xs text-center outline-none focus:border-red-500 light:bg-slate-50 light:border-slate-200 light:text-slate-900 font-mono font-bold"
                                        />
                                        <span className="text-slate-400 light:text-slate-600 font-bold">天</span>
                                      </div>

                                      <span className="text-[10px] text-slate-500 font-bold bg-slate-900/60 light:bg-slate-200/50 px-2.5 py-1 rounded border border-white/5 light:border-slate-300/60 shrink-0 select-none">
                                        限做 {template.max_completions || 1} 次
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
      )}

      {/* Apply Batch Mission Rules Confirm Modal */}
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

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-md p-5 my-auto rounded-3xl border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200 light:bg-white light:border-slate-200">
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

                <div className="grid grid-cols-3 gap-2 select-none">
                  <div>
                    <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">任務類型</label>
                    <select
                      value={taskType}
                      onChange={e => handleTaskTypeChange(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-2 text-[11px] outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                    >
                      <option value="daily">每日定課</option>
                      <option value="weekly">每週任務</option>
                      <option value="temporary">特殊任務</option>
                      <option value="limited">限時任務</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">任務分類</label>
                    <select
                      value={taskCategory}
                      onChange={e => setTaskCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-2 text-[11px] outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
                    >
                      {missionCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 light:text-slate-500 font-bold mb-1">獎勵經驗分</label>
                    <input
                      required
                      type="number"
                      value={taskScore}
                      onChange={e => setTaskScore(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl py-2 px-2 text-[11px] outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all light:bg-slate-50 light:border-slate-200 light:text-slate-900"
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

    </div>
  );
}

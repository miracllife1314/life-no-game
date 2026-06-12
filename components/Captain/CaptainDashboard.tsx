'use client';

import React, { useState, useEffect } from 'react';
import { Profile, Team, Task, Submission, StudentNote, ScoreLog, Batch, UserRole } from '@/types';
import { 
  Compass, Users, MessageSquare, Check, CheckCircle2,
  Clock, AlertCircle, Circle, Save, Edit3, Filter, 
  ShieldAlert, Dices, Loader2, UserCheck, Pencil, Heart,
  ChevronDown, ChevronUp, ExternalLink, Shield, Crown, Settings, Send,
  BookOpen, ImageIcon, Quote, Sparkles, ListChecks, Timer, ScrollText, Share2, Link
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { nowTaipei, parseTaipei, taipeiDay } from '@/lib/time';

interface SquadMemberWithRole {
  userId: string;
  name: string;
  questRoles: string[];
}

interface CaptainDashboardProps {
  team: Team | null;
  profiles: Profile[];
  tasks: Task[];
  submissions: Submission[];
  notes: StudentNote[];
  scoreLogs: ScoreLog[];
  currentUserId: string;
  onSaveNote: (studentId: string, noteText: string) => Promise<void>;
  isSyncing: boolean;
  onRefresh?: () => Promise<void>;
  onUpdateTeamSettings?: (teamId: string, settings: Partial<Team>) => Promise<void>;
  batches?: Batch[];
  gmMode?: boolean;
  onReviewSubmission?: (subId: string, status: 'approved' | 'rejected', shareToWitness?: boolean) => Promise<void>;
  onToggleCell?: (studentId: string, taskId: string) => Promise<void>;
  allTeams?: Team[];
  currentUserRole?: UserRole;
  onAdminSelectTeam?: (teamId: string) => void;
}

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
  '蕭雅韓': '九天玄女(智慧)',
  '蔡宗玹': '雷公(活力)'
};

function getCountdownText(endTimeStr: string | undefined): { text: string; isUrgent: boolean; isExpired: boolean } | null {
  if (!endTimeStr) return null;
  const endTime = parseTaipei(endTimeStr).getTime();
  const now = nowTaipei().getTime();
  const diff = endTime - now;
  if (diff <= 0) {
    return { text: '已截止', isUrgent: true, isExpired: true };
  }
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 3) {
    return { text: `剩餘 ${diffDays} 天`, isUrgent: false, isExpired: false };
  } else if (diffDays > 0) {
    return { text: `剩餘 ${diffDays} 天 ${diffHours} 小時`, isUrgent: false, isExpired: false };
  } else {
    return { text: `僅剩 ${diffHours} 小時 ${diffMins} 分`, isUrgent: true, isExpired: false };
  }
}

function getTaskTypeBadge(task: Task) {
  if (task.type === 'daily') {
    return <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">每日</span>;
  }
  if (task.type === 'weekly') {
    return <span className="text-[8px] font-black text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">每週</span>;
  }
  if (task.name.includes('限時') || task.name.includes('最後一週') || task.name.includes('限定')) {
    return <span className="text-[8px] font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">限時</span>;
  }
  return <span className="text-[8px] font-black text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded">特殊</span>;
}

export function CaptainDashboard({
  team,
  profiles,
  tasks,
  submissions,
  notes,
  scoreLogs,
  currentUserId,
  onSaveNote,
  isSyncing,
  onRefresh,
  onUpdateTeamSettings,
  batches = [],
  gmMode = false,
  onReviewSubmission,
  onToggleCell,
  allTeams = [],
  currentUserRole,
  onAdminSelectTeam
}: CaptainDashboardProps) {
  // Get members of this team (both students and captain)
  const squadMembers = profiles.filter(p => p.team_id === team?.id);

  // Sort squad members so the captain is first, and students are sorted by score descending
  const sortedMembers = [...squadMembers].sort((a, b) => {
    if (a.role === 'captain' && b.role !== 'captain') return -1;
    if (a.role !== 'captain' && b.role === 'captain') return 1;
    return b.score - a.score;
  });

  // Calculate dynamic squad metrics
  const currentBatch = batches.find(b => b.id === team?.batch_id);
  const batchName = currentBatch ? currentBatch.name : '未指派期數';
  const teamIdStr = team?.id || '未指派編號';
  const squadCaptain = team ? profiles.find(p => p.id === team.captain_id) : null;
  const directorProfile = squadCaptain?.director_id ? profiles.find(p => p.id === squadCaptain.director_id) : null;

  // Filter and sort tasks for the matrix display:
  // 1. Daily tasks show date in name (e.g. (6/11) 每日五感恩).
  // 2. All daily tasks are grouped at the front, ordered by publish time.
  // 3. Other tasks (weekly, temporary, limited) are placed after daily tasks.
  const getPublishDatePart = (timeStr: string) => {
    if (!timeStr) return null;
    const match = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return {
        yyyyStr: match[1],
        mmStr: match[2],
        ddStr: match[3],
        month: parseInt(match[2], 10),
        day: parseInt(match[3], 10)
      };
    }
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return {
        yyyyStr: String(d.getFullYear()),
        mmStr: String(d.getMonth() + 1).padStart(2, '0'),
        ddStr: String(d.getDate()).padStart(2, '0'),
        month: d.getMonth() + 1,
        day: d.getDate()
      };
    }
    return null;
  };

  const matrixTasks = tasks
    .map(t => {
      const isDaily = t.type === 'daily';
      if (isDaily && t.publish_time) {
        const datePart = getPublishDatePart(t.publish_time);
        if (datePart) {
          return {
            ...t,
            name: `(${datePart.month}/${datePart.day}) ${t.name}`
          };
        }
      }
      return t;
    })
    .sort((a, b) => {
      const aIsDaily = a.type === 'daily';
      const bIsDaily = b.type === 'daily';
      
      if (aIsDaily && !bIsDaily) return -1;
      if (!aIsDaily && bIsDaily) return 1;
      
      // If both are daily, sort by publish time ascending
      if (aIsDaily && bIsDaily) {
        const aTime = a.publish_time ? new Date(a.publish_time).getTime() : 0;
        const bTime = b.publish_time ? new Date(b.publish_time).getTime() : 0;
        return aTime - bTime;
      }
      
      return 0;
    });

  // Group matrix tasks by date or ID to assign alternating background classes and group borders
  let currentGroupKey = '';
  let groupColorIndex = -1;
  const taskGroupMeta = matrixTasks.map((t, index) => {
    const isDaily = t.type === 'daily';
    let groupKey = '';
    
    if (isDaily && t.publish_time) {
      const datePart = getPublishDatePart(t.publish_time);
      groupKey = datePart ? `${datePart.yyyyStr}-${datePart.mmStr}-${datePart.ddStr}` : t.id;
    } else {
      groupKey = t.id;
    }
    
    if (groupKey !== currentGroupKey) {
      groupColorIndex++;
      currentGroupKey = groupKey;
      return {
        id: t.id,
        groupColorIndex,
        isGroupStart: true
      };
    }
    
    return {
      id: t.id,
      groupColorIndex,
      isGroupStart: false
    };
  });

  const getTaskGroupClass = (taskId: string, isHeader = false) => {
    const meta = taskGroupMeta.find(m => m.id === taskId);
    if (!meta) return '';
    
    const bgClass = meta.groupColorIndex % 2 === 0
      ? (isHeader ? 'bg-slate-950/40 light:bg-slate-100/80' : 'bg-slate-950/10 light:bg-slate-50/20')
      : (isHeader ? 'bg-slate-900/60 light:bg-slate-200/80' : 'bg-slate-900/30 light:bg-slate-100/40');
      
    const borderClass = meta.isGroupStart
      ? 'border-l border-white/10 light:border-slate-300'
      : '';
      
    return `${bgClass} ${borderClass}`;
  };

  const squadStudents = sortedMembers.filter(p => p.role === 'student' || p.role === 'captain');
  const dailyMissions = tasks.filter(t => t.type === 'daily');
  const weeklyMissions = tasks.filter(t => t.type === 'weekly');
  const specialMissions = tasks.filter(t => t.type === 'temporary' || t.type === 'limited');

  let totalDailyPossible = 0;
  let totalDailyCompleted = 0;
  let totalWeeklyPossible = 0;
  let totalWeeklyCompleted = 0;
  let totalSpecialPossible = 0;
  let totalSpecialCompleted = 0;

  squadStudents.forEach(m => {
    dailyMissions.forEach(t => {
      const limit = t.max_completions ?? 1;
      const effectiveLimit = limit === 0 ? 1 : limit;
      totalDailyPossible += effectiveLimit;
      
      const approvedCount = submissions.filter(s => s.mission_id === t.id && s.student_id === m.id && s.status === 'approved').length;
      totalDailyCompleted += Math.min(approvedCount, effectiveLimit);
    });
    weeklyMissions.forEach(t => {
      const limit = t.max_completions ?? 1;
      const effectiveLimit = limit === 0 ? 1 : limit;
      totalWeeklyPossible += effectiveLimit;
      
      const approvedCount = submissions.filter(s => s.mission_id === t.id && s.student_id === m.id && s.status === 'approved').length;
      totalWeeklyCompleted += Math.min(approvedCount, effectiveLimit);
    });
    specialMissions.forEach(t => {
      const limit = t.max_completions ?? 1;
      const effectiveLimit = limit === 0 ? 1 : limit;
      totalSpecialPossible += effectiveLimit;
      
      const approvedCount = submissions.filter(s => s.mission_id === t.id && s.student_id === m.id && s.status === 'approved').length;
      totalSpecialCompleted += Math.min(approvedCount, effectiveLimit);
    });
  });

  const teamDailyRate = totalDailyPossible > 0 ? Math.round((totalDailyCompleted / totalDailyPossible) * 100) : 0;
  const teamWeeklyRate = totalWeeklyPossible > 0 ? Math.round((totalWeeklyCompleted / totalWeeklyPossible) * 100) : 0;
  const teamSpecialRate = totalSpecialPossible > 0 ? Math.round((totalSpecialCompleted / totalSpecialPossible) * 100) : 0;

  // Member selection for details panel
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  // Toggle state for score details panel for each member
  const [showMemberScores, setShowMemberScores] = useState<Record<string, boolean>>({});

  // Submissions hidden from the witness wall
  const [hiddenWitnessIds, setHiddenWitnessIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      setHiddenWitnessIds(JSON.parse(localStorage.getItem('nlp_witness_hidden') || '[]'));
    } catch (e) {}
  }, []);

  const toggleWitnessVisibility = (subId: string) => {
    setHiddenWitnessIds(prev => {
      const next = prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId];
      localStorage.setItem('nlp_witness_hidden', JSON.stringify(next));
      return next;
    });
  };

  // Matrix display state
  const [showMatrix, setShowMatrix] = useState(true);

  // Note edit state
  const [editingNoteText, setEditingNoteText] = useState('');

  // Local settings for mock features (squad name, weekly quest draw, quest roles)
  const [teamDisplayName, setTeamDisplayName] = useState(team?.custom_name || team?.name || '樂樂嘻遊隊');
  const [teamSlogan, setTeamSlogan] = useState('樂樂嘻遊，五運順流');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [sloganInput, setSloganInput] = useState('');
  
  // AI briefing simulation
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);
  const [aiBriefing, setAiBriefing] = useState<{
    teamMorale: 'high' | 'medium' | 'low';
    teamSummary: string;
    topPerformer: string;
    needsSupport: string[];
    suggestion: string;
  } | null>(null);

  // Quest Draw Simulation
  const [drawnQuest, setDrawnQuest] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawHistory, setDrawHistory] = useState<string[]>([]);

  // Quest Roles assignment simulation
  const [squadRoles, setSquadRoles] = useState<Record<string, string[]>>({});
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  // Manual Check-in Confirm Modal States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);
  const [confirmStudentId, setConfirmStudentId] = useState<string | null>(null);

  // Lightbox for proof images
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Member selection for bottom settings panel
  const [selectedSettingMemberId, setSelectedSettingMemberId] = useState<string>('');

  useEffect(() => {
    const map: Record<string, string> = {};
    sortedMembers.forEach(member => {
      const note = notes.find(n => n.student_id === member.id && n.captain_id === currentUserId)?.note || '';
      map[member.id] = note;
    });
    setNotesMap(map);
  }, [notes, profiles, team?.id, currentUserId]);

  // Load local mock configs on mount
  useEffect(() => {
    if (team) {
      setTeamDisplayName(team.custom_name || team.name);
      
      const key = `nlp_captain_settings_${team.id}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.slogan) setTeamSlogan(parsed.slogan);
        if (parsed.drawnQuest) setDrawnQuest(parsed.drawnQuest);
        if (parsed.drawHistory) setDrawHistory(parsed.drawHistory);
        if (parsed.squadRoles) setSquadRoles(parsed.squadRoles);
      }
    }
  }, [team]);

  // Save local configs helper
  const saveLocalSettings = (updates: any) => {
    if (!team) return;
    const key = `nlp_captain_settings_${team.id}`;
    const stored = localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : {};
    const nextSettings = { ...parsed, ...updates };
    localStorage.setItem(key, JSON.stringify(nextSettings));
  };

  if (!team) {
    return (
      <div className="glass-panel p-10 rounded-3xl text-center text-slate-500 font-bold max-w-md mx-auto">
        <ShieldAlert size={48} className="mx-auto text-amber-500 mb-4" />
        您目前尚未指派小隊。如需測試，請大隊長至【指揮部】小隊分配將您分配至小隊並指派為小隊長。
      </div>
    );
  }

  // Filter tasks (daily & weekly tasks currently active)
  const activeTasks = tasks.filter(t => t.type === 'daily' || t.type === 'weekly');
  const dailyQuests = tasks.filter(t => t.type === 'daily');

  const getMemberTaskProgress = (studentId: string, taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const limit = task?.max_completions ?? 1;

    const studentSubs = submissions.filter(s => s.mission_id === taskId && s.student_id === studentId);
    const validSubs = studentSubs.filter(s => s.status !== 'rejected');
    const approvedCount = validSubs.filter(s => s.status === 'approved').length;
    const pendingCount = validSubs.filter(s => s.status === 'pending').length;
    const isDone = limit > 0 && validSubs.length >= limit;

    return { limit, approvedCount, pendingCount, totalValid: validSubs.length, isDone };
  };

  // Helper to check individual task completion
  const getMemberTaskStatus = (studentId: string, taskId: string) => {
    const { isDone, pendingCount, totalValid } = getMemberTaskProgress(studentId, taskId);
    if (isDone) {
      return pendingCount > 0 ? 'pending' : 'approved';
    }
    const studentSubs = submissions.filter(s => s.mission_id === taskId && s.student_id === studentId);
    const hasRejected = studentSubs.some(s => s.status === 'rejected');
    return hasRejected && totalValid === 0 ? 'rejected' : 'none';
  };

  const getTodayScore = (studentId: string) => {
    const todayStr = taipeiDay();
    return submissions
      .filter(s => s.student_id === studentId && s.status === 'approved' && taipeiDay(s.created_at) === todayStr)
      .reduce((sum, s) => sum + (s.score_awarded || 0), 0);
  };

  // Edit Note Handlers (Auto-saving on Blur)
  const handleNoteChangeLocal = (memberId: string, value: string) => {
    setNotesMap(prev => ({ ...prev, [memberId]: value }));
  };

  const handleNoteBlur = async (memberId: string) => {
    const noteText = notesMap[memberId] || '';
    try {
      await onSaveNote(memberId, noteText);
    } catch (err) {
      console.error('Error auto-saving note:', err);
    }
  };

  const toggleMemberScores = (memberId: string) => {
    setShowMemberScores(prev => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  // Squad Display Name Edit
  const handleSaveName = () => {
    if (!nameInput.trim()) return;
    const finalSlogan = sloganInput.trim() || '樂樂嘻遊，五運順流';
    setTeamDisplayName(nameInput.trim());
    setTeamSlogan(finalSlogan);
    saveLocalSettings({ 
      slogan: finalSlogan
    });
    if (team && onUpdateTeamSettings) {
      onUpdateTeamSettings(team.id, {
        custom_name: nameInput.trim()
      });
    }
    setEditingName(false);
  };

  // AI Briefing Simulation
  const handleGetAIBriefing = () => {
    setIsLoadingBriefing(true);
    setAiBriefing(null);
    
    setTimeout(() => {
      setIsLoadingBriefing(false);
      const topMemberName = sortedMembers[1]?.name || sortedMembers[0]?.name || '張品嬋';
      const needsCareName = sortedMembers[3]?.name || sortedMembers[2]?.name || '莊俊琦';
      
      setAiBriefing({
        teamMorale: teamDailyRate >= 80 ? 'high' : teamDailyRate >= 50 ? 'medium' : 'low',
        teamSummary: `本分隊打卡進度為 ${totalDailyCompleted + totalWeeklyCompleted}/${totalDailyPossible + totalWeeklyPossible}。定課達成率為 ${teamDailyRate}%，任務達成率為 ${teamWeeklyRate}%。`,
        topPerformer: `${topMemberName}：目前獲得個人經驗 ${sortedMembers[1]?.score || 0}，為小隊主力！`,
        needsSupport: teamDailyRate < 85 ? [needsCareName] : [],
        suggestion: `建議小隊長多鼓勵大家，本週推薦引導組員多在群組交流「卓越狀態」心錨的重塑練習。`
      });
    }, 1200);
  };

  // Quest Draw Simulation
  const handleDrawQuest = () => {
    if (dailyQuests.length === 0) return;
    setIsDrawing(true);
    
    setTimeout(() => {
      const remainingQuests = dailyQuests.filter(q => !drawHistory.includes(q.id));
      const pool = remainingQuests.length > 0 ? remainingQuests : dailyQuests;
      
      const randomIndex = Math.floor(Math.random() * pool.length);
      const chosen = pool[randomIndex];
      
      setDrawnQuest(chosen.name);
      const nextHistory = [...drawHistory, chosen.id];
      if (nextHistory.length > dailyQuests.length) {
        setDrawHistory([chosen.id]);
        saveLocalSettings({ drawnQuest: chosen.name, drawHistory: [chosen.id] });
      } else {
        setDrawHistory(nextHistory);
        saveLocalSettings({ drawnQuest: chosen.name, drawHistory: nextHistory });
      }
      setIsDrawing(false);
    }, 1000);
  };

  // Quest Roles assignment
  const handleRoleChange = (memberId: string, selectedRoleId: string) => {
    setSavingMemberId(memberId);
    
    setTimeout(() => {
      const nextSquadRoles = { 
        ...squadRoles, 
        [memberId]: selectedRoleId ? [selectedRoleId] : [] 
      };
      setSquadRoles(nextSquadRoles);
      saveLocalSettings({ squadRoles: nextSquadRoles });
      setSavingMemberId(null);
    }, 300);
  };

  // Squad submission review (Captain preliminary review)
  const memberIds = sortedMembers.map(m => m.id);
  const squadPendingReviews = submissions.filter(s => s.status === 'pending' && memberIds.includes(s.student_id));

  const handleReviewSubmissionLocal = async (subId: string, approve: boolean, shareToWitness?: boolean) => {
    setSavingMemberId(subId);
    try {
      const reviewStatus = approve ? 'approved' : 'rejected';
      if (onReviewSubmission) {
        await onReviewSubmission(subId, reviewStatus, shareToWitness);
      } else {
        const sub = submissions.find(s => s.id === subId);
        const scoreAwarded = approve ? (sub?.mission?.points ?? tasks.find(t => t.id === sub?.mission_id)?.score ?? 0) : 0;

        await supabase
          .from('submissions')
          .update({
            status: reviewStatus,
            score_awarded: scoreAwarded,
            share_to_witness: approve ? !!shareToWitness : false,
            reviewed_by: currentUserId,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', subId);
        
        if (onRefresh) await onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingMemberId(null);
    }
  };

  const handleToggleCell = async (studentId: string, taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setSavingMemberId(studentId);
    try {
      if (onToggleCell) {
        await onToggleCell(studentId, taskId);
      } else {
        const limit = task.max_completions ?? 1;
        const studentSubs = submissions.filter(s => s.mission_id === taskId && s.student_id === studentId);
        
        const pendingSubs = studentSubs.filter(s => s.status === 'pending');
        const approvedSubs = studentSubs.filter(s => s.status === 'approved');
        
        const sortedPending = [...pendingSubs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const sortedApproved = [...approvedSubs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        if (sortedPending.length > 0) {
          await supabase.from('submissions').update({
            status: 'approved',
            score_awarded: task.score,
            reviewed_by: currentUserId,
            reviewed_at: new Date().toISOString()
          }).eq('id', sortedPending[0].id);
        } else if (limit === 0 || approvedSubs.length < limit) {
          await supabase.from('submissions').insert({
            mission_id: taskId,
            student_id: studentId,
            proof_text: '由小隊長於指揮所手動設定打卡',
            proof_image_url: null,
            proof_link: null,
            status: 'approved',
            score_awarded: task.score,
            reviewed_by: currentUserId,
            reviewed_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
        } else {
          await supabase.from('submissions').delete().eq('id', sortedApproved[0].id);
        }
        
        if (onRefresh) await onRefresh();
      }
    } catch (err) {
      console.error('Error toggling cell:', err);
    } finally {
      setSavingMemberId(null);
    }
  };

  const triggerManualCheckin = (studentId: string, task: Task) => {
    setConfirmStudentId(studentId);
    setConfirmTask(task);
    setShowConfirmModal(true);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* 大隊長專屬：小隊切換選單 */}
      {currentUserRole === 'admin' && allTeams && allTeams.length > 0 && (
        <div className="flex items-center gap-2 bg-slate-900/60 p-4 rounded-3xl border border-white/5 w-fit light:bg-slate-100 light:border-slate-200 select-none">
          <span className="text-xs text-slate-400 font-bold light:text-slate-500">大隊長專屬檢視切換：</span>
          <select
            value={team?.id || ''}
            onChange={(e) => onAdminSelectTeam && onAdminSelectTeam(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-white rounded-xl py-1.5 px-3 text-xs outline-none focus:border-red-500 light:bg-white light:border-slate-200 light:text-slate-900 cursor-pointer"
          >
            {allTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.custom_name ? `(${t.custom_name})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 🧭 隊長權限指揮所 (Squad Roster Header) */}
      <div className="glass-panel p-6 rounded-4xl border border-white/10 relative light:bg-white light:border-slate-200">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
          {/* Left Details */}
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-widest">
              <ShieldAlert size={16} /> 
              隊長權限指揮所
            </div>
            
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-black text-white italic light:text-slate-900">
                {teamDisplayName}
              </h2>
              <Shield size={20} className="text-amber-500 fill-amber-500/10" />
            </div>

            <p className="text-sm text-slate-400 italic font-medium">{teamSlogan}</p>
            <p className="text-xs text-slate-500 font-bold flex flex-wrap gap-x-2 gap-y-1 items-center">
              <span>期數：<span className="text-amber-500">{batchName}</span></span>
              {directorProfile && (
                <>
                  <span className="text-slate-650">|</span>
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span>所屬大隊：{directorProfile.division_name || '未填寫'} ·</span>
                    <span className="inline-flex items-center gap-0.5 text-amber-500 font-bold bg-amber-500/5 border border-amber-500/20 px-1.5 py-0.5 rounded-lg text-[10px] select-none">
                      👑 {directorProfile.name}
                    </span>
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Right Scores & Action */}
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 shrink-0 bg-slate-950/40 p-4 rounded-3xl border border-white/5 light:bg-slate-100/50 light:border-slate-200">
            <div className="text-left md:text-right space-y-0.5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">小隊總分</span>
              <div className="text-4xl font-black text-amber-500 font-mono tracking-tight">
                {(team.total_score || 0).toLocaleString()}
              </div>
            </div>

            {editingName ? (
              <div className="flex flex-col gap-2 w-full max-w-[200px]">
                <input 
                  value={nameInput} 
                  onChange={e => setNameInput(e.target.value)} 
                  placeholder="輸入小隊自訂名稱"
                  className="bg-slate-950 border border-amber-500/50 rounded-xl px-2.5 py-1 text-white text-xs outline-none focus:border-amber-400" 
                />
                <input 
                  value={sloganInput} 
                  onChange={e => setSloganInput(e.target.value)} 
                  placeholder="輸入小隊口號"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-white text-xs outline-none focus:border-amber-400" 
                />
                <div className="flex gap-1.5 justify-end">
                  <button 
                    onClick={handleSaveName}
                    className="px-2.5 py-1.5 bg-amber-500 text-slate-950 font-black text-[10px] rounded-lg"
                  >
                    儲存
                  </button>
                  <button 
                    onClick={() => setEditingName(false)}
                    className="px-2.5 py-1.5 bg-slate-800 text-slate-300 text-[10px] rounded-lg"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => { setNameInput(teamDisplayName); setSloganInput(teamSlogan); setEditingName(true); }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 transition-all text-white font-black text-xs rounded-xl shadow-lg shadow-sky-600/10 flex items-center gap-1.5"
              >
                <Settings size={12} /> 編輯小隊資訊
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 📊 小隊整體學習指標 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-300">
        {/* 1. 每日定課打卡進度 */}
        <div className="glass-panel p-5 rounded-3xl text-left border border-white/10 light:bg-white light:border-slate-200 shadow-sm flex flex-col justify-between min-h-[145px]">
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">每日定課打卡進度</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-amber-500 font-mono">
                {totalDailyCompleted} / {totalDailyPossible} 件
              </span>
              <span className="text-sm font-black text-amber-500 font-mono">({teamDailyRate}%)</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5 mt-2 light:bg-slate-100 light:border-slate-300">
              <div 
                className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                style={{ width: `${teamDailyRate}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] text-slate-500 light:text-slate-650 font-bold block mt-2">組員每日習慣養成，展現小隊基礎修行紀律</span>
        </div>

        {/* 2. 每週任務打卡進度 */}
        <div className="glass-panel p-5 rounded-3xl text-left border border-white/10 light:bg-white light:border-slate-200 shadow-sm flex flex-col justify-between min-h-[145px]">
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">每週任務打卡進度</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-amber-500 font-mono">
                {totalWeeklyCompleted} / {totalWeeklyPossible} 件
              </span>
              <span className="text-sm font-black text-amber-500 font-mono">({teamWeeklyRate}%)</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5 mt-2 light:bg-slate-100 light:border-slate-300">
              <div 
                className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                style={{ width: `${teamWeeklyRate}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] text-slate-500 light:text-slate-650 font-bold block mt-2">每週主線任務進度，展現核心心法修行深度</span>
        </div>

        {/* 3. 特殊任務打卡進度 */}
        <div className="glass-panel p-5 rounded-3xl text-left border border-white/10 light:bg-white light:border-slate-200 shadow-sm flex flex-col justify-between min-h-[145px]">
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">特殊任務打卡進度</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-teal-400 font-mono">
                {totalSpecialCompleted} / {totalSpecialPossible} 件
              </span>
              <span className="text-sm font-black text-teal-400 font-mono">({teamSpecialRate}%)</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5 mt-2 light:bg-slate-100 light:border-slate-300">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-450 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(20,184,166,0.3)]"
                style={{ width: `${teamSpecialRate}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] text-slate-500 light:text-slate-650 font-bold block mt-2">限時加分與挑戰，展現小隊衝刺與積極度</span>
        </div>
      </div>

      {/* 🔗 小隊專屬招募通道 */}
      <section className="glass-panel p-6 rounded-3xl border border-white/10 text-left space-y-4 light:bg-white light:border-slate-200">
        <div className="flex items-center gap-2 font-black text-sm text-white light:text-slate-900">
          <Share2 size={18} className="text-purple-400" />
          小隊專屬招募通道
        </div>
        
        {team ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Column 1: QR Code */}
            <div className="flex flex-col items-center justify-center bg-slate-950/40 p-4 rounded-2xl border border-white/5 light:bg-slate-50">
              <div className="bg-white p-2 rounded-xl shadow-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                    typeof window !== 'undefined'
                      ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/?invite=${team.invite_code || ''}&batch=${team.batch_id || ''}&team=${team.id || ''}`
                      : ''
                  )}`}
                  alt="Invitation QR Code"
                  className="w-[130px] h-[130px]"
                />
              </div>
              <span className="text-[10px] text-slate-500 font-bold mt-2">掃碼立即加入小隊</span>
            </div>

            {/* Column 2: Link and Status */}
            <div className="space-y-3 md:col-span-2">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">小隊專屬邀請連結</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    type="text"
                    value={
                      typeof window !== 'undefined'
                        ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/?invite=${team.invite_code || ''}&batch=${team.batch_id || ''}&team=${team.id || ''}`
                        : ''
                    }
                    className="flex-1 rounded-xl px-3 py-2 text-xs font-mono outline-none invite-link-input-black"
                  />
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/?invite=${team.invite_code || ''}&batch=${team.batch_id || ''}&team=${team.id || ''}`);
                        alert('邀請連結已複製到剪貼簿！');
                      }
                    }}
                    className="btn-action bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    複製
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">招募通道狀態</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateTeamSettings && onUpdateTeamSettings(team.id, { invite_enabled: !team.invite_enabled })}
                      className={`btn-action font-bold text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        team.invite_enabled
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-red-500/10 border-red-500 text-red-400 hover:bg-red-500/20'
                      }`}
                    >
                      {team.invite_enabled ? '● 已啟動招募' : '○ 已關閉招募'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    小隊上限 ({profiles.filter(p => p.team_id === team.id && p.role === 'student').length} / {team.max_members || 10})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={team.max_members || 10}
                    onChange={(e) => onUpdateTeamSettings && onUpdateTeamSettings(team.id, { max_members: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-505 italic">您目前無所屬小隊，無法開啟招募通道。</p>
        )}
      </section>

      {/* 📊 小隊打卡進度矩陣 */}
      <section className="glass-panel p-5 rounded-3xl border border-white/10 text-left space-y-4 light:bg-white light:border-slate-200">
        <div 
          onClick={() => setShowMatrix(!showMatrix)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 font-black text-sm text-white light:text-slate-900">
            <ListChecks size={18} className="text-amber-500" />
            小隊打卡進度矩陣（任務明細觀察）
          </div>
          <div className="text-[10px] font-black text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-xl border border-white/5 light:bg-slate-100 light:border-slate-300">
            {showMatrix ? '收合矩陣 ▲' : '展開矩陣 ▼'}
          </div>
        </div>

        {showMatrix && (
          <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
            <div className="overflow-x-auto rounded-2xl border border-white/5 light:border-slate-300">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-450 font-bold border-b border-white/5 light:bg-slate-100 light:border-slate-300 light:text-slate-600">
                    <th className="p-3.5 whitespace-nowrap min-w-[90px] sticky left-0 z-20 bg-slate-950 light:bg-slate-100 border-r border-white/5 light:border-slate-300 shadow-[4px_0_8px_rgba(0,0,0,0.15)]">成員</th>
                    {matrixTasks.map(task => (
                      <th 
                        key={task.id} 
                        className={`p-3.5 text-center min-w-[120px] ${getTaskGroupClass(task.id, true)}`}
                        title={task.name}
                      >
                        <div className="flex flex-col items-center gap-1">
                          {getTaskTypeBadge(task)}
                          <span className="block font-black text-[10px] text-white light:text-slate-800 whitespace-normal leading-tight text-center">
                            {task.name}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 light:divide-slate-200">
                  {sortedMembers.map(member => {
                    const isCap = member.role === 'captain';
                    return (
                      <tr 
                        key={member.id}
                        className="hover:bg-white/2 bg-slate-900/10 light:bg-transparent light:hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-3.5 font-black text-white light:text-slate-900 whitespace-nowrap font-mono sticky left-0 z-10 bg-slate-950 light:bg-white border-r border-white/5 light:border-slate-200 shadow-[4px_0_8px_rgba(0,0,0,0.15)]">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isCap ? 'bg-amber-500' : 'bg-slate-500'}`} />
                            {member.name}
                            {isCap && <span className="text-[8px] bg-amber-500/20 text-amber-500 px-1 rounded font-sans">長</span>}
                          </div>
                        </td>
                         {matrixTasks.map(task => {
                           return (
                             <td 
                               key={task.id}
                               className={`p-3.5 text-center align-middle ${getTaskGroupClass(task.id, false)}`}
                             >
                               <div className="flex items-center justify-center h-full">
                                 {(() => {
                                   const { limit, approvedCount, pendingCount, isDone } = getMemberTaskProgress(member.id, task.id);

                                   if (pendingCount > 0) {
                                     return (
                                       <button 
                                         onClick={() => handleToggleCell(member.id, task.id)}
                                         title={`待審核: ${pendingCount}次 (點擊可通過核准)${approvedCount > 0 ? `，已完成: ${approvedCount}次` : ''}`}
                                         className="p-1 rounded hover:bg-slate-800 transition-colors shrink-0 flex items-center gap-0.5 animate-pulse"
                                       >
                                         <Clock size={16} className="text-amber-500" />
                                         {pendingCount > 1 && <span className="text-[10px] font-black text-amber-400">x{pendingCount}</span>}
                                         {approvedCount > 0 && (
                                           <span className="text-[10px] font-black text-emerald-500 flex items-center ml-0.5">
                                             (✓x{approvedCount})
                                           </span>
                                         )}
                                       </button>
                                     );
                                   }

                                   if (approvedCount > 0) {
                                     return (
                                       <button 
                                         onClick={() => handleToggleCell(member.id, task.id)}
                                         title={isDone 
                                           ? `已達上限完成 ${approvedCount} 次 (點擊可撤銷最後一次打卡)` 
                                           : `已完成 ${approvedCount} 次 / 上限 ${limit === 0 ? '無限制' : `${limit}次`} (點擊可手動加簽次數)`
                                         }
                                         className="p-1 rounded hover:bg-slate-800 transition-colors shrink-0 flex items-center gap-0.5"
                                       >
                                         <CheckCircle2 size={16} className="text-emerald-500" />
                                         {approvedCount > 1 && <span className="text-[10px] font-black text-emerald-400">x{approvedCount}</span>}
                                         {!isDone && (
                                           <span className="text-[10px] font-black text-slate-500 hover:text-amber-500 ml-0.5">
                                             +
                                           </span>
                                         )}
                                       </button>
                                     );
                                   }

                                   const studentSubs = submissions.filter(s => s.mission_id === task.id && s.student_id === member.id);
                                   const hasRejected = studentSubs.some(s => s.status === 'rejected');
                                   if (hasRejected) {
                                     return (
                                       <button 
                                         title="已被駁回"
                                         className="p-1 rounded shrink-0 cursor-default"
                                       >
                                         <AlertCircle size={16} className="text-red-400" />
                                       </button>
                                     );
                                   }

                                   return (
                                     <button 
                                       title="尚未打卡"
                                       className="p-1 rounded shrink-0 text-slate-700 cursor-default"
                                     >
                                       <Circle size={16} />
                                     </button>
                                   );
                                 })()}
                               </div>
                             </td>
                           );
                         })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend & Tips */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 text-[10px] text-slate-500 font-bold select-none pt-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> 已完成</span>
                <span className="flex items-center gap-1"><Clock size={12} className="text-amber-500 animate-pulse" /> 待審核</span>
                <span className="flex items-center gap-1"><AlertCircle size={12} className="text-red-400" /> 被退回</span>
                <span className="flex items-center gap-1"><Circle size={12} className="text-slate-700" /> 未打卡</span>
              </div>
              <p className="text-amber-500/80">※ 小提示：點擊矩陣即可直接為該隊員進行審核與撤銷</p>
            </div>
          </div>
        )}
      </section>

      {/* 👥 小隊成員修行狀態與管理 (Screenshot Style Roster) */}
      <section className="space-y-4 text-left">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2 justify-between light:border-slate-200">
          <div className="flex items-center gap-2 font-black text-sm text-slate-400">
            <Users size={16} className="text-amber-500" />
            小隊成員 ({sortedMembers.length}/{sortedMembers.length})
          </div>
          <span className="text-[10px] text-slate-500 font-mono">點擊卡片以展開/收合任務進度與補簽</span>
        </div>

        <div className="space-y-3">
          {sortedMembers.map(member => {
            const isCaptain = member.role === 'captain';
            const isExpanded = expandedMemberId === member.id;
            
            // Note & Character
            const noteText = notesMap[member.id] || '';
            const characterDesc = noteText || DEFAULT_CHARACTERS[member.name] || '未指定備註角色';
            
            // Score calculations
            const todayGained = getTodayScore(member.id);
            const level = Math.min(99, Math.floor(member.score / 1000) + 1);
            


            return (
              <div 
                key={member.id} 
                className={`glass-panel border overflow-hidden rounded-3xl transition-all duration-300 ${
                  isExpanded 
                    ? 'border-amber-500/40 shadow-xl bg-slate-900/60 shadow-amber-500/5 light:border-amber-500/50 light:bg-slate-50/50' 
                    : 'border-white/5 bg-slate-900/40 hover:border-white/10 hover:bg-slate-900/50 light:border-slate-200 light:bg-white'
                }`}
              >
                {/* Basic Info Row */}
                <div 
                  onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                  className="p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
                >
                  {/* Left: Avatar, Name, Description */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative shrink-0">
                      {/* Initials Avatar */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-base shadow-inner transition-colors ${
                        isCaptain 
                          ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950' 
                          : 'bg-slate-800 text-slate-300 border border-white/5 light:bg-slate-150 light:border-slate-350 light:text-slate-600'
                      }`}>
                        {member.name.substring(0, 1)}
                      </div>
                      
                      {/* Captain Crown Overlay */}
                      {isCaptain && (
                        <div className="absolute -top-1.5 -left-1.5 bg-amber-400 border border-slate-950 text-slate-950 p-0.5 rounded-full shadow-md animate-pulse">
                          <Crown size={12} className="fill-slate-950" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-white text-base leading-none light:text-slate-900">
                          {member.name}
                        </span>
                        {isCaptain && (
                          <span className="text-[9px] font-black bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-md border border-amber-500/20">
                            小隊長
                          </span>
                        )}
                        {/* Assigned role badge — shown next to name like the captain badge */}
                        {!isCaptain && squadRoles[member.id]?.[0] && (() => {
                          const roleDef = QUEST_ROLES_DEFS.find(r => r.id === squadRoles[member.id][0]);
                          return roleDef ? (
                            <span className="text-[9px] font-black bg-teal-500/15 text-teal-400 px-2 py-0.5 rounded-md border border-teal-500/20">
                              {roleDef.name}
                            </span>
                          ) : null;
                        })()}
                        <span className="text-[9px] font-black bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded-full light:bg-slate-200 light:text-slate-600 font-mono">
                          LV.{level}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-400 font-medium truncate max-w-[200px] sm:max-w-md light:text-slate-500">
                        {characterDesc}
                      </div>
                    </div>
                  </div>

                  {/* Right: Scores & Expand Icon */}
                  <div className="flex items-center gap-5 shrink-0">
                    <div className="text-right space-y-0.5 select-none">
                      <div className="text-lg font-black text-amber-500 font-mono leading-none">
                        {member.score.toLocaleString()}
                      </div>
                      <div className={`text-[10px] font-bold leading-none ${todayGained > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        ↑ 今日 +{todayGained}
                      </div>
                      <div className="text-[8px] text-slate-600 leading-none font-mono">
                        (0:00結算)
                      </div>
                    </div>

                    {isExpanded ? (
                      <ChevronUp size={16} className="text-slate-400 transition-transform" />
                    ) : (
                      <ChevronDown size={16} className="text-slate-500 transition-transform" />
                    )}
                  </div>
                </div>

                {/* Expanded Details Roster Area */}
                {isExpanded && (
                  <div className="border-t border-white/5 p-5 bg-slate-950/30 space-y-6 animate-in slide-in-from-top-2 duration-300 light:border-slate-200 light:bg-slate-100/30">
                    

                    {/* 📊 Member Progress Overview & Tasks */}
                    {(() => {
                      // Get all task statuses for this member
                      const memberTasks = tasks.map(task => {
                        const progress = getMemberTaskProgress(member.id, task.id);
                        const status = getMemberTaskStatus(member.id, task.id);
                        const sub = submissions.find(s => s.mission_id === task.id && s.student_id === member.id);
                        return { task, status, sub, progress };
                      });

                      const pendingTasks = memberTasks.filter(item => item.progress.pendingCount > 0);
                      const completedTasks = memberTasks.filter(item => item.progress.isDone);
                      const uncompletedTasks = memberTasks.filter(item => {
                        if (item.progress.isDone || item.progress.pendingCount > 0) return false;
                        
                        // 隱藏進化任務
                        if (item.task.category === '神獸進化' || String((item.task as any).template_id || '').startsWith('temp-evolve')) return false;

                        // 只顯示當時區（當前有效）的未完成任務
                        const now = new Date();
                        const dNowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                        
                        const pubStr = item.task.start_time || item.task.publish_time;
                        let dPubDay = 0;
                        if (pubStr) {
                          const d = new Date(pubStr);
                          dPubDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                        }
                        
                        let dDeadDay = Infinity;
                        if (item.task.end_time) {
                          const d = new Date(item.task.end_time);
                          dDeadDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                        }

                        if (item.task.type === 'daily') {
                          // 每日定課只顯示當天
                          return dPubDay === dNowDay;
                        } else {
                          // 其他任務只要時間在範圍內即可
                          return dNowDay >= dPubDay && dNowDay <= dDeadDay;
                        }
                      });

                      const totalCount = memberTasks.length;
                      const completedCount = completedTasks.length;
                      const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                      return (
                        <div className="space-y-5">
                          {/* Split Progress Bars (Daily Quests vs Other Quests) */}
                          {(() => {
                            const dailyTotal = memberTasks
                              .filter(item => item.task.type === 'daily')
                              .reduce((sum, item) => sum + (item.progress.limit === 0 ? 1 : item.progress.limit), 0);
                            const dailyCompleted = memberTasks
                              .filter(item => item.task.type === 'daily')
                              .reduce((sum, item) => sum + Math.min(item.progress.approvedCount, item.progress.limit === 0 ? 1 : item.progress.limit), 0);
                            const dailyPercent = dailyTotal > 0 ? Math.round((dailyCompleted / dailyTotal) * 100) : 0;

                            const otherTotal = memberTasks
                              .filter(item => item.task.type !== 'daily')
                              .reduce((sum, item) => sum + (item.progress.limit === 0 ? 1 : item.progress.limit), 0);
                            const otherCompleted = memberTasks
                              .filter(item => item.task.type !== 'daily')
                              .reduce((sum, item) => sum + Math.min(item.progress.approvedCount, item.progress.limit === 0 ? 1 : item.progress.limit), 0);
                            const otherPercent = otherTotal > 0 ? Math.round((otherCompleted / otherTotal) * 100) : 0;

                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-2xl border border-white/5 select-none light:bg-white light:border-slate-300">
                                {/* Daily Quest Progress */}
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center text-[11px] font-black">
                                    <span className="text-amber-500">🔥 每日定課達成率</span>
                                    <span className="text-amber-500 font-mono">{dailyCompleted} / {dailyTotal} ({dailyPercent}%)</span>
                                  </div>
                                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5 light:bg-slate-100 light:border-slate-300">
                                    <div 
                                      className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                                      style={{ width: `${dailyPercent}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Other Quests Progress */}
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center text-[11px] font-black">
                                    <span className="text-teal-450">🌀 其他任務達成率</span>
                                    <span className="text-teal-400 font-mono">{otherCompleted} / {otherTotal} ({otherPercent}%)</span>
                                  </div>
                                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5 light:bg-slate-100 light:border-slate-300">
                                    <div 
                                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                      style={{ width: `${otherPercent}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* 📜 分數明細選單 */}
                          {(() => {
                            const memberLogs = scoreLogs
                              .filter(log => log.student_id === member.id)
                              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                            const isShowing = !!showMemberScores[member.id];

                            return (
                              <div className="bg-slate-900/40 rounded-2xl border border-white/5 p-4 space-y-3 light:bg-white light:border-slate-300">
                                <div 
                                  onClick={() => toggleMemberScores(member.id)}
                                  className="flex justify-between items-center cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-500">
                                    <ScrollText size={13} />
                                    <span>經驗分數明細 ({memberLogs.length} 筆記錄)</span>
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-bold hover:text-amber-500">
                                    {isShowing ? '隱藏明細 ▲' : '展開明細 ▼'}
                                  </span>
                                </div>

                                {isShowing && (
                                  <div className="divide-y divide-white/5 max-h-[200px] overflow-y-auto pr-1 animate-in slide-in-from-top-1 duration-200 light:divide-slate-200">
                                    {memberLogs.length === 0 ? (
                                      <p className="text-[10px] text-slate-500 text-center py-4 font-medium">目前無經驗增減記錄</p>
                                    ) : (
                                      memberLogs.map(log => {
                                        const isPositive = log.amount >= 0;
                                        
                                        let displayReason = log.reason;
                                        if (displayReason === '完成任務' && log.submission_id) {
                                          const sub = submissions.find(s => s.id === log.submission_id);
                                          if (sub) {
                                            const t = tasks.find(t => t.id === sub.mission_id);
                                            if (t) {
                                              let prefix = '[特殊]';
                                              if (t.type === 'daily') prefix = '[每日]';
                                              else if (t.type === 'weekly') prefix = '[每週]';
                                              else if (t.type === 'limited' || t.name.includes('限時') || t.name.includes('最後一週')) prefix = '[限時]';
                                              
                                              displayReason = `完成任務：${prefix} ${t.name}`;
                                            }
                                          }
                                        }

                                        return (
                                          <div key={log.id} className="flex justify-between items-center py-2 text-xs first:pt-0 last:pb-0">
                                            <div className="text-left space-y-0.5 min-w-0 pr-2">
                                              <div className="text-white font-bold light:text-slate-800 text-[11px] truncate" title={displayReason}>{displayReason}</div>
                                              <div className="text-[9px] text-slate-500 font-mono">{new Date(log.created_at).toLocaleString()}</div>
                                            </div>
                                            <span className={`font-black text-xs font-mono shrink-0 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                              {isPositive ? `+${log.amount}` : log.amount}
                                            </span>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* 1. Pending Review Section (待審核) */}
                          {pendingTasks.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
                                <Clock size={11} className="text-purple-400 animate-pulse" />
                                待審核任務 ({pendingTasks.length})
                              </div>
                              <div className="grid grid-cols-1 gap-3">
                                {pendingTasks.map(({ task, sub }) => (
                                  <div 
                                    key={task.id} 
                                    className="bg-purple-950/20 border border-purple-500/20 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-[0_0_15px_rgba(168,85,247,0.05)]"
                                  >
                                    <div className="space-y-1.5 text-left min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-black text-white">{task.name}</span>
                                        {getTaskTypeBadge(task)}
                                        <span className="text-[9px] font-black text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-mono">+{task.score}分</span>
                                      </div>
                                      {sub && sub.proof_text && (
                                        <div className="text-xs text-slate-350 italic pl-2.5 border-l-2 border-purple-500/30 py-0.5 whitespace-pre-wrap">
                                          「{sub.proof_text}」
                                        </div>
                                      )}
                                      {sub && sub.proof_image_url && (
                                        <button
                                          onClick={e => { e.stopPropagation(); setLightboxSrc(sub.proof_image_url!); }}
                                          className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 font-bold mt-1 cursor-pointer"
                                        >
                                          <ImageIcon size={11} />
                                          查看截圖證明
                                        </button>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-purple-400 bg-purple-500/10 px-2.5 py-1.5 rounded-xl border border-purple-500/20 font-black shrink-0 sm:self-center select-none text-right">
                                      ⏳ 請於下方審核區審批
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 2. Uncompleted Section (尚未打卡) */}
                          <div className="space-y-2">
                            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
                              <Circle size={10} className="fill-amber-500/10 text-amber-500" />
                              尚未完成打卡 ({uncompletedTasks.length})
                            </div>
                            
                            {uncompletedTasks.length === 0 ? (
                              <div className="bg-slate-900/40 p-4 rounded-2xl text-center text-xs text-slate-500 font-bold border border-white/5 light:bg-slate-100">
                                🎉 太棒了！今日所有修行任務已全部打卡完成！
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                                {uncompletedTasks.map(({ task, status }) => {
                                  const { limit, approvedCount } = getMemberTaskProgress(member.id, task.id);
                                  return (
                                    <div 
                                      key={task.id} 
                                      className="bg-slate-900 border border-white/5 p-4 rounded-2xl flex flex-col justify-between gap-3 shadow-sm light:bg-white light:border-slate-355"
                                    >
                                      <div className="space-y-1 text-left">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-xs font-black text-white light:text-slate-900 block truncate max-w-[150px]" title={task.name}>
                                            {task.name}
                                          </span>
                                          {getTaskTypeBadge(task)}
                                          <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/10 font-mono">
                                            +{task.score}分
                                          </span>
                                          {limit === 0 ? (
                                            <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/10 font-mono">
                                              已打卡 {approvedCount} 次 / 無限制
                                            </span>
                                          ) : limit > 1 ? (
                                            <span className="text-[9px] font-black text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/10 font-mono">
                                              已打卡 {approvedCount} / {limit} 次
                                            </span>
                                          ) : null}
                                        </div>
                                        <span className="text-[10px] text-slate-500 block leading-normal line-clamp-2 light:text-slate-650">
                                          {task.description}
                                        </span>
                                      </div>

                                      {/* Action button - Hidden for everyone right now as requested */}
                                      {/*
                                      {currentUserRole === 'admin' && (
                                      <div className="flex justify-end pt-1 select-none">
                                        <button
                                          onClick={() => triggerManualCheckin(member.id, task)}
                                          className="w-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 active:scale-95 transition-all text-slate-950 text-[10px] font-black py-1.5 px-3 rounded-xl shadow-[0_0_10px_rgba(245,158,11,0.15)] border border-amber-400/20 cursor-pointer text-center"
                                        >
                                          {approvedCount > 0 ? `繼續補簽 (已打卡 ${approvedCount} 次) →` : '手動補簽 / 立即完成'}
                                        </button>
                                      </div>
                                      )}
                                      */}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* 3. Completed Section (已完成) */}
                          <div className="space-y-2">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
                              <Check size={11} className="text-slate-500" />
                              已完成打卡 ({completedTasks.length})
                            </div>

                            {completedTasks.length === 0 ? (
                              <div className="bg-slate-900/20 p-4 rounded-2xl text-center text-xs text-slate-500 font-bold border border-white/5 light:bg-slate-100">
                                尚未有已完成打卡
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                                {completedTasks.map(({ task, sub }) => (
                                  <div 
                                    key={task.id} 
                                    onClick={() => handleToggleCell(member.id, task.id)}
                                    className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between gap-2.5 opacity-65 hover:opacity-100 transition-all cursor-pointer select-none light:bg-slate-200/50 light:border-slate-300"
                                    title="點擊可以取消打卡"
                                  >
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-xs font-bold text-slate-450 line-through truncate max-w-[120px] light:text-slate-650">
                                          {task.name}
                                        </span>
                                        {getTaskTypeBadge(task)}
                                      </div>
                                      <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10 font-black flex items-center gap-0.5 shrink-0">
                                        <Check size={10} /> +{task.score}分
                                      </span>
                                      {(() => {
                                        const { limit, approvedCount } = getMemberTaskProgress(member.id, task.id);
                                        if (limit === 0) {
                                          return (
                                            <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/10 font-mono shrink-0">
                                              已完成 {approvedCount} 次
                                            </span>
                                          );
                                        } else if (limit > 1) {
                                          return (
                                            <span className="text-[9px] font-black text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/10 font-mono shrink-0">
                                              已完成 {approvedCount} / {limit} 次
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                    {sub && sub.proof_text && sub.proof_text !== '由小隊長於指揮所手動設定打卡' && (
                                      <div className="space-y-1.5">
                                        <div className="text-[9px] text-slate-500 italic pl-2 border-l border-white/10 select-all light:text-slate-650 light:border-slate-350">
                                          證明：{sub.proof_text}
                                        </div>
                                        
                                        {/* Captain toggles witness wall visibility */}
                                        <div className="pt-0.5">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation(); // prevent triggering handleToggleCell
                                              toggleWitnessVisibility(sub.id);
                                            }}
                                            className={`text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 select-none transition-all active:scale-95 border ${
                                              hiddenWitnessIds.includes(sub.id)
                                                ? 'bg-red-500/10 border-red-500/10 text-red-400'
                                                : 'bg-purple-500/10 border-purple-500/10 text-purple-400'
                                            }`}
                                          >
                                            {hiddenWitnessIds.includes(sub.id) ? '🙈 見證牆已隱藏' : '👁️ 見證牆顯示中'}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                    {sub && sub.proof_image_url && (
                                      <div className="text-[9px] text-sky-400 font-bold flex items-center gap-0.5">
                                        <ImageIcon size={10} /> 含圖片證明
                                      </div>
                                    )}
                                    <div className="text-[8px] text-slate-600 font-mono text-right mt-1">
                                      點擊以撤銷打卡 ↩
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
 
      {/* ⚙️ 小隊成員備註與職責設定 */}
      <section className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 text-left light:bg-white light:border-slate-200">
        <h3 className="text-sm font-black text-white border-b border-white/5 pb-3 flex items-center gap-2 select-none light:border-slate-200 light:text-slate-900">
          <Settings size={16} className="text-amber-500" />
          小隊成員備註與職責指派
        </h3>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
              選擇小組成員
            </label>
            <select
              value={selectedSettingMemberId}
              onChange={(e) => setSelectedSettingMemberId(e.target.value)}
              className="w-full text-xs bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5 text-slate-300 font-bold outline-none focus:border-amber-500 focus:bg-slate-950 transition-all light:bg-white light:border-slate-350 light:text-slate-800"
            >
              <option value="">-- 請選擇組員 --</option>
              {sortedMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name} {member.role === 'captain' ? '(小隊長)' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedSettingMemberId && (() => {
            const member = sortedMembers.find(m => m.id === selectedSettingMemberId);
            if (!member) return null;
            const isCaptain = member.role === 'captain';
            const noteText = notesMap[member.id] || '';
            const currentRole = squadRoles[member.id]?.[0] || '';

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5 light:border-slate-200 animate-in fade-in duration-200">
                {/* 1. Remarks Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    編輯角色與備註（如：嫦娥(抱抱)）
                  </label>
                  <input
                    type="text"
                    value={noteText}
                    placeholder={DEFAULT_CHARACTERS[member.name] || "例如：如來佛祖(大隊長)"}
                    onBlur={() => handleNoteBlur(member.id)}
                    onChange={(e) => handleNoteChangeLocal(member.id, e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5 text-slate-300 outline-none focus:border-amber-500 focus:bg-slate-950 transition-all light:bg-white light:border-slate-300 light:text-slate-800"
                  />
                  <p className="text-[9px] text-slate-500 italic">備註輸入後移開焦點（Blur）將自動同步與儲存</p>
                </div>

                {/* 2. Duty Selection */}
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
                      value={currentRole}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className="w-full text-xs bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5 text-slate-300 font-bold outline-none focus:border-teal-500 focus:bg-slate-950 transition-all light:bg-white light:border-slate-300 light:text-slate-800"
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

      {/* 🤖 AI 隊務 analysis */}
      <section className="glass-panel p-6 rounded-3xl border border-purple-500/20 space-y-4 text-left light:bg-white light:border-purple-500/30">
        <h3 className="text-sm font-black text-white border-b border-white/5 pb-3 flex items-center gap-2 select-none light:border-slate-200">
          <span>🤖</span> AI 隊務分析
        </h3>
        <p className="text-xs text-slate-400 font-bold leading-relaxed light:text-slate-600">
          即時分析本小隊成員近 7 天修行打卡表現，識別本週之星與需要加強關懷輔導的隊員。
        </p>
        <button
          disabled={isLoadingBriefing}
          onClick={handleGetAIBriefing}
          className="w-full btn-action flex items-center justify-center gap-2 bg-purple-600 p-3 rounded-2xl text-white font-black text-xs shadow-lg hover:bg-purple-500 active:scale-95 disabled:opacity-50"
        >
          {isLoadingBriefing ? (
            <><Loader2 size={16} className="animate-spin" /> 分析中，請稍候…</>
          ) : (
            <>🤖 開始分析隊務</>
          )}
        </button>

        {aiBriefing && (
          <div className="space-y-4 pt-2 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                aiBriefing.teamMorale === 'high' ? 'bg-emerald-500/20 text-emerald-400' :
                aiBriefing.teamMorale === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {aiBriefing.teamMorale === 'high' ? '士氣高昂 ↑' :
                 aiBriefing.teamMorale === 'medium' ? '士氣持平 →' : '士氣低迷 ↓'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed light:text-slate-500">{aiBriefing.teamSummary}</p>
            <div className="bg-slate-900 rounded-2xl p-4 space-y-1 light:bg-slate-100">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">本週之星</p>
              <p className="text-xs text-white font-bold light:text-slate-900">{aiBriefing.topPerformer}</p>
            </div>
            {aiBriefing.needsSupport.length > 0 && (
              <div className="bg-slate-900 rounded-2xl p-4 space-y-2 light:bg-slate-100">
                <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">需要關懷</p>
                <div className="flex flex-wrap gap-2">
                  {aiBriefing.needsSupport.map(name => (
                    <span key={name} className="px-2.5 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-bold rounded-lg border border-yellow-500/20">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-4 light:bg-purple-50/20">
              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">本週引導建議</p>
              <p className="text-xs text-slate-300 leading-relaxed light:text-slate-600">{aiBriefing.suggestion}</p>
            </div>
          </div>
        )}
      </section>

      {/* 🎲 本週推薦定課抽籤 (Quest Drawing) */}
      <section className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 text-center light:bg-white light:border-slate-200">
        <h3 className="text-sm font-black text-white border-b border-white/5 pb-3 text-left select-none light:border-slate-200">
          🎲 本週推薦定課抽籤
        </h3>
        
        {drawnQuest ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 font-bold">本週小隊推薦定課為：</p>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 max-w-sm mx-auto">
              <p className="text-2xl font-black text-amber-500">「{drawnQuest}」</p>
              <p className="text-[10px] text-slate-500 mt-2 font-mono">已於本週抽選啟動</p>
            </div>
            <button 
              onClick={handleDrawQuest}
              disabled={isDrawing}
              className="text-slate-500 hover:text-amber-500 transition-colors text-xs font-bold"
            >
              🎲 重新抽籤
            </button>
          </div>
        ) : (
          <div className="space-y-4 py-2 text-center">
            <p className="text-xs text-slate-400 font-bold leading-relaxed max-w-md mx-auto">
              每週一抽選推薦定課，引導組員在本週重點突破此項溝通技巧。<br />
              定課庫剩餘 {dailyQuests.length} 項。
            </p>
            <button 
              disabled={isDrawing || dailyQuests.length === 0} 
              onClick={handleDrawQuest}
              className="w-full btn-action flex items-center justify-center gap-2 bg-amber-500 text-slate-950 p-3 rounded-2xl text-xs font-black shadow-lg"
            >
              <Dices size={16} /> 
              {isDrawing ? '命運抽選中...' : '🎲 抽選本週推薦定課'}
            </button>
          </div>
        )}
      </section>

      {/* ❤️ 任務審核（小隊長初審） */}
      <section className="glass-panel p-6 rounded-3xl border border-amber-500/20 space-y-4 text-left light:bg-white light:border-amber-500/30">
        <h3 className="text-sm font-black text-white border-b border-white/5 pb-3 flex items-center gap-1.5 light:border-slate-200">
          <Heart size={16} className="text-amber-500" />
          任務初審區（限組員待審核提交）
        </h3>
        
        {squadPendingReviews.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4 font-bold">目前無待初審的組員提交件</p>
        ) : (
          <div className="space-y-4">
            {squadPendingReviews.map(app => (
              <div key={app.id} className="bg-slate-900 p-4 rounded-2xl border border-white/5 space-y-3 light:bg-slate-100 light:border-slate-300">
                <div className="flex justify-between items-start select-none">
                  <div>
                    <p className="font-black text-white text-xs light:text-slate-900">{app.profile?.name}</p>
                    <p className="text-[10px] text-amber-500 mt-1 font-bold">任務：{app.mission?.title || tasks.find(t => t.id === app.mission_id)?.name || '未知任務'}</p>
                  </div>
                  <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg">待初審</span>
                </div>
                
                {app.proof_text && (
                  <p className="text-xs text-slate-300 italic border-l-2 border-white/10 pl-2 py-0.5 light:border-slate-355 light:text-slate-650">
                    「 {app.proof_text} 」
                  </p>
                )}

                {/* Toggle to show/hide in witness section */}
                {(app.proof_text || app.proof_image_url) && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id={`share-witness-${app.id}`}
                      defaultChecked={!hiddenWitnessIds.includes(app.id)}
                      onChange={(e) => {
                        const isShared = e.target.checked;
                        setHiddenWitnessIds(prev => {
                          const next = isShared 
                            ? prev.filter(id => id !== app.id)
                            : prev.includes(app.id) ? prev : [...prev, app.id];
                          localStorage.setItem('nlp_witness_hidden', JSON.stringify(next));
                          return next;
                        });
                      }}
                      className="rounded border-white/10 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-slate-950/60 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor={`share-witness-${app.id}`} className="text-[11px] text-slate-450 font-bold select-none cursor-pointer light:text-slate-600">
                      同時發佈至見證分享牆
                    </label>
                  </div>
                )}
                
                <div className="flex gap-2 pt-2 select-none">
                  <button
                    onClick={() => handleReviewSubmissionLocal(app.id, false)}
                    className="flex-1 py-2 bg-red-500/10 text-red-400 font-bold rounded-xl text-xs border border-red-500/20 active:scale-95 transition-all"
                  >
                    ❌ 駁回
                  </button>
                  <button
                    onClick={() => handleReviewSubmissionLocal(app.id, true, false)}
                    className="flex-1 py-2 bg-amber-500 text-slate-950 font-black rounded-xl text-xs active:scale-95 transition-all shadow-md shadow-amber-500/10"
                  >
                    ✅ 初審通過
                  </button>
                  <button
                    onClick={() => handleReviewSubmissionLocal(app.id, true, true)}
                    title="通過並分享到見證牆"
                    className="flex-1 py-2 bg-purple-500 text-white font-black rounded-xl text-xs active:scale-95 transition-all shadow-md shadow-purple-500/10"
                  >
                    ✅ 上見證牆
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ⚠️ 補簽確認 Modal */}
      {showConfirmModal && confirmTask && confirmStudentId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 animate-bounce">
                <CheckCircle2 size={32} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">
                  確認要幫組員補簽？
                </h3>
                <p className="text-sm font-bold text-amber-500">
                  {profiles.find(p => p.id === confirmStudentId)?.name} 的「{confirmTask.name}」
                </p>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto light:text-slate-600">
                  補簽後，系統將直接核准該任務，並發放該組員 <span className="text-amber-500 font-bold">+{confirmTask.score}</span> 點經驗積分。
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmTask(null);
                  setConfirmStudentId(null);
                }}
                className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirmStudentId && confirmTask) {
                    await handleToggleCell(confirmStudentId, confirmTask.id);
                  }
                  setShowConfirmModal(false);
                  setConfirmTask(null);
                  setConfirmStudentId(null);
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
              >
                確認完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🖼️ Lightbox Modal */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-900/80 border border-white/20 flex items-center justify-center text-white hover:bg-slate-800 transition-colors z-10 text-xl font-black"
            aria-label="關閉"
          >
            ✕
          </button>

          {/* Back label */}
          <div className="absolute top-4 left-4 flex items-center gap-2 text-slate-400 text-xs font-bold select-none">
            <span className="text-lg">←</span> 點擊任意處返回
          </div>

          {/* Image */}
          <img
            src={lightboxSrc}
            alt="佐證圖片"
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

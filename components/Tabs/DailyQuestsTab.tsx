'use client';

import React, { useState } from 'react';
import { Task, Submission, Announcement, Profile, Mission, UserPet, PetStage, Batch, PetLine, MissionTemplate } from '@/types';
import { nowTaipei, parseTaipei } from '@/lib/time';
import { parsePetOffset } from '@/lib/petImage';
import { 
  CheckCircle2, Circle, Clock, MessageSquare, 
  AlertCircle, FileText, Send, Flame, Sparkles, 
  Star, Timer, ExternalLink, ChevronDown, ChevronUp, X, ImageIcon, Upload
} from 'lucide-react';

interface DailyQuestsTabProps {
  profile: Profile;
  tasks: Task[];
  submissions: Submission[];
  announcements: Announcement[];
  onCheckIn: (taskId: string, proofText?: string, proofImg?: string, proofLink?: string, shareToWitness?: boolean) => Promise<void>;
  isSyncing: boolean;
  missions?: Mission[];
  showToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  userPet: UserPet | null;
  petStages: PetStage[];
  onEvolvePet: (studentId: string, lineKey: string) => Promise<void>;
  batchStartDate: string | null;
  allProfiles?: Profile[];
  allUserPets?: UserPet[];
  batches?: Batch[];
  petLines: PetLine[];
  missionTemplates: MissionTemplate[];
  onSelectEvolutionLine: (studentId: string, lineKey: string) => Promise<void>;
}

// 一律以台灣時間 (UTC+8) 解讀儲存的時間字串
function parseLocalTime(dateStr: string | undefined | null): Date {
  return parseTaipei(dateStr);
}

// 是否為「進化/升級任務」（這類任務強制要上傳照片）
function isEvolutionTask(t: any): boolean {
  return !!t && (
    t.category === '神獸進化' ||
    String(t.template_id || '').startsWith('temp-evolve')
  );
}

// 依「等級」在該進化路線中找出對應的成長階段（蛋未選路線時回傳蛋）。
// 階段以 min_level 區間自動晉級：例如龍系 幼龍5-9 / 飛龍10-14 / 幻龍15-19…
function getActiveStage(userPet: any, petStages: any[]): any {
  const egg = petStages.find(s => s.line_key === null && (s.stage_index === 1 || s.stage_index === 0));
  if (!userPet || !userPet.pet_line) return egg;
  const lineStages = petStages
    .filter(s => s.line_key === userPet.pet_line)
    .sort((a, b) => (a.min_level || 0) - (b.min_level || 0));
  if (!lineStages.length) return egg;
  // 取「min_level <= 目前等級」中最高的那一階
  let matched = lineStages[0];
  for (const s of lineStages) {
    if ((userPet.level || 0) >= (s.min_level || 0)) matched = s;
  }
  return matched || egg;
}

function getCountdownText(endTimeStr: string | undefined): { text: string; isUrgent: boolean; isExpired: boolean } | null {
  if (!endTimeStr) return null;
  const endTime = parseLocalTime(endTimeStr).getTime();
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

function isTodayLocal(date: Date, now: Date): boolean {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isTodayInRangeLocal(start: Date, end: Date, now: Date): boolean {
  const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const dEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return dNow >= dStart && dNow <= dEnd;
}

function isThisWeekLocal(date: Date, now: Date): boolean {
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return date >= startOfWeek && date <= endOfWeek;
}

function isFutureLocal(date: Date, now: Date): boolean {
  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return dDate > dNow;
}

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 800;
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
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Optimized WebP quality (0.7) for significantly smaller upload file sizes (20KB-40KB)
        const compressedBase64 = canvas.toDataURL('image/webp', 0.7);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export function DailyQuestsTab({ 
  profile, 
  tasks, 
  submissions, 
  announcements, 
  onCheckIn, 
  isSyncing,
  missions = [],
  showToast,
  userPet: propUserPet,
  petStages,
  onEvolvePet,
  batchStartDate: propBatchStartDate,
  allProfiles = [],
  allUserPets = [],
  batches = [],
  petLines = [],
  missionTemplates = [],
  onSelectEvolutionLine
}: DailyQuestsTabProps) {
  const [activeCategory, setActiveCategory] = useState<'daily' | 'weekly' | 'special' | 'temporary'>('daily');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [proofText, setProofText] = useState('');
  const [proofLink, setProofLink] = useState('');
  const [showProofModal, setShowProofModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTask, setConfirmTask] = useState<any | null>(null);
  const [isSelectingLine, setIsSelectingLine] = useState(false);

  // --- Proof Image Upload States ---
  const [proofImg, setProofImg] = useState('');
  const [compressing, setCompressing] = useState(false);

  // --- Announcements Read/Unread States ---
  const [readAnnouncements, setReadAnnouncements] = useState<string[]>([]);
  const [manuallyExpandedIds, setManuallyExpandedIds] = useState<string[]>([]);
  const [hideRead, setHideRead] = useState(false);

  const [showAttrsDetail, setShowAttrsDetail] = useState(false);
  const [isAnnExpanded, setIsAnnExpanded] = useState(false);
  const [hasInitializedAnnExpansion, setHasInitializedAnnExpansion] = useState(false);

  // Cohort resolving logic
  const activeProfile = profile;
  const activeBatch = batches.find(b => b.id === profile.batch_id);
  const userPet = allUserPets.find(up => up.student_id === activeProfile.id) || propUserPet;
  const batchStartDate = activeBatch ? activeBatch.start_date : propBatchStartDate;
  const isCohortEnded = profile.status === 'ended' || profile.status === 'inactive' || (activeBatch ? activeBatch.status === 'ended' : false);

  // Level and Pet stage logic
  const totalExp = userPet ? userPet.total_exp : activeProfile.score;
  const userLevel = userPet ? userPet.level : Math.floor(activeProfile.score / 500);

  // --- Pet Dialogue Bubble States & Functions ---
  const [petBubble, setPetBubble] = useState<string | null>(null);

  React.useEffect(() => {
    let msg = isCohortEnded ? "本期修煉已圓滿結束，我是你的修行夥伴！" : "混沌初開...等主人帶我破殼！🐣";
    if (!isCohortEnded && userPet && userPet.current_stage_index > 1) {
      if (userPet.pet_line === 'dragon') msg = "尊者降臨！今天想拆解什麼限制信念？🐉";
      else if (userPet.pet_line === 'lion') msg = "吼！目標已鎖定，讓我們以卓越執行力迅速行動！🦁";
      else if (userPet.pet_line === 'fox') msg = "嘻嘻，今天有好好建立親和感嗎？🦊";
      else if (userPet.pet_line === 'spirit') msg = "在沉靜的潮汐中，放空自我，聽見內心的聲音。🌊";
    }
    
    setPetBubble(msg);
    const timer = setTimeout(() => {
      setPetBubble(null);
    }, 4500);
  }, [userPet?.current_stage_index, userPet?.pet_line, profile.batch_id, isCohortEnded]);

  const triggerPetBubble = () => {
    if (isCohortEnded) {
      setPetBubble("本期修煉已圓滿結束，我是你的修行夥伴！");
      const activeTimer = (window as any).petTimer;
      if (activeTimer) clearTimeout(activeTimer);
      (window as any).petTimer = setTimeout(() => {
        setPetBubble(null);
      }, 4000);
      return;
    }
    let pool: string[] = [];
    if (!userPet || userPet.current_stage_index === 1) {
      pool = [
        "混沌初開...等主人帶我破殼！🐣",
        "蛋殼熱呼提示...主人加油！🔥",
        "咕嚕咕嚕...我正在吸收你的修行能量...",
        "（蛋殼輕微晃動了一下，發出微光）✨",
        "等我破殼，我會成為主人最強的溝通助手！"
      ];
    } else {
      switch (userPet.pet_line) {
        case 'dragon':
          pool = [
            "尊者降臨！今天想拆解什麼限制信念？🐉",
            "吼！人際溝通的奧秘，我已全盤掌握！💎",
            "跟隨主人修行，是我龍生最明智的決定！👑",
            "對話的藝術在於聆聽與建立共鳴...",
            "（傲嬌地吐了一小口帶有香味的修行火焰）🔥"
          ];
          break;
        case 'lion':
          pool = [
            "吼！目標已鎖定，讓我們以卓越執行力迅速行動！🦁",
            "風暴在咆哮，但我們的信念堅如磐石！⚡",
            "主人，今天也有好好把想法轉化為行動嗎？🏃",
            "無畏前行！執行力就是我們最強大的武器！⚔️",
            "（自信地亮出利爪，對你點了點頭）✨"
          ];
          break;
        case 'fox':
          pool = [
            "嘻嘻，今天有好好建立親和感嗎？呼應感官系統喔！🦊",
            "我能敏銳感知對方的微表情，隨時指引主人！👁️",
            "聽說寫感恩定課與見證能讓親和力大幅提升唷！📝",
            "點擊下方的任務卡片就能去簽到修行囉！🚀",
            "（靈巧地搖了搖尾巴，對你眨眨眼）🥰"
          ];
          break;
        case 'spirit':
          pool = [
            "嘩啦...在沉靜的潮汐中，放空自我，聽見內心的聲音。🌊",
            "穩定的支持與極致同理，是溝通中最溫柔的力量。💙",
            "主人，不論修行如何，我都會在你身邊靜靜守護。✨",
            "呼哈...沉靜如水，這份包容就是最極致的心智境界。🧘",
            "（散發出溫柔的藍色螢光，輕微蹭了蹭你）🌊"
          ];
          break;
        default:
          pool = ["啾啾！今天也是修行滿滿的一天！🐥"];
      }
    }
    const randomMsg = pool[Math.floor(Math.random() * pool.length)];
    setPetBubble(randomMsg);
    
    const activeTimer = (window as any).petTimer;
    if (activeTimer) clearTimeout(activeTimer);
    (window as any).petTimer = setTimeout(() => {
      setPetBubble(null);
    }, 4000);
  };

  React.useEffect(() => {
    if (announcements.length > 0 && readAnnouncements.length >= 0 && !hasInitializedAnnExpansion) {
      const unread = announcements.filter(ann => !readAnnouncements.includes(ann.id)).length;
      if (unread > 0) {
        setIsAnnExpanded(true);
      }
      setHasInitializedAnnExpansion(true);
    }
  }, [announcements, readAnnouncements, hasInitializedAnnExpansion]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nlp_read_announcements');
        if (stored) {
          setReadAnnouncements(JSON.parse(stored));
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  React.useEffect(() => {
    if (!userPet) return;
    const key = `nlp_last_seen_level_${userPet.student_id}`;
    const storedLevelStr = localStorage.getItem(key);
    
    if (storedLevelStr !== null) {
      const storedLevel = parseInt(storedLevelStr, 10);
      if (userPet.level > storedLevel) {
        const activeStage = getActiveStage(userPet, petStages);

        setShowLevelUpModal({
          petName: activeStage?.stage_name || '修行小龍蛋',
          oldLevel: storedLevel,
          newLevel: userPet.level,
          totalExp: userPet.total_exp,
          stageIndex: userPet.current_stage_index,
          hasPendingEvolution: userPet.level >= 5 && userPet.current_stage_index === 1 && !userPet.pet_line
        });
      }
    }
    
    localStorage.setItem(key, String(userPet.level));
  }, [userPet?.level, userPet?.student_id, petStages, userPet?.pet_line, userPet?.current_stage_index]);

  const markAsRead = (annId: string) => {
    if (readAnnouncements.includes(annId)) return;
    const next = [...readAnnouncements, annId];
    setReadAnnouncements(next);
    localStorage.setItem('nlp_read_announcements', JSON.stringify(next));
  };

  const markAllAsRead = () => {
    const allIds = announcements.map(ann => ann.id);
    setReadAnnouncements(allIds);
    localStorage.setItem('nlp_read_announcements', JSON.stringify(allIds));
  };

  const toggleAnnouncement = (annId: string) => {
    if (!readAnnouncements.includes(annId)) {
      markAsRead(annId);
    }
    setManuallyExpandedIds(prev =>
      prev.includes(annId) ? prev.filter(id => id !== annId) : [...prev, annId]
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const base64 = await compressImage(file);
      setProofImg(base64);
    } catch (err) {
      console.error('圖片壓縮失敗:', err);
    } finally {
      setCompressing(false);
    }
  };



  // Evolution dialog and overlay states
  const [isEvolvingLocal, setIsEvolvingLocal] = useState(false);
  const [showConfirmEvolve, setShowConfirmEvolve] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState<any | null>(null);
  const [showLevelUpModal, setShowLevelUpModal] = useState<any | null>(null);
  const [selectedTempLine, setSelectedTempLine] = useState<string | null>(null);

  const getEvolutionDetails = () => {
    if (!userPet || !batchStartDate) return null;
    const reachedAt = userPet.first_reached_lv5_at || new Date().toISOString();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const start = startOfDay(new Date(batchStartDate));
    const reached = startOfDay(new Date(reachedAt));
    const diffMs = reached - start;
    const days = Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1);
    
    let lineKey = 'spirit';
    let lineName = '穩定靈獸系';
    let traits = '自我覺察、穩定度、同理心';
    let beastName = '小靈獸';
    let desc = '水系靈獸幼體，沉靜如海，散發著寧靜與包容心靈的和諧光芒，賦予修行者穩定的支持與極致的同理能量。';
    
    if (days <= 3) {
      lineKey = 'dragon';
      lineName = '影響力龍系';
      traits = '感召力、說服力、能量感';
      beastName = '幼龍';
      desc = '龍系幼獸，呼吸吐納間皆是自信與感召力，能給予修行者強大的語言影響力與感召能量。';
    } else if (days <= 5) {
      lineKey = 'lion';
      lineName = '行動力獅系';
      traits = '執行力、勇氣、突破力';
      beastName = '小戰獅';
      desc = '獅系幼獸，步伐矯健，雙眼中透露出無畏的執行力，能引領修行者迅速將目標轉化為具體行動。';
    } else if (days <= 7) {
      lineKey = 'fox';
      lineName = '親和力狐系';
      traits = '親和感、感官呼應、人際連結';
      beastName = '小靈狐';
      desc = '狐系幼獸，靈動而富有智慧，親和力拉滿，能敏銳感知人際間的微妙情緒起伏，賦予修行者和諧共鳴的對話技巧。';
    }
    
    return { days, lineKey, lineName, traits, beastName, desc };
  };

  const activeStage = getActiveStage(userPet, petStages);

  const checkEvolutionTaskCompleted = () => {
    if (!userPet || !userPet.selected_evolution_line) return { completed: false, mission: null };
    
    const selectedLine = petLines.find(l => l.line_key === userPet.selected_evolution_line);
    if (!selectedLine || !selectedLine.task_template_id) return { completed: false, mission: null };
    
    const studentBatchId = profile.batch_id || 'batch-50';
    const matchedMission = (missions || []).find(
      m => m.template_id === selectedLine.task_template_id && m.batch_id === studentBatchId
    );
    
    if (!matchedMission) return { completed: false, mission: null };
    
    const hasApprovedSub = submissions.some(
      s => s.mission_id === matchedMission.id && s.student_id === profile.id && s.status === 'approved'
    );
    
    return { completed: hasApprovedSub, mission: matchedMission };
  };

  // 找出「已被審核通過」的進化方向：學員提交了哪個方向的考驗任務並通過，方向即確定
  const approvedEvoLine: string | null = (() => {
    const studentBatchId = profile.batch_id || 'batch-50';
    for (const line of petLines) {
      if (!line.task_template_id) continue;
      const mission = (missions || []).find(
        m => m.template_id === line.task_template_id && m.batch_id === studentBatchId
      );
      if (!mission) continue;
      const approved = submissions.some(
        s => s.mission_id === mission.id && s.student_id === profile.id && s.status === 'approved'
      );
      if (approved) return line.line_key;
    }
    return null;
  })();

  // 執行破殼進化（審核通過後可直接從寵物面板進化，不必再走選擇 modal）
  const runEvolution = (targetLineKey: string) => {
    if (isCohortEnded) { alert('已結束期數僅可查看，不可再互動或培養。'); return; }
    setShowConfirmEvolve(false);
    setSelectedTempLine(null);
    setIsEvolvingLocal(true);
    setTimeout(async () => {
      try {
        await onEvolvePet(profile.id, targetLineKey);
        const finalStage = petStages.find(s => s.line_key === targetLineKey && s.stage_index === 2);
        const lineDetail = petLines.find(l => l.line_key === targetLineKey);
        setShowSuccessModal({
          isSubsequent: false,
          beastName: finalStage?.stage_name || '守護神獸',
          lineName: lineDetail?.name || '專屬系',
          traits: lineDetail?.core_traits || '未設定',
          desc: finalStage?.description || '解鎖專屬的守護神獸，陪伴您的 NLP 修行。',
          image: finalStage?.image_url || 'https://images.unsplash.com/photo-1516233758813-a38d024919c5?auto=format&fit=crop&q=80&w=300',
          glowColor: finalStage?.glow_color || '#A855F7'
        });
      } catch (e) {
        console.error(e);
      } finally {
        setIsEvolvingLocal(false);
        setSelectedTempLine(null);
      }
    }, 800);
  };

  const getAnimationClass = (type: string | null | undefined) => {
    if (!type) return 'animate-float-glow';
    const clean = type.trim().toLowerCase();
    if (clean === 'glow' || clean === 'animate-glow' || clean === 'animate-glow-pulse') {
      return 'animate-glow-pulse';
    }
    if (clean === 'float' || clean === 'animate-float') {
      return 'animate-float';
    }
    if (clean === 'breath' || clean === 'animate-breath') {
      return 'animate-breath';
    }
    if (clean === 'wiggle' || clean === 'animate-wiggle') {
      return 'animate-wiggle';
    }
    if (clean === 'bounce' || clean === 'animate-bounce') {
      return 'animate-bounce';
    }
    if (clean.startsWith('animate-')) {
      return type;
    }
    return `animate-${type}`;
  };

  const stageName = activeStage?.stage_name || '混沌之卵';
  const stageDesc = activeStage?.description || '蘊含著無限可能的混沌之卵，靜靜等待能量積累以尋找其未來的進化方向。';
  const stageImage = activeStage?.image_url || ''; // 無圖時不顯示隨機備用照，改用蛋佔位（見下方渲染）
  const animationClass = getAnimationClass(activeStage?.animation_type);
  const glowColor = activeStage?.glow_color || '#A855F7';

  // Attributes calculation
  // 四維指標：從 0 開始、隨累積分數逐漸成長（除數越大成長越慢、越晚滿 100%）
  const attrAcuity = Math.min(100, Math.floor(activeProfile.score / 300));      // 100% ≈ 30000 分
  const attrStability = Math.min(100, Math.floor(activeProfile.score / 360));   // 100% ≈ 36000 分
  const attrRapport = Math.min(100, Math.floor(activeProfile.score / 280));     // 100% ≈ 28000 分
  const attrReshaping = Math.min(100, Math.floor(activeProfile.score / 420));   // 100% ≈ 42000 分

  const now = nowTaipei();
  const isUsingMissions = profile.role !== 'admin' && !!profile.batch_id;

  const getTaskProgress = (taskId: string) => {
    let limit = 1;
    if (isUsingMissions) {
      const m = missions?.find(x => x.id === taskId);
      if (m) limit = m.max_completions ?? 1;
    } else {
      const t = tasks.find(x => x.id === taskId);
      if (t) limit = t.max_completions ?? 1;
    }

    const taskSubs = submissions.filter(s => s.mission_id === taskId);
    const validSubs = taskSubs.filter(s => s.status !== 'rejected');
    const approvedCount = validSubs.filter(s => s.status === 'approved').length;
    const pendingCount = validSubs.filter(s => s.status === 'pending').length;
    const isDone = limit > 0 && validSubs.length >= limit;

    return { limit, approvedCount, pendingCount, totalValid: validSubs.length, isDone };
  };

  // Helper to check completion status
  const getTaskStatus = (taskId: string) => {
    const { isDone, pendingCount, totalValid } = getTaskProgress(taskId);
    if (isDone) {
      return pendingCount > 0 ? 'pending' : 'approved';
    }
    const taskSubs = submissions.filter(s => s.mission_id === taskId);
    const hasRejected = taskSubs.some(s => s.status === 'rejected');
    return hasRejected && totalValid === 0 ? 'rejected' : 'none';
  };

  const getTaskSubmission = (taskId: string) => {
    return submissions.find(s => s.mission_id === taskId);
  };

  // Task filtering logic
  const filteredTasks = tasks.filter(t => {
    // 進化任務只在寵物進化流程出現，不列入一般任務列表
    if (isEvolutionTask(t)) return false;
    let matchesTab = false;
    if (activeCategory === 'daily') matchesTab = t.type === 'daily';
    else if (activeCategory === 'weekly') matchesTab = t.type === 'weekly';
    else if (activeCategory === 'special') matchesTab = t.type === 'temporary';
    else if (activeCategory === 'temporary') matchesTab = t.type === 'limited';

    if (!matchesTab) return false;

    const publishTime = parseLocalTime(t.publish_time);
    const deadlineTime = parseLocalTime(t.end_time);
    const { isDone } = getTaskProgress(t.id);

    // 1. 未到 publish_at
    if (now.getTime() < publishTime.getTime()) return false;

    // 3. 超過 end_at：前台不要顯示在進行中任務
    if (now.getTime() > deadlineTime.getTime() && !isDone) return false;

    // 5. 每日任務：只顯示 publish_at 在今天的每日任務
    if (t.type === 'daily') {
      if (!isTodayLocal(publishTime, now)) return false;
    } else if (t.type === 'weekly' || t.type === 'temporary') {
      // 6. 每週、特殊任務：只顯示今天日期落在 publish_at ~ end_at 區間內的任務
      if (!isTodayInRangeLocal(publishTime, deadlineTime, now)) return false;
    }
    // 7. 限時挑戰 (limited)：現在時間落在區間內（已由 #1 和 #3 處理）

    return true;
  });

  const displayMissions = isUsingMissions
    ? missions.filter(m => {
        // 進化任務只在寵物進化流程出現，不列入一般任務列表
        if (isEvolutionTask(m)) return false;
        const publishTime = parseLocalTime(m.publish_at);
        const deadlineTime = parseLocalTime(m.deadline_at);
        const sub = submissions.find(s => s.mission_id === m.id);
        const isCompleted = sub && (sub.status === 'approved' || sub.status === 'pending');

        // 1. 未到 publish_at：前台不可顯示
        if (now.getTime() < publishTime.getTime()) return false;

        // 3. 超過 end_at：前台不要顯示在進行中任務 (若已完成則保留顯示)
        if (now.getTime() > deadlineTime.getTime() && !isCompleted) return false;

        // 5. 每日任務：只顯示 publish_at 在今天的每日任務
        if (m.mission_type === 'daily') {
          if (!isTodayLocal(publishTime, now)) return false;
        } else if (m.mission_type === 'weekly' || m.mission_type === 'special') {
          // 6. 每週與特殊任務：只顯示今天日期落在 publish_at ~ end_at 區間內的任務
          if (!isTodayInRangeLocal(publishTime, deadlineTime, now)) return false;
        }
        // 7. 限時挑戰 (limited)：現在時間落在區間內（已由上面的 #1 和 #3 處理）

        return m.batch_id === profile.batch_id &&
               (m.status === 'active' || m.status === 'scheduled');
      })
    : [];

  const filteredMissions = displayMissions.filter(m => {
    let matchesTab = false;
    if (activeCategory === 'daily') matchesTab = m.mission_type === 'daily';
    else if (activeCategory === 'weekly') matchesTab = m.mission_type === 'weekly';
    else if (activeCategory === 'special') matchesTab = m.mission_type === 'special';
    else if (activeCategory === 'temporary') matchesTab = m.mission_type === 'limited';

    return matchesTab;
  });

  // 該分頁是否有「目前可做但尚未完成」的任務（用來顯示小紅點提醒）
  const categoryHasUndone = (catKey: string): boolean => {
    if (isUsingMissions) {
      const mType: Record<string, string> = { daily: 'daily', weekly: 'weekly', special: 'special', temporary: 'limited' };
      return displayMissions.some(m => m.mission_type === mType[catKey] && !getTaskProgress(m.id).isDone);
    }
    const tType: Record<string, string> = { daily: 'daily', weekly: 'weekly', special: 'temporary', temporary: 'limited' };
    return tasks.some((t: Task) => !isEvolutionTask(t) && t.type === tType[catKey] && !getTaskProgress(t.id).isDone);
  };

  const handleCardClick = (task: Task) => {
    const { isDone } = getTaskProgress(task.id);
    if (isDone) return; // already done

    if (task.requires_proof) {
      setSelectedTask(task);
      setProofText('');
      setProofImg('');
      setProofLink('');
      setShowProofModal(true);
    } else {
      // Direct sign-in - open confirmation modal
      setConfirmTask(task);
      setShowConfirmModal(true);
    }
  };

  const handleMissionClick = (mission: Mission) => {
    const { isDone } = getTaskProgress(mission.id);
    if (isDone) return;

    if (mission.review_type !== 'auto') {
      setSelectedTask(mission);
      setProofText('');
      setProofImg('');
      setProofLink('');
      setShowProofModal(true);
    } else {
      setConfirmTask(mission);
      setShowConfirmModal(true);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    // 進化/升級任務：強制要上傳照片
    if (isEvolutionTask(selectedTask) && !proofImg) {
      showToast?.('進化任務必須上傳一張修行照片才能提交 📸', 'error');
      return;
    }

    // 立即關閉對話框並清空狀態，避免非同步重渲染時對話框閃爍
    const task = selectedTask;
    const txt = proofText;
    const img = proofImg;
    const lnk = proofLink;

    setShowProofModal(false);
    setSelectedTask(null);
    setProofImg('');
    setProofText('');
    setProofLink('');

    setSubmitting(true);
    try {
      // 是否上見證牆由審核者決定，學員提交時一律不分享
      await onCheckIn(task.id, txt, img || undefined, lnk);
    } catch (err) {
      console.error(err);
      // 若失敗，則還原對話框狀態
      setSelectedTask(task);
      setProofText(txt);
      setProofImg(img);
      setProofLink(lnk);
      setShowProofModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryBadge = (task: Task) => {
    if (task.type === 'daily') {
      return <span className="text-[10px] font-black tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md">每日任務</span>;
    }
    if (task.type === 'weekly') {
      return <span className="text-[10px] font-black tracking-widest text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md">每週任務</span>;
    }
    if (task.type === 'limited' || task.name.includes('限時') || task.name.includes('最後一週')) {
      return <span className="text-[10px] font-black tracking-widest text-red-400 bg-red-500/10 px-2.5 py-1 rounded-md">限時挑戰</span>;
    }
    return <span className="text-[10px] font-black tracking-widest text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-md">特殊加碼</span>;
  };

  // Sort tasks: uncompleted ('none' or 'rejected') first, completed ('approved' or 'pending') last.
  // Within the same status, sort by creation time (created_at DESC - latest first).
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const statusA = getTaskStatus(a.id);
    const statusB = getTaskStatus(b.id);
    const isDoneA = statusA === 'approved' || statusA === 'pending';
    const isDoneB = statusB === 'approved' || statusB === 'pending';
    
    if (isDoneA !== isDoneB) {
      return isDoneA ? 1 : -1;
    }
    
    const timeA = parseLocalTime(a.created_at).getTime();
    const timeB = parseLocalTime(b.created_at).getTime();
    return timeB - timeA;
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* 🥚 寵物蛋與修行屬性面板 */}
      <section className="glass-panel p-6 rounded-3xl border border-white/10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-gradient-to-br from-slate-900/60 to-slate-950/60 light:bg-none light:bg-white light:border-slate-200">
        
        {/* Cohort Switcher Header */}
        <div className="col-span-1 md:col-span-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-4 light:border-slate-200 select-none">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-500" size={18} />
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest light:text-slate-800">
              個人修行神獸與屬性
            </h3>
            {isCohortEnded && (
              <span className="text-[9px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded flex items-center gap-0.5">
                🔒 已結業 (僅供檢視)
              </span>
            )}
          </div>
          
          <div className="text-[11px] text-slate-400 font-bold light:text-slate-600">
            修行期數：<span className="text-amber-500">{activeBatch ? activeBatch.name : '未指派'}</span>
          </div>
        </div>

        {/* Left: Pet Animation */}
        <div className="md:col-span-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5 pb-6 md:pb-0 md:pr-6 light:border-slate-200 relative">
          {/* Speech Bubble */}
          {petBubble && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-950 border border-amber-500/40 text-amber-300 text-[11px] font-black py-1.5 px-3 rounded-2xl shadow-xl z-20 animate-in fade-in zoom-in-95 duration-200 flex items-center gap-1.5 select-none whitespace-nowrap light:bg-white light:text-amber-700 light:border-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
              {petBubble}
              {/* Triangle pointer */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950 border-r border-b border-amber-500/40 rotate-45 light:bg-white light:border-amber-400" />
            </div>
          )}
          
          <div 
            onClick={triggerPetBubble}
            className="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
            title="點擊與守護神獸互動"
          >
            <div
              className={`pet-stage ${isEvolvingLocal ? 'scale-[2.2] opacity-0 rotate-6' : ''}`}
              style={{
                '--glow-color': glowColor,
                transition: 'all 800ms',
                // 行內保險：固定容器幾何，避免初次進面板時 globals.css 尚未套用，
                // 導致絕對定位的寵物圖找不到基準框而跑到右下角
                position: 'relative',
                width: '300px',
                height: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              } as React.CSSProperties}
            >
              <div className="pet-aura"></div>
              {stageImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={stageImage.startsWith('data:') ? stageImage : `${stageImage}${stageImage.includes('?') ? '&' : '?'}u=${encodeURIComponent(activeStage?.updated_at || '')}`}
                    alt={stageName}
                    className={`pet-image ${animationClass}`}
                    style={{
                      '--pet-scale': (() => {
                        let zoom = 1.0; // 預設倍率改為 1.0
                        const match = stageImage.match(/[#&?]zoom=([0-9.]+)/i) || stageImage.match(/[#&?]scale=([0-9.]+)/i);
                        if (match && match[1]) {
                          const parsed = parseFloat(match[1]);
                          if (!isNaN(parsed) && parsed > 0) zoom = parsed;
                        }
                        return Math.min(0.85 + (userLevel % 5) * 0.05, 1.1) * zoom;
                      })(),
                      '--pet-x': `${parsePetOffset(stageImage).x}px`,
                      '--pet-y': `${parsePetOffset(stageImage).y}px`,
                      '--glow-color': glowColor,
                      // 行內保險：固定像素上限，即使 .pet-image 的 CSS 尚未套用也不會撐爆容器（避免初次載入破版）
                      maxWidth: '285px',
                      maxHeight: '285px',
                      objectFit: 'contain',
                    } as React.CSSProperties}
                  />
                </>
              ) : (
                // 載入中或尚無神獸：顯示蛋佔位，不要閃出隨機備用圖
                <div className="pet-image flex items-center justify-center select-none" style={{ fontSize: '110px', filter: `drop-shadow(0 0 20px ${glowColor})` }}>
                  🥚
                </div>
              )}
              <div className="pet-shadow"></div>
              <div className="pet-particles"></div>
            </div>
            {/* White flash overlay */}
            {isEvolvingLocal && (
              <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-75 pointer-events-none" style={{ maxWidth: '300px', maxHeight: '300px' }} />
            )}
          </div>
          <div className="text-center mt-2 select-none flex flex-col items-center w-full px-2">
            <h4 className="text-sm font-black text-amber-500 uppercase tracking-widest">{stageName}</h4>
            <span className="text-[10px] font-black text-slate-500 bg-slate-950 px-2 py-0.5 rounded-full mt-1 inline-block light:bg-slate-100">
              成長等級：LV.{userLevel}
            </span>
            
            <p className="text-xs text-slate-400 mt-2 leading-relaxed light:text-slate-500 max-w-xs text-center">
              {((userPet?.has_pending_evolution) || (userLevel >= 5 && (!userPet || userPet.current_stage_index <= 1))) && (!userPet || userPet.current_stage_index <= 1) ? (
                <span className="text-amber-400 font-bold block animate-pulse">
                  {approvedEvoLine
                    ? '考驗任務已通過！點擊下方按鈕即可直接破殼進化。'
                    : '你的混沌之卵已經覺醒！完成對應的神秘考驗任務，即可解鎖該方向並破殼進化。'}
                </span>
              ) : (
                stageDesc
              )}
            </p>
            
            {/* ✨ 開始進化 Button */}
            {((userPet?.has_pending_evolution) || (userLevel >= 5 && (!userPet || userPet.current_stage_index <= 1))) && !isCohortEnded && (
              <button
                onClick={() => {
                  // 已有審核通過的考驗任務 → 直接破殼進化，不必再進選擇 modal
                  if (approvedEvoLine && (!userPet || userPet.current_stage_index <= 1)) {
                    runEvolution(approvedEvoLine);
                  } else {
                    setShowConfirmEvolve(true);
                  }
                }}
                className="mt-3 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white text-xs font-black py-2 px-4 rounded-xl shadow-[0_0_20px_rgba(236,72,153,0.5)] border border-pink-400/30 hover:scale-105 active:scale-95 transition-all select-none animate-pulse shrink-0 cursor-pointer font-bold"
              >
                {approvedEvoLine && (!userPet || userPet.current_stage_index <= 1)
                  ? '🔥 考驗通過・立即破殼進化'
                  : ((!userPet || userPet.current_stage_index <= 1) ? '✨ 混沌破殼・開始進化' : '✨ 靈能突破・開始進化')}
              </button>
            )}
          </div>
        </div>

        {/* Right: Info & Core Attributes */}
        <div className="md:col-span-8 space-y-4">
          <div className="text-left">
            <h3 className="text-base font-black text-white flex items-center gap-1.5 select-none">
              {userPet && userPet.current_stage_index > 1 ? (
                <span className="flex items-center gap-2 text-amber-500">
                  <Sparkles size={16} className="text-amber-500 shrink-0" />
                  {userPet.pet_line === 'dragon' ? '影響力龍系' :
                   userPet.pet_line === 'lion' ? '行動力獅系' :
                   userPet.pet_line === 'fox' ? '親和力狐系' : '穩定靈獸系'}
                  <span className="text-slate-500 text-xs font-normal">|</span>
                  <span className="text-white text-sm font-black">{stageName}</span>
                </span>
              ) : (
                '孵化狀態與NLP經驗屬性'
              )}
            </h3>
          </div>

          {/* Overall level progress bar */}
          <div className="space-y-1 select-none">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-slate-400">
                {userPet && userPet.current_stage_index > 1 ? (
                  <span>成長等級：<span className="text-indigo-400">LV.{userLevel}</span></span>
                ) : (
                  '🔥 升級進度 (Next Level)'
                )}
              </span>
              <span className="text-amber-500">{(totalExp % 500).toLocaleString()} / 500 EXP</span>
            </div>
            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-white/5 light:bg-slate-100 light:border-slate-300">
              <div 
                className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                style={{ width: `${((totalExp % 500) / 500) * 100}%` }}
              />
            </div>
            {userPet && userPet.current_stage_index > 1 && (
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-bold">
                <span>經驗：{totalExp.toLocaleString()} EXP</span>
                <span>距離下一級：{(500 - (totalExp % 500)).toLocaleString()} EXP</span>
              </div>
            )}
          </div>

          {/* Toggle Attributes Button */}
          <div className="flex justify-start select-none">
            <button
              onClick={() => setShowAttrsDetail(!showAttrsDetail)}
              className="btn-action flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-all light:bg-slate-100 light:border-slate-300 light:text-slate-600"
            >
              <span>{showAttrsDetail ? '隱藏四維指標明細 ▲' : '展開四維指標明細 ▼'}</span>
            </button>
          </div>

          {/* Grid of Attributes (Collapsible) */}
          {showAttrsDetail && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5 animate-in slide-in-from-top-2 duration-300 light:border-slate-200">
              
              {/* Attribute 1 */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold select-none">
                  <span className="text-slate-400">👁️ 感官敏銳度 (Sensory Acuity)</span>
                  <span className="text-amber-500">{attrAcuity}%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5 light:bg-slate-100 light:border-slate-300">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${attrAcuity}%` }}
                  />
                </div>
              </div>

              {/* Attribute 2 */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold select-none">
                  <span className="text-slate-400">⚓ 心錨穩定度 (Anchor Stability)</span>
                  <span className="text-amber-500">{attrStability}%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5 light:bg-slate-100 light:border-slate-300">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${attrStability}%` }}
                  />
                </div>
              </div>

              {/* Attribute 3 */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold select-none">
                  <span className="text-slate-400">🤝 親和感共鳴 (Rapport Resonance)</span>
                  <span className="text-amber-500">{attrRapport}%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5 light:bg-slate-100 light:border-slate-300">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${attrRapport}%` }}
                  />
                </div>
              </div>

              {/* Attribute 4 */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold select-none">
                  <span className="text-slate-400">🧩 信念重塑力 (Belief Reshaping)</span>
                  <span className="text-amber-500">{attrReshaping}%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5 light:bg-slate-100 light:border-slate-300">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${attrReshaping}%` }}
                  />
                </div>
              </div>

            </div>
          )}
        </div>
      </section>

      {/* 📢 大會公告區 (Announcements - Collapsible) */}
      {announcements.length > 0 && (
        <section className="glass-panel rounded-3xl border border-amber-500/20 bg-amber-500/5 light:bg-amber-50/20 light:border-amber-500/30 overflow-hidden">
          
          {/* Header Toggle Row */}
          <div 
            onClick={() => setIsAnnExpanded(!isAnnExpanded)}
            className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-amber-500/10 transition-colors select-none"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <h2 className="text-sm font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                大會重要公告
                {announcements.filter(ann => !readAnnouncements.includes(ann.id)).length > 0 && (
                  <span className="text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full animate-bounce ml-1">
                    {announcements.filter(ann => !readAnnouncements.includes(ann.id)).length} 則未讀
                  </span>
                )}
              </h2>
            </div>
            
            <div className="flex items-center">
              <span className="text-xs font-black text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-white/10 light:text-slate-800 light:bg-white light:border-slate-300 light:hover:bg-slate-100">
                {isAnnExpanded ? '收合公告 ▲' : '展開公告 ▼'}
              </span>
            </div>
          </div>

          {/* Expanded Content Panel */}
          {isAnnExpanded && (
            <div className="p-5 pt-0 border-t border-amber-500/10 animate-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 my-4 select-none">
                <span className="text-xs text-slate-200 font-bold light:text-slate-800">
                  共 {announcements.length} 則公告
                </span>
                
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                    className="text-xs font-black text-amber-900 bg-amber-300 hover:bg-amber-200 px-3 py-1.5 rounded-lg border border-amber-400 transition-all cursor-pointer light:text-amber-900 light:bg-amber-200 light:border-amber-400"
                  >
                    全部標記已讀
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setHideRead(!hideRead); }}
                    className="text-xs font-black text-slate-100 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg border border-slate-600 transition-all cursor-pointer light:text-slate-800 light:bg-slate-200 light:border-slate-400 light:hover:bg-slate-300"
                  >
                    {hideRead ? '顯示已讀公告' : '隱藏已讀公告'}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {announcements
                  .filter(ann => !hideRead || !readAnnouncements.includes(ann.id))
                  .map((ann) => {
                    const isRead = readAnnouncements.includes(ann.id);
                    const isExpanded = !isRead || manuallyExpandedIds.includes(ann.id);
                    
                    return (
                      <div 
                        key={ann.id} 
                        className={`border rounded-2xl p-4 transition-all duration-300 cursor-pointer ${
                          isRead 
                            ? 'bg-slate-800 border-slate-700 hover:border-slate-500 light:bg-slate-200 light:border-slate-300 light:hover:border-slate-400' 
                            : 'bg-slate-800 border-amber-500/40 hover:border-amber-500/70 shadow-md light:bg-white light:border-amber-400'
                        }`}
                        onClick={(e) => { e.stopPropagation(); toggleAnnouncement(ann.id); }}
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-sm flex items-center gap-1.5 min-w-0">
                            {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                            <span className={`truncate ${
                              !isRead 
                                ? 'font-black text-amber-200 light:text-amber-900' 
                                : 'text-slate-300 font-normal light:text-slate-700'
                            }`}>{ann.title}</span>
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-slate-300 font-mono light:text-slate-600">
                              {new Date(ann.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-slate-300 light:text-slate-600">
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-2.5 pt-2.5 border-t border-white/10 animate-in slide-in-from-top-1 duration-200 light:border-slate-300">
                            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line light:text-slate-800">
                              {ann.content}
                            </p>
                            <div className="text-xs text-slate-400 font-mono mt-3 text-right light:text-slate-600">
                              發布時間：{new Date(ann.created_at).toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 📊 整合任務中心 (Integrated Tasks) */}
      <section className="space-y-4">
        
        {/* Category Switch Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 select-none border-b border-white/5 pb-3 light:border-slate-200">
          <h2 className="text-sm font-black text-slate-200 uppercase tracking-widest light:text-slate-800">
            大會修行任務列表
          </h2>
          
          <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5 w-fit light:bg-slate-100 light:border-slate-300">
            {[
              { key: 'daily', label: '每日任務', icon: Flame },
              { key: 'weekly', label: '每週任務', icon: Sparkles },
              { key: 'special', label: '特殊任務', icon: Star },
              { key: 'temporary', label: '限時挑戰', icon: Timer },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key as typeof activeCategory)}
                className={`relative flex flex-row items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition-all duration-200 select-none ${
                  activeCategory === key
                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800 light:hover:bg-slate-200'
                }`}
              >
                {categoryHasUndone(key) && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-slate-900 animate-pulse" />
                )}
                <Icon size={12} className="shrink-0" />
                <span className="text-center leading-[1.2]">
                  {label.substring(0, 2)}<br />{label.substring(2)}
                </span>
              </button>
            ))}
          </div>
        </div>


        {/* Task/Mission Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isUsingMissions && filteredMissions.length > 0
            ? filteredMissions.map((mission) => {
                  const nowTime = nowTaipei().getTime();
                  const pubTime = parseLocalTime(mission.publish_at).getTime();
                  const deadTime = parseLocalTime(mission.deadline_at).getTime();
                  const { isDone, approvedCount, limit } = getTaskProgress(mission.id);
                  const status = getTaskStatus(mission.id);

                  const isExpired = nowTime > deadTime;
                  const isFuture = nowTime < pubTime;

                  return (
                    <div
                      key={mission.id}
                      onClick={() => !isDone && !isFuture && !isExpired && handleMissionClick(mission)}
                      className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between min-h-[220px] h-auto select-none relative overflow-hidden ${
                        !isDone && !isFuture && !isExpired ? 'cursor-pointer' : ''
                      } ${
                        status === 'approved'
                          ? 'border-l-4 border-l-emerald-500 border-emerald-900/40 bg-slate-900 cursor-default light:bg-slate-300 light:border-emerald-600'
                          : status === 'pending'
                          ? 'border-l-4 border-l-blue-400 border-blue-900/40 bg-slate-900/80 cursor-default light:bg-slate-200 light:border-blue-500'
                          : status === 'rejected'
                          ? 'border-l-4 border-l-red-500 border-red-900/40 bg-gradient-to-br from-slate-900 to-slate-950 hover:-translate-y-0.5 light:bg-none light:bg-white light:border-red-500'
                          : 'border-l-4 border-l-amber-500 border-amber-900/20 bg-gradient-to-br from-slate-800 to-slate-900 hover:border-amber-500/60 hover:shadow-[0_0_28px_rgba(245,158,11,0.18)] hover:-translate-y-0.5 light:bg-none light:bg-white light:border-amber-400'
                      }`}
                    >
                      {/* Completed overlay stripe */}
                      {status === 'approved' && (
                        <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(135deg, transparent, transparent 18px, rgba(255,255,255,0.012) 18px, rgba(255,255,255,0.012) 20px)' }} />
                      )}

                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex gap-1.5 items-center flex-wrap flex-1 min-w-0">
                          <span className="text-[10px] font-black tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md">
                            {mission.mission_type === 'daily'
                              ? '每日任務'
                              : mission.mission_type === 'weekly'
                              ? '每週任務'
                              : mission.mission_type === 'limited'
                              ? '限時挑戰'
                              : '特殊加碼'}
                          </span>
                          <span className="text-sm font-black tracking-wide px-3 py-1 rounded-lg border text-amber-400 bg-amber-500/15 border-amber-500/30">
                            +{mission.points} 經驗
                          </span>
                          {(() => {
                            if (limit === 0) {
                              return (
                                <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md border text-blue-400 bg-blue-500/10 border-blue-500/20">
                                  已完成 {approvedCount} 次 / 無限制
                                </span>
                              );
                            } else if (limit > 1) {
                              return (
                                <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md border text-purple-400 bg-purple-500/10 border-purple-500/20">
                                  已完成 {approvedCount} / {limit} 次
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="shrink-0">
                          {status === 'approved' ? (
                            <span className="flex items-center gap-1.5 text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                              <CheckCircle2 size={13} className="text-emerald-400" />
                              已完成
                            </span>
                          ) : status === 'pending' ? (
                            <span className="flex items-center gap-1.5 text-xs font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
                              <Clock size={13} className="text-blue-400" />
                              待審核
                            </span>
                          ) : status === 'rejected' ? (
                            <span className="flex items-center gap-1.5 text-xs font-black text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
                              <AlertCircle size={13} className="text-red-400" />
                              已退回
                            </span>
                          ) : isExpired ? (
                            <span className="flex items-center gap-1.5 text-xs font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full animate-pulse">
                              <AlertCircle size={13} className="text-rose-400" />
                              逾期未交
                            </span>
                          ) : isFuture ? (
                            <span className="flex items-center gap-1.5 text-xs font-black text-slate-500 bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-full">
                              <Clock size={13} className="text-slate-500" />
                              尚未開始
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-black text-slate-950 bg-amber-400 border border-amber-500 px-3 py-1 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse">
                              <Circle size={13} className="text-slate-950" />
                              待完成
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 倒數時間 + 日期：獨立一行，避免與狀態徽章重疊 */}
                      <div className="flex gap-1.5 items-center flex-wrap mt-2">
                        {!isExpired && !isFuture && (() => {
                          const countdown = getCountdownText(mission.deadline_at);
                          if (!countdown) return null;
                          return (
                            <span className={`text-[11px] font-black tracking-wide px-2.5 py-1 rounded-md flex items-center gap-1 border ${
                              countdown.isExpired
                                ? 'text-slate-500 bg-slate-900/50 border-white/5'
                                : countdown.isUrgent
                                ? 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse'
                                : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                            }`}>
                              <Timer size={11} />
                              {countdown.text}
                            </span>
                          );
                        })()}
                        {(() => {
                          const d = parseLocalTime(mission.publish_at);
                          return (
                            <span className="text-[11px] font-black tracking-wide px-2.5 py-1 rounded-md flex items-center gap-1 border text-sky-400 bg-sky-500/10 border-sky-500/20">
                              📅 {d.getMonth() + 1}/{d.getDate()}
                            </span>
                          );
                        })()}
                      </div>

                      <h3 className="text-base font-black text-white mt-3 light:text-slate-900 leading-snug">
                          {mission.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-2 font-bold leading-relaxed light:text-slate-600">
                          {mission.description}
                        </p>
                      </div>

                      {/* Bottom Alignment Area */}
                      <div className="border-t border-white/10 pt-3 mt-3 flex justify-between items-center light:border-slate-300">
                        <span className="text-xs font-mono select-none text-slate-300 light:text-slate-700">
                          {mission.review_type !== 'auto' ? '※ 需上傳審核證明' : '✓ 免證明直接簽到'}
                        </span>
                        
                        <div>
                          {status === 'approved' ? (
                            <span className="flex items-center gap-1 text-emerald-400 text-xs font-black py-1 px-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 select-none">
                              ✓ 已完成
                            </span>
                          ) : status === 'pending' ? (
                            <span className="flex items-center gap-1 text-blue-400 text-xs font-black py-1 px-3 bg-blue-500/10 rounded-xl border border-blue-500/20 select-none">
                              ⏳ 待審核
                            </span>
                          ) : isExpired ? (
                            <span className="flex items-center gap-1 text-slate-500 text-xs font-black py-1 px-3 bg-slate-800 rounded-xl border border-slate-700 select-none">
                              已截止
                            </span>
                          ) : isFuture ? (
                            <span className="flex items-center gap-1 text-slate-500 text-xs font-black py-1 px-3 bg-slate-800 rounded-xl border border-slate-700 select-none">
                              未開放
                            </span>
                          ) : isCohortEnded ? (
                            <span className="flex items-center gap-1 text-slate-500 text-xs font-black py-1 px-3 bg-slate-800 rounded-xl border border-slate-700 select-none">
                              🔒 已結束
                            </span>
                          ) : (
                            <button 
                              className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 active:scale-95 transition-all text-slate-950 text-xs font-black py-1.5 px-4 rounded-xl shadow-[0_0_18px_rgba(245,158,11,0.45)] border border-amber-400/30 cursor-pointer shimmer-btn"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleMissionClick(mission);
                              }}
                            >
                              {isExpired ? '補交證明 →' : (mission.review_type !== 'auto' ? '提交證明 →' : '點擊簽到 ✓')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              : sortedTasks.map((task) => {
                  const { isDone, approvedCount, limit } = getTaskProgress(task.id);
                  const status = getTaskStatus(task.id);
                  const sub = getTaskSubmission(task.id);

                  return (
                    <div
                      key={task.id}
                      onClick={() => !isDone && !isCohortEnded && handleCardClick(task)}
                      className={`p-6 rounded-3xl border-l-4 border transition-all duration-300 flex flex-col justify-between min-h-[220px] h-auto select-none relative overflow-hidden cursor-pointer ${
                        status === 'approved'
                          ? 'border-l-emerald-500 border-emerald-900/40 bg-slate-900 cursor-default light:bg-slate-300 light:border-emerald-600'
                          : status === 'pending'
                          ? 'border-l-blue-400 border-blue-900/40 bg-slate-900/80 cursor-default light:bg-slate-200 light:border-blue-500'
                          : status === 'rejected'
                          ? 'border-l-red-500 border-red-900/40 bg-gradient-to-br from-slate-900 to-slate-950 hover:-translate-y-0.5 light:bg-none light:bg-white light:border-red-500'
                          : 'border-l-amber-500 border-amber-900/20 bg-gradient-to-br from-slate-800 to-slate-900 hover:border-amber-500/60 hover:shadow-[0_0_28px_rgba(245,158,11,0.18)] hover:-translate-y-0.5 light:bg-none light:bg-white light:border-amber-400'
                      }`}
                    >
                      {/* Completed overlay stripe */}
                      {isDone && (
                        <div className="absolute inset-0 pointer-events-none" style={{ background: status === 'approved' ? 'repeating-linear-gradient(135deg, transparent, transparent 18px, rgba(255,255,255,0.012) 18px, rgba(255,255,255,0.012) 20px)' : undefined }} />
                      )}

                      {/* Status Indicator Badge */}
                      <div className="absolute top-4 right-4">
                        {status === 'approved' && (
                          <span className="flex items-center gap-1.5 text-xs font-black text-white bg-emerald-600 border border-emerald-700 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                            <CheckCircle2 size={13} className="text-white" />
                            已完成 ✓
                          </span>
                        )}
                        {status === 'pending' && (
                          <span className="flex items-center gap-1.5 text-xs font-black text-white bg-blue-600 border border-blue-700 px-3 py-1 rounded-full animate-pulse">
                            <Clock size={13} className="text-white" />
                            審核中
                          </span>
                        )}
                        {status === 'rejected' && (
                          <span className="flex items-center gap-1.5 text-xs font-black text-white bg-red-600 border border-red-700 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                            <AlertCircle size={13} className="text-white" />
                            被退回
                          </span>
                        )}
                        {status === 'none' && (
                          <span className="flex items-center gap-1.5 text-xs font-black text-slate-950 bg-amber-400 border border-amber-500 px-3 py-1 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse">
                            <Circle size={13} className="text-slate-950" />
                            待完成
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex gap-1.5 items-center flex-wrap pr-24">
                          {getCategoryBadge(task)}
                          <span className={`text-sm font-black tracking-wide px-3 py-1 rounded-lg border ${
                            isDone
                              ? 'text-slate-500 bg-slate-800/60 border-white/5 light:bg-slate-200 light:text-slate-500'
                              : 'text-amber-400 bg-amber-500/15 border-amber-500/30'
                          }`}>
                            +{task.score} 經驗
                          </span>
                          {(() => {
                            if (limit === 0) {
                              return (
                                <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md border text-blue-400 bg-blue-500/10 border-blue-500/20">
                                  已完成 {approvedCount} 次 / 無限制
                                </span>
                              );
                            } else if (limit > 1) {
                              return (
                                <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md border text-purple-400 bg-purple-500/10 border-purple-500/20">
                                  已完成 {approvedCount} / {limit} 次
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        {/* 倒數時間 + 日期：獨立一行，避免與狀態徽章重疊 */}
                        <div className="flex gap-1.5 items-center flex-wrap mt-2">
                          {!isDone && (() => {
                            const countdown = getCountdownText(task.end_time);
                            if (!countdown) return null;
                            return (
                              <span className={`text-[11px] font-black tracking-wide px-2.5 py-1 rounded-md flex items-center gap-1 border ${
                                countdown.isExpired
                                  ? 'text-slate-500 bg-slate-900/50 border-white/5'
                                  : countdown.isUrgent
                                  ? 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse'
                                  : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                              }`}>
                                <Timer size={11} />
                                {countdown.text}
                              </span>
                            );
                          })()}
                          {(() => {
                            const d = parseLocalTime(task.publish_time);
                            return (
                              <span className="text-[11px] font-black tracking-wide px-2.5 py-1 rounded-md flex items-center gap-1 border text-sky-400 bg-sky-500/10 border-sky-500/20">
                                📅 {d.getMonth() + 1}/{d.getDate()}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Task Title: strikethrough + dimmed for completed */}
                        <h3 className={`font-black text-base mt-4 leading-snug ${
                          status === 'approved'
                            ? 'line-through decoration-emerald-500/80 decoration-2 text-slate-500 light:text-slate-700'
                            : status === 'pending'
                            ? 'text-slate-300 light:text-slate-800'
                            : 'text-white light:text-slate-900'
                        }`}>
                          {task.name}
                        </h3>
                        <p className={`text-xs mt-2 line-clamp-2 leading-relaxed ${
                          isDone
                            ? 'text-slate-500 light:text-slate-600'
                            : 'text-slate-300 light:text-slate-700'
                        }`}>
                          {task.description}
                        </p>
                      </div>

                      {/* Render proof brief if any */}
                      {sub && (
                        <div className="text-[10px] text-slate-500 mt-2 border-t border-white/5 pt-2 flex flex-col gap-1 light:border-slate-200">
                          <span className="line-clamp-1 italic font-bold">證明：「{sub.proof_text}」</span>
                          {sub.proof_link && (
                            <a 
                              href={sub.proof_link} 
                              target="_blank" 
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()} 
                              className={`flex items-center gap-0.5 hover:underline ${
                                isDone 
                                  ? 'text-slate-400 hover:text-amber-500' 
                                  : 'text-amber-500'
                              }`}
                            >
                              <ExternalLink size={10} />
                              查看連結
                            </a>
                          )}
                        </div>
                      )}

                      <div className="border-t border-white/10 pt-3 mt-3 flex justify-between items-center light:border-slate-300">
                        <span className={`text-xs font-mono select-none ${
                          isDone ? 'text-slate-400 light:text-slate-600' : 'text-slate-300 light:text-slate-700'
                        }`}>
                          {task.requires_proof ? '※ 需上傳審核證明' : '✓ 免證明直接簽到'}
                        </span>
                        
                        {/* Action Button or Status Label */}
                        <div>
                          {isDone ? (
                            status === 'approved' ? (
                              <span className="flex items-center gap-1 text-emerald-500 text-xs font-black py-1 px-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 light:bg-emerald-50 light:border-emerald-200">
                                <CheckCircle2 size={13} />
                                打卡成功
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-blue-400 text-xs font-black py-1 px-3 bg-blue-500/10 rounded-xl border border-blue-500/20 animate-pulse light:bg-blue-50 light:border-blue-200">
                                <Clock size={13} />
                                等待審核中
                              </span>
                            )
                          ) : isCohortEnded ? (
                            <span className="flex items-center gap-1 text-slate-500 text-xs font-black py-1 px-3 bg-slate-800 rounded-xl border border-slate-700 select-none">
                              🔒 已結束
                            </span>
                          ) : status === 'rejected' ? (
                            <button 
                              onClick={() => handleCardClick(task)}
                              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-black py-1.5 px-3 rounded-xl shadow-lg cursor-pointer transition-all active:scale-95 shimmer-btn"
                            >
                              重新提交
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleCardClick(task)}
                              className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 active:scale-95 transition-all text-slate-950 text-xs font-black py-1.5 px-4 rounded-xl shadow-[0_0_18px_rgba(245,158,11,0.45)] border border-amber-400/30 cursor-pointer shimmer-btn"
                            >
                              {task.requires_proof ? '提交證明 →' : '點擊簽到 ✓'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>
      </section>

      {/* 📝 簽到證明上傳 Modal */}
      {showProofModal && selectedTask && (
        <div className="fixed inset-0 z-[60] bg-black/80 overflow-y-auto overscroll-none modal-force-dark" onClick={(e) => { if (e.target === e.currentTarget) { setShowProofModal(false); setSelectedTask(null); }}}>
          <div className="min-h-full flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) { setShowProofModal(false); setSelectedTask(null); }}}>
            <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-black text-white mb-4">
              提交修行證明：{selectedTask.name || selectedTask.title}
            </h3>
            
            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-bold mb-2">
                  心得回報與發現 (必填)
                </label>
                <textarea
                  required
                  rows={4}
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  placeholder="請分享您今天的練習經過、體驗或對應的溝通發現..."
                  className="w-full rounded-xl p-3 text-sm outline-none focus:border-amber-500 transition-colors select-text border"
                  style={{color:'var(--text-primary)', backgroundColor:'var(--input-bg)', borderColor:'var(--input-border)', userSelect:'text', WebkitUserSelect:'text'}}
                />
              </div>

              {/* 📷 選擇圖片 / 抓相簿 */}
              <div>
                <label className="block text-xs font-bold mb-2">
                  {isEvolutionTask(selectedTask) ? (
                    <span className="text-amber-500">上傳修行圖片 / 對話截圖（進化任務必附）📸</span>
                  ) : (
                    <span className="text-slate-400">上傳修行圖片 / 對話截圖 (選填)</span>
                  )}
                </label>
                
                {proofImg ? (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={proofImg} 
                      alt="預覽圖片" 
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setProofImg('')}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/75 hover:bg-black flex items-center justify-center text-white transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      id="proof-image-upload"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={compressing}
                    />
                    <label
                      htmlFor="proof-image-upload"
                      className={`w-full h-24 border border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition-all select-none ${
                        compressing ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {compressing ? (
                        <>
                          <div className="w-5 h-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                          <span className="text-[10px] text-slate-400 font-bold">圖片壓縮處理中...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon size={20} className="text-slate-500" />
                          <span className="text-[10px] text-slate-400 font-bold">點擊上傳圖片 / 抓取相簿</span>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-bold mb-2">
                  參考連結 (選填)
                </label>
                <input
                  type="url"
                  value={proofLink}
                  onChange={(e) => setProofLink(e.target.value)}
                  placeholder="如 Google Docs、對話截圖網址..."
                  className="w-full rounded-xl p-3 text-sm outline-none focus:border-amber-500 transition-colors select-text border"
                  style={{color:'var(--text-primary)', backgroundColor:'var(--input-bg)', borderColor:'var(--input-border)', userSelect:'text', WebkitUserSelect:'text'}}
                />
              </div>

              <div className="bg-slate-900/50 border border-white/5 p-3 rounded-xl flex items-start gap-2 light:bg-slate-100 light:border-slate-300">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-normal font-bold light:text-slate-600">
                  送出後，系統小隊長或大隊長將會進行手動審核。審核通過即可獲得 {selectedTask.score !== undefined ? selectedTask.score : selectedTask.points} 經驗積分。
                </p>
              </div>

              {/* 告知：是否上見證牆由審核者決定，學員端僅提示 */}
              <div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded-xl flex items-start gap-2">
                <Sparkles size={16} className="text-purple-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-purple-200 leading-normal font-bold light:text-purple-700">
                  審核通過後，你的成果有機會被分享到見證牆，讓大家一起見證！建議附上清楚的修行照片 📸
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowProofModal(false);
                    setSelectedTask(null);
                  }}
                  className="flex-1 btn-action py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting || (isEvolutionTask(selectedTask) && !proofImg)}
                  className="flex-1 btn-action py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center justify-center gap-1 shimmer-btn disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={14} />
                  {submitting ? '提交中...' : (isEvolutionTask(selectedTask) && !proofImg ? '請先上傳照片' : '提交證明')}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ 免證明直接簽到確認 Modal */}
      {showConfirmModal && confirmTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 modal-force-dark">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 animate-bounce">
                <CheckCircle2 size={32} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">
                  確認完成此項任務？
                </h3>
                <p className="text-base font-bold text-amber-500">
                  {confirmTask.name || confirmTask.title}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto light:text-slate-600">
                  此任務為「免證明簽到」，確認後將直接完成打卡，並獲得 <span className="text-amber-500 font-bold">+{confirmTask.score !== undefined ? confirmTask.score : confirmTask.points}</span> 經驗積分。
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmTask(null);
                }}
                className="flex-1 btn-action py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                尚未完成
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirmTask) {
                    const task = confirmTask;
                    // 立即關閉對話框並清空狀態，避免非同步重渲染時對話框閃爍
                    setShowConfirmModal(false);
                    setConfirmTask(null);
                    try {
                      await onCheckIn(task.id);
                    } catch (err) {
                      console.error(err);
                      // 若失敗，則重新還原對話框
                      setConfirmTask(task);
                      setShowConfirmModal(true);
                    }
                  }
                }}
                className="flex-1 btn-action py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs font-black shadow-[0_0_15px_rgba(245,158,11,0.4)] shimmer-btn"
              >
                確認完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔮 準備進化確認 Modal */}
      {showConfirmEvolve && (() => {
        const isFirst = !userPet || userPet.current_stage_index <= 1;
        
        // ── 1. 混沌之卵初次進化：完成對應任務即可選擇進化方向 ──
        if (isFirst) {
          const activeLines = [...petLines]
            .filter(l => l.is_active !== false)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          
          const activeSelection = selectedTempLine || userPet?.selected_evolution_line || null;
          
          const highlightedLine = activeLines.find(l => l.line_key === activeSelection);
          const highlightedStatus = (() => {
            if (!highlightedLine || !highlightedLine.task_template_id) return { completed: false, statusText: '未配置任務', statusColor: 'text-slate-500' };
            const studentBatchId = profile.batch_id || 'batch-50';
            const matchedMission = (missions || []).find(
              m => m.template_id === highlightedLine.task_template_id && m.batch_id === studentBatchId
            );
            if (!matchedMission) return { completed: false, statusText: '未選擇', statusColor: 'text-slate-400' };
            const sub = submissions.find(s => s.mission_id === matchedMission.id && s.student_id === profile.id);
            if (!sub) return { completed: false, statusText: '待提交', statusColor: 'text-amber-400' };
            if (sub.status === 'pending') return { completed: false, statusText: '審核中', statusColor: 'text-blue-400 animate-pulse' };
            if (sub.status === 'rejected') return { completed: false, statusText: '被退回', statusColor: 'text-red-400 font-bold' };
            if (sub.status === 'approved') return { completed: true, statusText: '任務通過', statusColor: 'text-green-400 font-bold' };
            return { completed: false, statusText: '待完成', statusColor: 'text-amber-400' };
          })();

          return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-300 modal-force-dark">
              <div className="glass-panel w-full max-w-3xl p-6 rounded-3xl border border-white/10 shadow-2xl relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 space-y-6">
                <div className="text-center space-y-2">
                  <span className="text-[10px] font-black tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md">
                    🔮 混沌破殼・選擇你的神秘進化方向
                  </span>
                  <h3 className="text-lg font-black text-white">
                    選擇一個進化方向
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                    點選下方神秘方向，完成對應任務挑戰並經由管理員審核通過後，即可破殼解密覺醒為您的專屬守護神獸！
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-h-[55vh] md:max-h-[65vh] overflow-y-auto pr-1">
                  {activeLines.map((line, idx) => {
                    const template = missionTemplates.find(t => t.id === line.task_template_id);
                    const isSelected = activeSelection === line.line_key;
                    
                    const statusCheck = (() => {
                      if (!line.task_template_id) return { completed: false, statusText: '未配置任務', statusColor: 'text-slate-500' };
                      const studentBatchId = profile.batch_id || 'batch-50';
                      const matchedMission = (missions || []).find(
                        m => m.template_id === line.task_template_id && m.batch_id === studentBatchId
                      );
                      if (!matchedMission) return { completed: false, statusText: '未選擇', statusColor: 'text-slate-400' };
                      const sub = submissions.find(s => s.mission_id === matchedMission.id && s.student_id === profile.id);
                      if (!sub) return { completed: false, statusText: '待提交', statusColor: 'text-amber-400' };
                      if (sub.status === 'pending') return { completed: false, statusText: '審核中', statusColor: 'text-blue-400 animate-pulse' };
                      if (sub.status === 'rejected') return { completed: false, statusText: '被退回', statusColor: 'text-red-400 font-bold' };
                      if (sub.status === 'approved') return { completed: true, statusText: '任務通過', statusColor: 'text-green-400 font-bold' };
                      return { completed: false, statusText: '待完成', statusColor: 'text-amber-400' };
                    })();

                    return (
                      <div
                        key={line.id}
                        onClick={() => setSelectedTempLine(line.line_key)}
                        className={`p-4 rounded-2xl border text-center evolution-card-mysterious cursor-pointer flex flex-col justify-between min-h-[240px] ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.25)] scale-102 animate-pulse'
                            : 'border-white/5 bg-slate-900/60 hover:border-white/20 hover:scale-101'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="relative w-16 h-16 mx-auto flex items-center justify-center bg-slate-950 rounded-xl border border-white/5 overflow-hidden">
                            {/* Silhouetted Image */}
                            {line.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={line.image_url}
                                alt="Silhouette"
                                className="w-12 h-12 object-contain silhouette-pet"
                              />
                            ) : (
                              <Sparkles className="text-slate-700" size={24} />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                              <span className="text-amber-500 text-lg font-black font-mono">?</span>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-xs font-black text-amber-500 tracking-wider">神秘進化方向 {String.fromCharCode(65 + idx)}</h4>
                            <span className="text-[9px] text-slate-500 font-bold block mt-0.5">Lv.{line.unlock_level || 5} 可解鎖</span>
                          </div>
                        </div>

                        <div className="space-y-2 mt-3">
                          {/* Task summary */}
                          <div className="bg-slate-950/80 border border-white/5 p-2 rounded-xl text-left space-y-1">
                            <div className="text-[9px] text-amber-500 font-bold flex items-center gap-0.5">
                              🎯 考驗任務
                            </div>
                            <div className="text-[10px] text-white font-bold truncate">
                              {template ? template.title.replace(/.*：/, '') : '未設定任務'}
                            </div>
                            <p className="text-[9px] text-slate-400 line-clamp-3 leading-normal font-medium">
                              {template ? template.description : '請管理員設定此流派之任務模板。'}
                            </p>
                          </div>

                          {/* Task status */}
                          <div className="text-[10px] bg-slate-900 border border-white/5 rounded-lg py-1 px-2 flex justify-between items-center">
                            <span className="text-slate-500 font-bold">任務狀態:</span>
                            <span className={`${statusCheck.statusColor} font-bold`}>{statusCheck.statusText}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmEvolve(false);
                      setSelectedTempLine(null);
                    }}
                    className="flex-1 btn-action py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold"
                  >
                    取消
                  </button>
                  {highlightedStatus.completed ? (
                    <button
                      type="button"
                      onClick={() => runEvolution(activeSelection!)}
                      className="flex-1 btn-action py-3 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white text-xs font-black shadow-[0_0_15px_rgba(236,72,153,0.4)] cursor-pointer font-bold shimmer-btn"
                    >
                      🔥 開始破殼解密儀式
                    </button>
                  ) : highlightedLine ? (
                    (() => {
                      const studentBatchId = profile.batch_id || 'batch-50';
                      const matchedMission = (missions || []).find(
                        m => m.template_id === highlightedLine.task_template_id && m.batch_id === studentBatchId
                      );
                      
                      const isCurrentlySelected = userPet?.selected_evolution_line === highlightedLine.line_key;

                      if (isCurrentlySelected && matchedMission) {
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              if (isCohortEnded) {
                                alert('已結束期數僅可查看，不可再互動或培養。');
                                return;
                              }
                              setShowConfirmEvolve(false);
                              handleMissionClick(matchedMission);
                            }}
                            className="flex-1 btn-action py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs font-black shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer font-bold shimmer-btn"
                          >
                            📝 立即提交進化任務證明
                          </button>
                        );
                      }
                      return (
                        <button
                          type="button"
                          disabled={isSelectingLine}
                          onClick={async () => {
                            if (isCohortEnded) {
                              alert('已結束期數僅可查看，不可再互動或培養。');
                              return;
                            }
                            setIsSelectingLine(true);
                            try {
                              await onSelectEvolutionLine(profile.id, highlightedLine.line_key);
                            } catch (err) {
                              console.error(err);
                              alert('啟用進化方向失敗，請重試。');
                            } finally {
                              setIsSelectingLine(false);
                            }
                          }}
                          className="flex-1 btn-action py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-xs font-black shadow-[0_0_15px_rgba(59,130,246,0.4)] cursor-pointer font-bold shimmer-btn disabled:opacity-50"
                        >
                          {isSelectingLine ? '🔮 正在開啟進化考驗...' : '🔮 確定選擇此進化方向並開啟任務'}
                        </button>
                      );
                    })()
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex-1 btn-action py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-500 text-xs font-bold"
                    >
                      👈 請選擇進化方向
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // ── 3. 後續突破進化 (Stage 2 -> 3, 3 -> 4, 4 -> 5 等) ──
        if (userPet) {
          const currentStage = petStages.find(s => s.line_key === userPet.pet_line && s.stage_index === userPet.current_stage_index);
          const nextStage = petStages.find(s => s.line_key === userPet.pet_line && s.stage_index === userPet.current_stage_index + 1);
          if (!currentStage || !nextStage) return null;
          
          return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-300 modal-force-dark">
              <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/10 shadow-2xl relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
                <div className="flex flex-col items-center text-center space-y-4 py-2">
                  <div className="w-16 h-16 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-500 animate-pulse">
                    <Sparkles size={32} />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-white">
                      🔮 靈能的突破共鳴
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                      你的神獸感應到你強大的 NLP 修行經驗，即將突破極限，進化至更高形態！
                    </p>
                    
                    <div className="bg-slate-900 border border-pink-500/30 p-4 rounded-2xl space-y-2 mt-2 text-center">
                      <span className="text-[10px] font-black tracking-widest text-pink-400 bg-pink-500/10 px-2.5 py-1 rounded-md inline-block">
                        流派特質：{userPet.pet_line === 'dragon' ? '影響力龍系' : userPet.pet_line === 'lion' ? '行動力獅系' : userPet.pet_line === 'fox' ? '親和力狐系' : '穩定靈獸系'}
                      </span>
                      <h4 className="text-sm font-black text-white mt-1">
                        【{currentStage?.stage_name}】進化 → 【{nextStage?.stage_name}】
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-bold">
                        進化要求：LV.{nextStage?.min_level} ~ LV.{nextStage?.max_level}
                      </p>
                      <p className="text-[11px] text-slate-400 leading-relaxed italic">
                        「{nextStage?.description || '神獸能量正在凝聚...'}」
                      </p>
                    </div>
                    
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto pt-2">
                      確認要開啟進化儀式，引導能量進行突破嗎？
                    </p>
                  </div>
                </div>
    
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowConfirmEvolve(false)}
                    className="flex-1 btn-action py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold"
                  >
                    先不進化
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (isCohortEnded) {
                        alert('已結束期數僅可查看，不可再互動或培養。');
                        setShowConfirmEvolve(false);
                        return;
                      }
                      setShowConfirmEvolve(false);
                      setIsEvolvingLocal(true);
                      
                      setTimeout(async () => {
                        try {
                          await onEvolvePet(userPet.student_id, userPet.pet_line!);
                          
                          setShowSuccessModal({
                            isSubsequent: true,
                            fromName: currentStage?.stage_name || '神獸型態',
                            toName: nextStage?.stage_name || '神獸新形態',
                            beastName: nextStage?.stage_name || '新突破形態',
                            lineName: userPet.pet_line === 'dragon' ? '影響力龍系' : userPet.pet_line === 'lion' ? '行動力獅系' : userPet.pet_line === 'fox' ? '親和力狐系' : '穩定靈獸系',
                            traits: nextStage?.evolution_text || '經驗大突破',
                            desc: nextStage?.description || '強大的神獸伴隨你繼續突破 NLP 修行。',
                            image: nextStage?.image_url || 'https://images.unsplash.com/photo-1516233758813-a38d024919c5?auto=format&fit=crop&q=80&w=300',
                            glowColor: nextStage?.glow_color || '#A855F7'
                          });
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setIsEvolvingLocal(false);
                        }
                      }, 800);
                    }}
                    className="flex-1 btn-action py-3 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white text-xs font-black shadow-[0_0_15px_rgba(236,72,153,0.4)] cursor-pointer font-bold shimmer-btn"
                  >
                    🔥 開始進化儀式
                  </button>
                </div>
              </div>
            </div>
          );
        }
        
        return null;
      })()}

      {/* 🎉 進化成功分享 Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300 modal-force-dark">
          <div className="glass-panel w-full max-w-sm p-6 rounded-3xl border border-white/20 shadow-2xl relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-center space-y-6">
            
            {/* Header info */}
            <div>
              <span className="text-[10px] font-black tracking-widest text-pink-400 bg-pink-500/10 px-2.5 py-1 rounded-md">
                NLP 守護神獸進化成功
              </span>
              {showSuccessModal.isSubsequent ? (
                <div className="mt-3 space-y-1">
                  <h2 className="text-lg font-black text-white">
                    恭喜！你的【{showSuccessModal.fromName}】
                  </h2>
                  <h2 className="text-lg font-black text-amber-500">
                    進化為【{showSuccessModal.toName}】
                  </h2>
                </div>
              ) : (
                <h2 className="text-2xl font-black text-white mt-3">
                  {showSuccessModal.beastName}
                </h2>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {showSuccessModal.isSubsequent 
                  ? `恭喜成功解鎖 ${showSuccessModal.lineName} 進化型態`
                  : `恭喜成功解鎖 ${showSuccessModal.lineName}`
                }
              </p>
            </div>

            {/* Beast Visual */}
            <div className="relative flex justify-center items-center py-4 select-none">
              <div 
                className="absolute w-48 h-48 rounded-full blur-2xl opacity-40 animate-pulse"
                style={{ backgroundColor: showSuccessModal.glowColor }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={showSuccessModal.image} 
                alt={showSuccessModal.beastName}
                className="w-36 h-36 object-contain rounded-2xl border relative z-10 animate-float"
                style={{ 
                  boxShadow: `0 0 30px ${showSuccessModal.glowColor}aa`,
                  border: `2px solid ${showSuccessModal.glowColor}55`
                }}
              />
            </div>

            {/* Trait Card */}
            <div className="bg-slate-900/80 border border-white/5 p-4 rounded-2xl text-left space-y-1">
              <div className="text-[10px] text-slate-400 font-bold">NLP 特質屬性</div>
              <div className="text-xs text-amber-400 font-mono font-black">{showSuccessModal.traits}</div>
              <div className="text-[11px] text-slate-300 pt-1 leading-relaxed">{showSuccessModal.desc}</div>
            </div>

            {/* Sharing slogan */}
            <p className="text-[10px] text-slate-400 italic">
              「NLP 人性溝通術・神獸守護進化契約已突破」
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSuccessModal(null)}
                className="flex-1 btn-action py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-xs font-black shadow-lg cursor-pointer transition-all active:scale-95 shimmer-btn"
              >
                確 定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 神獸升級成功 Modal */}
      {showLevelUpModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300 modal-force-dark">
          <div className="glass-panel level-up-glow-card w-full max-w-sm p-6 rounded-3xl border border-white/20 shadow-2xl relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-center space-y-6">
            
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 animate-bounce">
              <Sparkles size={32} />
            </div>

            <div>
              <span className="text-[10px] font-black tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md">
                🏆 升級成功 (Level Up!)
              </span>
              <h2 className="text-xl font-black text-white mt-3">
                {showLevelUpModal.petName} 突破成長！
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                恭喜，您的 NLP 守護神獸獲得了新的力量！
              </p>
            </div>

            {/* Level Change display */}
            <div className="bg-slate-900/80 border border-white/5 p-4 rounded-2xl flex justify-around items-center">
              <div className="text-center">
                <div className="text-[10px] text-slate-500 font-bold">原本等級</div>
                <div className="text-lg font-black text-slate-400">LV.{showLevelUpModal.oldLevel}</div>
              </div>
              <div className="text-amber-500 font-black text-xl animate-pulse">➔</div>
              <div className="text-center">
                <div className="text-[10px] text-amber-500 font-bold">目前等級</div>
                <div className="text-xl font-black text-amber-400">LV.{showLevelUpModal.newLevel}</div>
              </div>
            </div>

            {/* EXP details */}
            <div className="text-left bg-slate-950 p-3.5 rounded-xl border border-white/5 space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>目前總經驗：</span>
                <span className="text-amber-500">{showLevelUpModal.totalExp.toLocaleString()} EXP</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>距離下一次升級：</span>
                <span>{500 - (showLevelUpModal.totalExp % 500)} EXP</span>
              </div>
            </div>

            {/* Evolution Prompt */}
            {showLevelUpModal.hasPendingEvolution && (
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-pink-500/30 p-3.5 rounded-xl text-center animate-pulse">
                <span className="text-xs font-black text-pink-400 block">
                  ✨ 已達進化等級 Lv.5 門檻！
                </span>
                <span className="text-[10px] text-slate-300 block mt-1 leading-relaxed">
                  神秘進化考驗已解鎖，請前往下方寵物面板進行進化儀式，選擇你的專屬考驗任務！
                </span>
              </div>
            )}

            <div className="flex pt-2">
              <button
                type="button"
                onClick={() => setShowLevelUpModal(null)}
                className="flex-1 btn-action py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-xs font-black shadow-lg cursor-pointer transition-all active:scale-95 shimmer-btn"
              >
                好的，太棒了！
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

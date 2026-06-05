'use client';

import React, { useState } from 'react';
import { Task, Submission, Announcement, Profile, Mission } from '@/types';
import { 
  CheckCircle2, Circle, Clock, MessageSquare, 
  AlertCircle, FileText, Send, Flame, Sparkles, 
  Star, Timer, ExternalLink, ChevronDown, ChevronUp, X, ImageIcon
} from 'lucide-react';

interface DailyQuestsTabProps {
  profile: Profile;
  tasks: Task[];
  submissions: Submission[];
  announcements: Announcement[];
  onCheckIn: (taskId: string, proofText?: string, proofImg?: string, proofLink?: string) => Promise<void>;
  isSyncing: boolean;
  missions?: Mission[];
  showToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

function getCountdownText(endTimeStr: string | undefined): { text: string; isUrgent: boolean; isExpired: boolean } | null {
  if (!endTimeStr) return null;
  const endTime = new Date(endTimeStr).getTime();
  const now = Date.now();
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

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
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
  showToast
}: DailyQuestsTabProps) {
  const [activeCategory, setActiveCategory] = useState<'daily' | 'weekly' | 'special' | 'temporary'>('daily');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [proofText, setProofText] = useState('');
  const [proofLink, setProofLink] = useState('');
  const [showProofModal, setShowProofModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTask, setConfirmTask] = useState<any | null>(null);

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

  // Level and Pet stage logic
  const userLevel = Math.min(99, Math.floor(profile.score / 1000) + 1);

  // --- Pet Dialogue Bubble States & Functions ---
  const [petBubble, setPetBubble] = useState<string | null>(null);

  React.useEffect(() => {
    const welcomeMsgs = {
      egg: "混沌初開...等主人帶我破殼！🐣",
      chick: "啾啾！今天也是修行滿滿的一天！🐥",
      sprite: "主人，我的心錨準備好了！隨時出發！✨",
      dragon: "尊者降臨！今天想拆解什麼限制信念？🐉"
    };
    
    let msg = welcomeMsgs.egg;
    if (userLevel > 9) msg = welcomeMsgs.dragon;
    else if (userLevel > 6) msg = welcomeMsgs.sprite;
    else if (userLevel > 3) msg = welcomeMsgs.chick;
    
    setPetBubble(msg);
    const timer = setTimeout(() => {
      setPetBubble(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [userLevel]);

  const triggerPetBubble = () => {
    let pool: string[] = [];
    if (userLevel <= 3) {
      pool = [
        "蛋殼熱呼呼的...主人加油！🔥",
        "咕嚕咕嚕...我正在吸收你的修行能量...",
        "（蛋殼輕微晃動了一下，發出微光）✨",
        "等我破殼，我會成為主人最強的溝通助手！"
      ];
    } else if (userLevel <= 6) {
      pool = [
        "主人主人！今天有好好覺察自己的感官系統嗎？👁️",
        "啾啾！聽說寫見證分享可以獲得很多修行分數喔！📝",
        "呼哈...今天又是充滿親和力的一天！🌈",
        "點擊下方的任務卡片就能去簽到修行囉！🚀"
      ];
    } else if (userLevel <= 9) {
      pool = [
        "我的親和感光環已經升級啦！🥰",
        "主人，隨時保持在卓越狀態（State）喔！💎",
        "今天也要打破大家的限制性信念！💪",
        "（自信地拍了拍胸口，對你笑了一下）✨"
      ];
    } else {
      pool = [
        "吼！人際溝通的奧秘，我已全盤掌握！🐉",
        "跟隨主人修行，是我龍生最明智的決定！👑",
        "對話的藝術在於聆聽與建立共鳴...",
        "（傲嬌地吐了一小口帶有香味的修行火焰）🔥"
      ];
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



  const getPetInfo = (level: number) => {
    if (level <= 3) {
      return {
        name: "混沌之卵 (Chaos Egg)",
        desc: "微光閃爍，蛋殼上刻有感官紋路，正持續吸納您的溝通修為以孵化...",
        render: () => (
          <svg className="w-24 h-32 animate-pulse select-none filter drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="50" cy="95" rx="30" ry="10" fill="rgba(245,158,11,0.1)" />
            <path d="M50 15 C25 15 15 55 15 80 C15 98 31 110 50 110 C69 110 85 98 85 80 C85 55 75 15 50 15 Z" fill="url(#eggGrad)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <path d="M45 25 C30 25 23 55 23 75 C23 90 33 100 45 100" stroke="rgba(255,255,255,0.15)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="20" cy="40" r="2" fill="#fbbf24" className="animate-ping" />
            <defs>
              <radialGradient id="eggGrad" cx="50%" cy="65%" r="50%" fx="30%" fy="30%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#fbbf24" />
                <stop offset="85%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#78350f" />
              </radialGradient>
            </defs>
          </svg>
        )
      };
    } else if (level <= 6) {
      return {
        name: "啟盟小雛 (Enlightening Chick)",
        desc: "已經破殼而出！對周遭的感官系統（視覺、聽覺、觸覺）表現出強烈的好奇與覺察...",
        render: () => (
          <svg className="w-24 h-32 animate-pulse select-none filter drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="50" cy="95" rx="30" ry="10" fill="rgba(245,158,11,0.1)" />
            <circle cx="50" cy="55" r="22" fill="#fbbf24" />
            <circle cx="42" cy="52" r="3" fill="#0f172a" />
            <circle cx="58" cy="52" r="3" fill="#0f172a" />
            <path d="M50 56 L46 62 L54 62 Z" fill="#ea580c" />
            <path d="M15 80 C15 98 31 110 50 110 C69 110 85 98 85 80 C85 70 80 65 75 70 L65 60 L55 70 L45 60 L35 70 L25 60 L15 80 Z" fill="url(#eggGrad)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <path d="M50 15 C33 15 21 38 20 52 L30 45 L40 52 L50 45 L60 52 L70 45 L80 52 C79 38 67 15 50 15 Z" fill="url(#eggGrad)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <defs>
              <radialGradient id="eggGrad" cx="50%" cy="65%" r="50%" fx="30%" fy="30%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#fbbf24" />
                <stop offset="85%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#78350f" />
              </radialGradient>
            </defs>
          </svg>
        )
      };
    } else if (level <= 9) {
      return {
        name: "卓越萌獸 (State Sprite)",
        desc: "學會掌控心錨與卓越狀態，眼神充滿自信，能散發強大的親和感...",
        render: () => (
          <svg className="w-24 h-32 animate-pulse select-none filter drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="50" cy="100" rx="35" ry="12" fill="rgba(245,158,11,0.15)" />
            <circle cx="50" cy="80" r="25" fill="url(#eggGrad)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <circle cx="50" cy="45" r="20" fill="url(#eggGrad)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <path d="M35 35 L20 15 L32 27 Z" fill="#d97706" />
            <path d="M65 35 L80 15 L68 27 Z" fill="#d97706" />
            <circle cx="42" cy="45" r="3.5" fill="#fef08a" />
            <circle cx="58" cy="45" r="3.5" fill="#fef08a" />
            <circle cx="36" cy="50" r="2.5" fill="#f87171" opacity="0.6" />
            <circle cx="64" cy="50" r="2.5" fill="#f87171" opacity="0.6" />
            <path d="M47 52 Q50 54 53 52" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
            <defs>
              <radialGradient id="eggGrad" cx="50%" cy="65%" r="50%" fx="30%" fy="30%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#fbbf24" />
                <stop offset="85%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#78350f" />
              </radialGradient>
            </defs>
          </svg>
        )
      };
    } else {
      return {
        name: "溝通幻龍 (Comm. Dragon)",
        desc: "終極進化形態！能輕鬆拆解他人限制性信念，人際共鳴已臻至化境。",
        render: () => (
          <svg className="w-24 h-32 animate-bounce select-none filter drop-shadow-[0_0_25px_rgba(245,158,11,0.5)]" style={{ animationDuration: '4s' }} viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="50" cy="105" rx="40" ry="14" fill="rgba(245,158,11,0.2)" />
            <path d="M50 15 L25 45 L35 75 L50 95 L65 75 L75 45 Z" fill="url(#eggGrad)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <path d="M35 25 L15 5 L28 20 Z" fill="#d97706" />
            <path d="M65 25 L85 5 L72 20 Z" fill="#d97706" />
            <polygon points="38,48 44,48 42,54 36,54" fill="#ffffff" className="animate-pulse" />
            <polygon points="62,48 56,48 58,54 64,54" fill="#ffffff" className="animate-pulse" />
            <path d="M45 80 L50 85 L55 80" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
            <path d="M35 100 Q50 115 65 100 Q50 105 35 100 Z" fill="url(#fireGrad)" opacity="0.8" />
            <defs>
              <radialGradient id="eggGrad" cx="50%" cy="65%" r="50%" fx="30%" fy="30%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#fbbf24" />
                <stop offset="85%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#78350f" />
              </radialGradient>
              <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        )
      };
    }
  };

  const petInfo = getPetInfo(userLevel);

  // Attributes calculation
  const attrAcuity = Math.min(100, 30 + Math.floor(profile.score / 150));
  const attrStability = Math.min(100, 25 + Math.floor(profile.score / 180));
  const attrRapport = Math.min(100, 40 + Math.floor(profile.score / 120));
  const attrReshaping = Math.min(100, 20 + Math.floor(profile.score / 200));

  // Task filtering logic
  const filteredTasks = tasks.filter(t => {
    if (activeCategory === 'daily') return t.type === 'daily';
    if (activeCategory === 'weekly') return t.type === 'weekly';
    if (activeCategory === 'special') return t.type === 'temporary';
    if (activeCategory === 'temporary') return t.type === 'limited';
    return false;
  });

  const now = new Date();
  const isUsingMissions = profile.role !== 'admin' && !!profile.batch_id;

  const displayMissions = isUsingMissions
    ? missions.filter(m => {
        const publishTime = new Date(m.publish_at);
        const deadlineTime = new Date(m.deadline_at);
        const sub = submissions.find(s => s.mission_id === m.id);
        const isCompleted = sub && (sub.status === 'approved' || sub.status === 'pending');
        const isUncompletedExpiredShow = (m.mission_type === 'weekly' || m.mission_type === 'special' || m.mission_type === 'limited') && !isCompleted;

        return m.batch_id === profile.batch_id &&
               publishTime <= now &&
               (deadlineTime >= now || isUncompletedExpiredShow) &&
               (m.status === 'active' || m.status === 'scheduled');
      })
    : [];

  const filteredMissions = displayMissions.filter(m => {
    if (activeCategory === 'daily') return m.mission_type === 'daily';
    if (activeCategory === 'weekly') return m.mission_type === 'weekly';
    if (activeCategory === 'special') return m.mission_type === 'special';
    if (activeCategory === 'temporary') return m.mission_type === 'limited';
    return false;
  });

  // Helper to check completion status
  const getTaskStatus = (taskId: string) => {
    const sub = submissions.find(s => s.mission_id === taskId);
    if (!sub) return 'none';
    return sub.status; // 'pending' | 'approved' | 'rejected'
  };

  const getTaskSubmission = (taskId: string) => {
    return submissions.find(s => s.mission_id === taskId);
  };

  const handleCardClick = (task: Task) => {
    const status = getTaskStatus(task.id);
    if (status === 'approved' || status === 'pending') return; // already done/pending

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
    const status = getTaskStatus(mission.id);
    if (status === 'approved' || status === 'pending') return;

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

    setSubmitting(true);
    try {
      await onCheckIn(selectedTask.id, proofText, proofImg || undefined, proofLink);
      setShowProofModal(false);
      setSelectedTask(null);
      setProofImg('');
    } catch (err) {
      console.error(err);
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
    
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeB - timeA;
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* 🥚 寵物蛋與修行屬性面板 */}
      <section className="glass-panel p-6 rounded-3xl border border-white/10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-gradient-to-br from-slate-900/60 to-slate-950/60 light:bg-none light:bg-white light:border-slate-200">
        
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
            className="relative flex items-center justify-center h-40 cursor-pointer transition-transform hover:scale-105 active:scale-95"
            title="點擊與寵物互動"
          >
            {petInfo.render()}
          </div>
          <div className="text-center mt-2 select-none">
            <h4 className="text-sm font-black text-amber-500 uppercase tracking-widest">{petInfo.name}</h4>
            <span className="text-[10px] font-black text-slate-500 bg-slate-950 px-2 py-0.5 rounded-full mt-1 inline-block light:bg-slate-100">
              成長等級：LV.{userLevel}
            </span>
          </div>
        </div>

        {/* Right: Info & Core Attributes */}
        <div className="md:col-span-8 space-y-4">
          <div className="text-left">
            <h3 className="text-base font-black text-white flex items-center gap-1.5 select-none">
              孵化狀態與NLP修為屬性
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed light:text-slate-500">
              {petInfo.desc}
            </p>
          </div>

          {/* Overall level progress bar */}
          <div className="space-y-1 select-none">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-slate-400">🔥 升級進度 (Next Level)</span>
              <span className="text-amber-500">{(profile.score % 1000).toLocaleString()} / 1,000 EXP</span>
            </div>
            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-white/5 light:bg-slate-100 light:border-slate-300">
              <div 
                className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                style={{ width: `${(profile.score % 1000) / 10}%` }}
              />
            </div>
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition-all duration-200 select-none ${
                  activeCategory === key
                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800 light:hover:bg-slate-200'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Task/Mission Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isUsingMissions && filteredMissions.length > 0
            ? filteredMissions.map((mission) => {
                  const nowTime = Date.now();
                  const pubTime = new Date(mission.publish_at).getTime();
                  const deadTime = new Date(mission.deadline_at).getTime();
                  const status = getTaskStatus(mission.id);
                  const isDone = status === 'approved' || status === 'pending';

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

                      {/* Status Indicator Badge */}
                      <div className="absolute top-4 right-4">
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

                      <div>
                        <div className="flex gap-1.5 items-center flex-wrap">
                          <span className="text-[10px] font-black tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md">
                            {mission.mission_type === 'daily'
                              ? '每日任務'
                              : mission.mission_type === 'weekly'
                              ? '每週任務'
                              : mission.mission_type === 'limited'
                              ? '限時挑戰'
                              : '特殊加碼'}
                          </span>
                          <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md border text-amber-500 bg-amber-500/10 border-amber-500/20">
                            +{mission.points} 修為
                          </span>
                          {!isExpired && !isFuture && (() => {
                            const countdown = getCountdownText(mission.deadline_at);
                            if (!countdown) return null;
                            return (
                              <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md flex items-center gap-0.5 border ${
                                countdown.isExpired
                                  ? 'text-slate-500 bg-slate-900/50 border-white/5'
                                  : countdown.isUrgent
                                  ? 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse'
                                  : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                              }`}>
                                <Timer size={10} />
                                {countdown.text}
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
                  const status = getTaskStatus(task.id);
                  const sub = getTaskSubmission(task.id);
                  const isDone = status === 'approved' || status === 'pending';

                  return (
                    <div
                      key={task.id}
                      onClick={() => !isDone && handleCardClick(task)}
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
                        <div className="flex gap-1.5 items-center flex-wrap">
                          {getCategoryBadge(task)}
                          <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md border ${
                            isDone
                              ? 'text-slate-500 bg-slate-800/60 border-white/5 light:bg-slate-200 light:text-slate-500'
                              : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                          }`}>
                            +{task.score} 修為
                          </span>
                          {!isDone && (() => {
                            const countdown = getCountdownText(task.end_time);
                            if (!countdown) return null;
                            return (
                              <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md flex items-center gap-0.5 border ${
                                countdown.isExpired
                                  ? 'text-slate-500 bg-slate-900/50 border-white/5'
                                  : countdown.isUrgent
                                  ? 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse'
                                  : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                              }`}>
                                <Timer size={10} />
                                {countdown.text}
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* 📷 選擇圖片 / 抓相簿 */}
              <div>
                <label className="block text-xs text-slate-400 font-bold mb-2">
                  上傳修行圖片 / 對話截圖 (選填)
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="bg-slate-900/50 border border-white/5 p-3 rounded-xl flex items-start gap-2 light:bg-slate-100 light:border-slate-300">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-normal font-bold light:text-slate-600">
                  送出後，系統小隊長或大隊長將會進行手動審核。審核通過即可獲得 {selectedTask.score !== undefined ? selectedTask.score : selectedTask.points} 修為積分。
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
                  disabled={submitting}
                  className="flex-1 btn-action py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center justify-center gap-1 shimmer-btn"
                >
                  <Send size={14} />
                  {submitting ? '提交中...' : '提交證明'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⚠️ 免證明直接簽到確認 Modal */}
      {showConfirmModal && confirmTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                  此任務為「免證明簽到」，確認後將直接完成打卡，並獲得 <span className="text-amber-500 font-bold">+{confirmTask.score !== undefined ? confirmTask.score : confirmTask.points}</span> 修為積分。
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
                    try {
                      await onCheckIn(confirmTask.id);
                    } catch (err) {
                      console.error(err);
                    }
                  }
                  setShowConfirmModal(false);
                  setConfirmTask(null);
                }}
                className="flex-1 btn-action py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs font-black shadow-[0_0_15px_rgba(245,158,11,0.4)] shimmer-btn"
              >
                確認完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

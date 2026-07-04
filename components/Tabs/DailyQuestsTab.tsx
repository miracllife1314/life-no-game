'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Task, Submission, Announcement, Profile, Mission, UserPet, PetStage, Batch, PetLine, MissionTemplate } from '@/types';
import { nowTaipei, taipeiDateStr } from '@/lib/time';
import { supabase } from '@/lib/supabase';
import { parsePetOffset } from '@/lib/petImage';
import { safeLinkHref } from '@/lib/helpers';
import {
  parseLocalTime, isEvolutionTask, getActiveStage, getCountdownText,
  isTodayLocal, isTodayInRangeLocal, compressImage,
} from '@/lib/dailyQuestLogic';
import { getAllGuides } from '@/lib/guideConfig';
import { calculateLevelFromExp, getExpProgressInCurrentLevel, getExpThresholdForLevel } from '@/lib/levelLogic';
import { SuccessModal } from '@/components/Tabs/quests/SuccessModal';
import { LevelUpModal } from '@/components/Tabs/quests/LevelUpModal';
import { ProofModal } from '@/components/Tabs/quests/ProofModal';
import { ConfirmModal } from '@/components/Tabs/quests/ConfirmModal';
import { MilestoneModal } from '@/components/Tabs/quests/MilestoneModal';
import {
  CheckCircle2, Circle, Clock, MessageSquare,
  AlertCircle, FileText, Send, Flame, Sparkles, 
  Star, Timer, ExternalLink, ChevronDown, ChevronUp, X, ImageIcon, Upload
} from 'lucide-react';

const DAILY_WORD_POOL = [
  '學習', '專注', '行動', '運動', '溝通', '傾聽', '喜悅', '感恩', '轉念', '熱情',
  '包容', '肯定', '讚美', '信任', '堅持', '承諾', '負責', '尊重', '接納', '體貼',
  '誠實', '勇敢', '自信', '謙虛', '耐心', '溫柔', '樂觀', '平靜', '喜樂', '豐盛',
  '自由', '創造', '效率', '突破', '分享', '合作', '支持', '陪伴', '理解', '同理',
  '回饋', '探索', '冒險', '好奇', '創新', '直覺', '智慧', '冷靜', '放鬆', '療癒',
  '淨化', '覺察', '紀律', '恆心', '毅力', '決心', '蛻變', '重生', '誠意'
];

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
  onModalActiveChange?: (active: boolean) => void;
  userEnrollments?: Profile[];
  onSwitchCohort?: (batchId: string) => void;
}


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
  onSelectEvolutionLine,
  onModalActiveChange,
  userEnrollments = [],
  onSwitchCohort
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

  // --- 🔮 以終為始每日抽卡 States ---
  const [dailyDraw, setDailyDraw] = useState<{ word: string; drawnDate: string } | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isLoadingDraw, setIsLoadingDraw] = useState(true);
  const [isDrawingAnimation, setIsDrawingAnimation] = useState(false);

  // --- 🛡️ 連勝護盾:載入本人「被護盾補上的日期」,連勝計算會把這些天也算成有打卡 ---
  const [shieldDayKeys, setShieldDayKeys] = useState<Set<string>>(new Set());
  const [showShieldInfo, setShowShieldInfo] = useState(false);   // 護盾說明彈窗
  const missionBoardRef = useRef<HTMLDivElement>(null);          // 「前往賺護盾」捲動目標

  // 前往任務區(切到限時分頁 + 捲到任務清單),讓「前往賺護盾」真的帶使用者到任務畫面
  const goEarnShield = () => {
    setShowShieldInfo(false);
    setActiveCategory('temporary');
    setTimeout(() => missionBoardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  };

  // Cohort resolving logic
  const activeProfile = profile;
  const activeBatch = batches.find(b => b.id === profile.batch_id);
  const userPet = allUserPets.find(up => up.student_id === activeProfile.id) || propUserPet;
  const batchStartDate = activeBatch ? activeBatch.start_date : propBatchStartDate;
  const isCohortEnded = profile.status === 'ended' || profile.status === 'inactive' || (activeBatch ? activeBatch.status === 'ended' : false);
  const isUserAdvanced = !!(activeBatch?.name?.includes('進階') || activeBatch?.name?.includes('高階') || activeBatch?.name?.includes('班長班'));
  const isAdmin = profile.role === 'admin';

  // 載入本人的護盾補日(submissions 變動時一併重抓,打卡後若觸發護盾能即時反映)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeProfile?.id) return;
      const { data } = await supabase
        .from('streak_shield_days')
        .select('covered_date')
        .eq('student_id', activeProfile.id);
      if (cancelled || !data) return;
      const keys = new Set<string>(
        data.map((r: any) => {
          const dt = parseLocalTime(r.covered_date);
          return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
        })
      );
      setShieldDayKeys(keys);
    })();
    return () => { cancelled = true; };
  }, [activeProfile?.id, submissions.length]);

  // Level and Pet stage logic
  const totalExp = userPet ? userPet.total_exp : activeProfile.score;
  const userLevel = userPet ? userPet.level : calculateLevelFromExp(activeProfile.score);

  // --- 🔮 以終為始每日抽卡 Logic ---
  useEffect(() => {
    if (!profile?.id) {
      setIsLoadingDraw(false);
      return;
    }
    let isMounted = true;
    
    const fetchDailyDraw = async () => {
      try {
        const { data, error } = await supabase
          .from('daily_draws')
          .select('*')
          .eq('student_id', profile.id)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        if (isMounted) {
          if (data) {
            setDailyDraw({ word: data.card_word, drawnDate: data.drawn_date });
          } else {
            // Fallback: Check local storage
            const local = localStorage.getItem(`nlp_daily_draw_${profile.id}`);
            if (local) {
              const parsed = JSON.parse(local);
              if (parsed && parsed.word && parsed.drawnDate) {
                setDailyDraw(parsed);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Supabase fetch daily draw failed, trying localStorage fallback:', err);
        if (isMounted) {
          const local = localStorage.getItem(`nlp_daily_draw_${profile.id}`);
          if (local) {
            try {
              const parsed = JSON.parse(local);
              if (parsed && parsed.word && parsed.drawnDate) {
                setDailyDraw(parsed);
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingDraw(false);
        }
      }
    };
    
    fetchDailyDraw();
    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  const handleDrawCard = async () => {
    if (isCohortEnded) {
      showToast?.('已結束期數僅可查看，不可再抽卡。', 'info');
      return;
    }
    const todayStr = taipeiDateStr();
    if (dailyDraw && dailyDraw.drawnDate === todayStr) {
      showToast?.('今天已經抽過卡片囉！', 'info');
      return;
    }
    if (isFlipping || isDrawingAnimation) return;

    // 1. 開始抽出卡片動畫 (向外滑出/浮起)
    setIsDrawingAnimation(true);

    const randomIndex = Math.floor(Math.random() * DAILY_WORD_POOL.length);
    const selectedWord = DAILY_WORD_POOL[randomIndex];
    const newDraw = { word: selectedWord, drawnDate: todayStr };

    // 延遲 450ms 讓卡片滑出後，再設定資料並開始 3D 翻轉
    setTimeout(async () => {
      try {
        // 寫入 Supabase (採用 upsert 以便每日覆蓋，保持一人僅一筆)
        const { error } = await supabase
          .from('daily_draws')
          .upsert({
            student_id: profile.id,
            card_word: selectedWord,
            drawn_date: todayStr
          }, { onConflict: 'student_id' });
          
        if (error) throw error;
      } catch (err: any) {
        console.warn('Failed to save daily draw to database, saving to localStorage fallback:', err.message);
      }

      // 同步更新 LocalStorage 作為備用與雙重保險
      localStorage.setItem(`nlp_daily_draw_${profile.id}`, JSON.stringify(newDraw));

      // 設定抽卡資料，觸發正面渲染
      setDailyDraw(newDraw);
      setIsFlipping(true);

      // 延遲 800ms 等待翻牌特效完成
      setTimeout(() => {
        setIsFlipping(false);
        setIsDrawingAnimation(false);
        showToast?.(`🔮 成功抽取今日修行詞彙：【${selectedWord}】`, 'success');
      }, 800);
    }, 450);
  };

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
        "等我破殼，我會成為主人最強的溝通助手！",
        "蛋裡有點擠…但為了主人，我會努力長大的！🥚",
        "噓——我在偷偷練習破殼的帥氣姿勢…💪",
        "主人多打卡，我就多吸一點能量，快破殼啦！⚡",
        "破殼倒數中…主人今天可別偷懶喔！⏳",
        "做夢夢到自己變成超強神獸…欸，是真的會喔！😴✨",
        "別看我是顆蛋，我可是很有想法的呢！🤔",
        "今天的修行能量…嗯，本蛋給五星好評！⭐",
        "咚咚咚…聽得到嗎？那是我想長大的心跳！💓",
        "再陪我一下下，破殼那天一定超精彩！🎉"
      ];
    } else {
      switch (userPet.pet_line) {
        case 'dragon':
          pool = [
            "尊者降臨！今天想拆解什麼限制信念？🐉",
            "吼！人際溝通的奧秘，我已全盤掌握！💎",
            "跟隨主人修行，是我龍生最明智的決定！👑",
            "對話的藝術在於聆聽與建立共鳴...",
            "（傲嬌地吐了一小口帶有香味的修行火焰）🔥",
            "限制信念？在本尊面前不過是紙糊的牆。一戳就破。🐉",
            "哼，主人今天的氣場…勉強及格啦。💎",
            "真正的強者，話不多，但句句到位。",
            "本尊昨晚順手參透了三個溝通模式，小事一樁。😏",
            "想呼風喚雨？先學會呼應對方的世界觀。🌪️",
            "龍鱗會反光，但更耀眼的是主人的成長。✨",
            "別急，大師都是慢慢熬出來的…雖然本尊是例外。👑",
            "今天也要堂堂正正地溝通，別繞圈子！🔥",
            "本尊的鱗片每一片都刻著一句金句，要聽嗎？😎"
          ];
          break;
        case 'lion':
          pool = [
            "吼！目標已鎖定，讓我們以卓越執行力迅速行動！🦁",
            "風暴在咆哮，但我們的信念堅如磐石！⚡",
            "主人，今天也有好好把想法轉化為行動嗎？🏃",
            "無畏前行！執行力就是我們最強大的武器！⚔️",
            "（自信地亮出利爪，對你點了點頭）✨",
            "想到就做！猶豫一秒，獵物就跑了！🦁",
            "主人，今天的目標清單，撕一張下來吧！✂️",
            "恐懼是紙老虎，行動才是真獅子！💥",
            "三、二、一…衝！別讓藉口追上你！🏃💨",
            "鬃毛甩一甩，壞情緒甩光光！💆",
            "說出口的承諾，就用爪子刻在心上！🐾",
            "今天也要做個說到做到的人，吼！🔥",
            "別只是想著要溝通——現在就去開口！⚡",
            "稱霸不是靠吼，是靠每天的累積。主人，繼續！💪"
          ];
          break;
        case 'fox':
          pool = [
            "嘻嘻，今天有好好建立親和感嗎？呼應感官系統喔！🦊",
            "我能敏銳感知對方的微表情，隨時指引主人！👁️",
            "聽說寫感恩定課與見證能讓親和力大幅提升唷！📝",
            "點擊下方的任務卡片就能去簽到修行囉！🚀",
            "（靈巧地搖了搖尾巴，對你眨眨眼）🥰",
            "偷偷說…多微笑，親和力立刻 +10！😁",
            "主人剛剛皺眉了喔，記得呼吸放鬆一下~🍃",
            "讀心術的秘密就是：先讀懂自己的心。🔮",
            "今天也要當個有溫度的傾聽者唷！👂💕",
            "尾巴掃一掃，把尷尬的氣氛掃掉！🌀",
            "感官敏銳度上線！主人有沒有打卡我都知道喔~👀",
            "嘻嘻，聽說寫見證的人運氣都特別好（我亂說的啦）！🍀",
            "建立親和感的第一步，是讓對方覺得『你懂我』。✨",
            "對方的小動作藏著大訊息，主人有看見嗎？🕵️"
          ];
          break;
        case 'spirit':
          pool = [
            "嘩啦...在沉靜的潮汐中，放空自我，聽見內心的聲音。🌊",
            "穩定的支持與極致同理，是溝通中最溫柔的力量。💙",
            "主人，不論修行如何，我都會在你身邊靜靜守護。✨",
            "呼哈...沉靜如水，這份包容就是最極致的心智境界。🧘",
            "（散發出溫柔的藍色螢光，輕微蹭了蹭你）🌊",
            "深呼吸…把焦慮交給潮水帶走吧。🌊",
            "最強的回應，有時是安靜地陪伴。🤍",
            "主人累了嗎？來，靠著我休息一下下。😌",
            "情緒像浪，來了會走，不用怕。🌊",
            "同理不是認同，是願意去懂。💙",
            "心靜下來，答案自己會浮上來。🧘",
            "今天也要溫柔地對待自己，好嗎？✨",
            "傾聽的時候，連沉默都是一種溫柔。🤍",
            "再急的事，先深呼吸三次，世界就慢下來了。🌬️"
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
        // 是否可進化:與「面板進化按鈕」同一判斷 → 蛋達 Lv5,或後續階段已被標記可進化(has_pending_evolution)
        const eligibleToEvolve = !isCohortEnded && (
          userPet.has_pending_evolution ||
          (userPet.current_stage_index <= 1 && userPet.level >= 5)
        );

        setShowLevelUpModal({
          petName: activeStage?.stage_name || '修行小龍蛋',
          oldLevel: storedLevel,
          newLevel: storedLevel + 1,   // 一次只升一級
          finalLevel: userPet.level,   // 這次經驗實際升到的最終等級(逐級確認到這)
          totalExp: userPet.total_exp,
          stageIndex: userPet.current_stage_index,
          hasPendingEvolution: eligibleToEvolve
        });
      }
    }
    
    localStorage.setItem(key, String(userPet.level));
  }, [userPet?.level, userPet?.student_id, petStages, userPet?.pet_line, userPet?.current_stage_index]);

  // 🥚 偵測「神獸型態前進」→ 自動跳破蛋進化特效。
  // 型態是依等級自動晉級(getActiveStage),所以升級跨過階段門檻時這裡會觸發,確保每次型態提升都有破蛋彈窗。
  // 首次載入靜默記基準(不溯過往,不洗版);之後型態一升階就跳。
  React.useEffect(() => {
    if (!userPet || !userPet.pet_line) return;
    const stage = getActiveStage(userPet, petStages);
    const idx = stage?.stage_index || 1;
    const key = `nlp_last_seen_stage_${userPet.student_id}`;
    const storedStr = localStorage.getItem(key);
    if (storedStr !== null) {
      const prev = parseInt(storedStr, 10);
      if (idx > prev && !isCohortEnded) {
        const fromStage = petStages.find((s: any) => s.line_key === userPet.pet_line && s.stage_index === prev);
        const lineDetail = petLines.find((l: any) => l.line_key === userPet.pet_line);
        setShowLevelUpModal(null); // 型態提升優先,關掉升級彈窗避免疊一起
        setShowSuccessModal({
          isSubsequent: true,
          fromName: fromStage?.stage_name || '原本型態',
          fromImage: fromStage?.image_url || null,   // 突破動畫用「原本神獸」變大,不是蛋
          toName: stage?.stage_name || '全新型態',
          beastName: stage?.stage_name || '守護神獸',
          lineName: lineDetail?.name || '專屬系',
          traits: lineDetail?.core_traits || stage?.evolution_text || '未設定',
          desc: stage?.description || '解鎖專屬的守護神獸，陪伴你的 NLP 修行。',
          image: stage?.image_url || 'https://images.unsplash.com/photo-1516233758813-a38d024919c5?auto=format&fit=crop&q=80&w=300',
          glowColor: stage?.glow_color || '#A855F7'
        });
      }
    }
    localStorage.setItem(key, String(idx));
  }, [userPet?.level, userPet?.pet_line, userPet?.student_id, petStages]);

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
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setCompressing(true);
    try {
      // proofImg 以 '|' 串接最多 3 張(與見證牆/自由分享同格式);可分次累加
      const existing = proofImg ? proofImg.split('|').filter(Boolean) : [];
      const room = 3 - existing.length;
      if (room > 0) {
        const compressed = await Promise.all(files.slice(0, room).map(f => compressImage(f)));
        setProofImg([...existing, ...compressed].slice(0, 3).join('|'));
      }
    } catch (err) {
      console.error('圖片壓縮失敗:', err);
    } finally {
      setCompressing(false);
      e.target.value = ''; // 清空 input,讓同一張可再次被選
    }
  };



  // Evolution dialog and overlay states
  const [isEvolvingLocal, setIsEvolvingLocal] = useState(false);
  const [showConfirmEvolve, setShowConfirmEvolve] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState<any | null>(null);
  const [showLevelUpModal, setShowLevelUpModal] = useState<any | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<any | null>(null);
  // 點擊「已達成」的連勝禮物時播放的慶祝特效(純視覺,不重複發分——分數已於達成時自動發放)
  const [celebrateNode, setCelebrateNode] = useState<{ d: number; bonus: number } | null>(null);

  // 通知父層:升級/進化彈窗是否正在顯示 → 成就彈窗要等這些關掉後才跳(一次只跳一個、不重疊)
  React.useEffect(() => {
    onModalActiveChange?.(!!showLevelUpModal || !!showSuccessModal || !!selectedMilestone);
    return () => { onModalActiveChange?.(false); };  // 離開此分頁時清除,避免成就彈窗被永久卡住
  }, [showLevelUpModal, showSuccessModal, selectedMilestone, onModalActiveChange]);
  const [selectedTempLine, setSelectedTempLine] = useState<string | null>(null);
  const [showStrategy, setShowStrategy] = useState(false);

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

  // 執行進化（單一入口）：自動判斷「蛋→第一形態」或「後續階段突破」，
  // 一手包辦：關升級彈窗 → 播進化特效 → 寫入 DB → 跳進化成功彈窗。每次進化都會走這裡。
  const runEvolution = (targetLineKey: string) => {
    if (isCohortEnded) { alert('已結束期數僅可查看，不可再互動或培養。'); return; }
    setShowConfirmEvolve(false);
    setSelectedTempLine(null);
    setShowLevelUpModal(null); // 串接:先關升級彈窗,讓進化特效/彈窗接手
    setIsEvolvingLocal(true);
    // 目標階段:第一次進化(蛋)→ 第 2 階;後續進化 → 目前階段 + 1
    const isFirst = !userPet || userPet.current_stage_index <= 1;
    const fromStageIdx = isFirst ? 1 : userPet.current_stage_index;
    const toStageIdx = isFirst ? 2 : userPet.current_stage_index + 1;
    setTimeout(async () => {
      try {
        await onEvolvePet(profile.id, targetLineKey);
        // 第一次進化的「原本型態」是蛋(line_key 為 null);後續是該系上一階
        const fromStage = isFirst
          ? petStages.find((s: any) => !s.line_key && (s.stage_index === 1 || s.stage_index === 0))
          : petStages.find((s: any) => s.line_key === targetLineKey && s.stage_index === fromStageIdx);
        const toStage = petStages.find(s => s.line_key === targetLineKey && s.stage_index === toStageIdx);
        const lineDetail = petLines.find(l => l.line_key === targetLineKey);
        setShowSuccessModal({
          isSubsequent: !isFirst,
          fromName: fromStage?.stage_name || '原本型態',
          fromImage: fromStage?.image_url || null,
          toName: toStage?.stage_name || '全新形態',
          beastName: toStage?.stage_name || '守護神獸',
          lineName: lineDetail?.name || '專屬系',
          traits: lineDetail?.core_traits || toStage?.evolution_text || '未設定',
          desc: toStage?.description || '解鎖專屬的守護神獸，陪伴您的 NLP 修行。',
          image: toStage?.image_url || 'https://images.unsplash.com/photo-1516233758813-a38d024919c5?auto=format&fit=crop&q=80&w=300',
          glowColor: toStage?.glow_color || '#A855F7'
        });
      } catch (e) {
        console.error(e);
      } finally {
        setIsEvolvingLocal(false);
        setSelectedTempLine(null);
      }
    }, 800);
  };

  // 從升級彈窗點「立即進化」→ 串接到 runEvolution(特效→進化彈窗)。
  const handleEvolveNow = () => {
    if (isCohortEnded) { alert('已結束期數僅可查看，不可再互動或培養。'); return; }
    const isFirst = !userPet || userPet.current_stage_index <= 1;
    if (isFirst) {
      if (approvedEvoLine) {
        runEvolution(approvedEvoLine); // 蛋且考驗已通過 → 直接破殼
      } else {
        // 蛋尚未選方向 → 關升級彈窗,開啟進化方向選擇流程
        setShowLevelUpModal(null);
        setShowConfirmEvolve(true);
      }
    } else if (userPet?.pet_line) {
      runEvolution(userPet.pet_line); // 後續階段突破
    }
  };

  // 升級彈窗「繼續」:一次升一級,逐級確認;到最終等級才結束(或進化)。
  const handleLevelUpContinue = () => {
    const m = showLevelUpModal;
    if (!m) return;
    const final = m.finalLevel ?? m.newLevel;
    if (m.newLevel < final) {
      setShowLevelUpModal({ ...m, oldLevel: m.newLevel, newLevel: m.newLevel + 1 });
    } else {
      setShowLevelUpModal(null);
    }
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

  const stageName = activeStage?.stage_name || '混沌的蛋';
  const stageDesc = activeStage?.description || '蘊含著無限可能的混沌的蛋，靜靜等待能量積累以尋找其未來的進化方向。';
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
  // 每日任務以「中午12點」為換日界線:午前(<12)算前一天、午後(>=12)算當天。
  // 顯示哪一天的每日任務、以及連勝/斷連的「今天」都用這個界線。
  const dailyAnchor = (() => {
    const d = new Date(now);
    if (now.getHours() < 12) d.setDate(d.getDate() - 1);
    return d;
  })();
  const isUsingMissions = profile.role !== 'admin' && !!profile.batch_id;

  // 🔥 連續修行天數：該學員「每日定課」連續有打卡(approved/pending)的台灣日期天數。
  // 今天還沒打卡不算斷(從昨天起算)；斷一整天才歸零。純由現有資料計算，不動 DB。
  const { dailyStreak, checkedInToday } = (() => {
    const dailyIds = new Set(missions.filter((m: any) => m.mission_type === 'daily').map((m: any) => m.id));
    if (dailyIds.size === 0) return { dailyStreak: 0, checkedInToday: false };
    const dateOfMission = new Map(missions.map((m: any) => [m.id, m.publish_at]));
    const dayKey = (dt: Date) => `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
    const done = new Set<string>();
    for (const s of submissions) {
      if (s.student_id !== activeProfile.id || s.status === 'rejected') continue;
      if (!dailyIds.has(s.mission_id)) continue;
      const pub = dateOfMission.get(s.mission_id);
      if (!pub) continue;
      done.add(dayKey(parseLocalTime(pub)));
    }
    // 🛡️ 護盾補上的日子也算「有打卡」→ 連勝不因漏一天而斷
    shieldDayKeys.forEach(k => done.add(k));
    // 「今天」以中午換日界線為準(午前算前一天),與每日任務顯示一致
    const todayKey = dayKey(new Date(dailyAnchor.getFullYear(), dailyAnchor.getMonth(), dailyAnchor.getDate()));
    const isTodayDone = done.has(todayKey);
    const cursor = new Date(dailyAnchor.getFullYear(), dailyAnchor.getMonth(), dailyAnchor.getDate());
    if (!isTodayDone) cursor.setDate(cursor.getDate() - 1); // 今天還沒打 → 從昨天起算
    let streak = 0;
    while (done.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
    return { dailyStreak: streak, checkedInToday: isTodayDone };
  })();

  // 連勝里程碑：徽章門檻 3/7/14/21/30 天；皆有加分(與後台 claim_streak_bonus 一致)
  const STREAK_MILESTONES = [3, 7, 14, 21, 30];
  const STREAK_BONUS: Record<number, number> = { 3: 100, 7: 200, 14: 500, 21: 800, 30: 1000 };
  const nextStreakMilestone = STREAK_MILESTONES.find(d => d > dailyStreak) ?? null;

  const getTaskProgress = (taskId: string) => {
    let limit = 1;
    // 期數任務(missions)與單次任務(tasks)現在並存,兩邊都可能傳進來 →
    // 兩個來源都查,以實際找到的那個的 max_completions 為準(不再只看 isUsingMissions 分支)。
    const m = missions?.find(x => x.id === taskId);
    const t = tasks.find(x => x.id === taskId);
    if (m) limit = m.max_completions ?? 1;
    else if (t) limit = t.max_completions ?? 1;

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
    // 單次任務的期數範圍:指定期數的只給該期學員;沒指定期數(全體/大會任務)給所有人。
    // (避免某一期的單次任務外洩到別期看到。)
    if (t.batch_id && profile.batch_id && t.batch_id !== profile.batch_id) return false;
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
        //    每日任務改由「中午換日界線(dailyAnchor)」決定可見範圍,不受 deadline 過期影響。
        if (m.mission_type !== 'daily' && now.getTime() > deadlineTime.getTime() && !isCompleted) return false;

        // 5. 每日任務:以中午12點為界 —— 只顯示 publish_at 屬於「目前換日週期」那天的每日任務
        //    (午前算前一天、午後算當天)
        if (m.mission_type === 'daily') {
          if (!isTodayLocal(publishTime, dailyAnchor)) return false;
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
    // 期數任務(missions)與單次任務(tasks)現在並存,小紅點要兩邊都看。
    const mType: Record<string, string> = { daily: 'daily', weekly: 'weekly', special: 'special', temporary: 'limited' };
    const tType: Record<string, string> = { daily: 'daily', weekly: 'weekly', special: 'temporary', temporary: 'limited' };
    const missionUndone = isUsingMissions &&
      displayMissions.some(m => m.mission_type === mType[catKey] && !getTaskProgress(m.id).isDone);
    const taskUndone = tasks.some((t: Task) =>
      !isEvolutionTask(t) &&
      (!t.batch_id || !profile.batch_id || t.batch_id === profile.batch_id) &&
      t.type === tType[catKey] && !getTaskProgress(t.id).isDone);
    return missionUndone || taskUndone;
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
      return <span className="text-[11px] font-black tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg">每日任務</span>;
    }
    if (task.type === 'weekly') {
      return <span className="text-[11px] font-black tracking-widest text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg">每週任務</span>;
    }
    if (task.type === 'limited' || task.name.includes('限時') || task.name.includes('最後一週')) {
      return <span className="text-[11px] font-black tracking-widest text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg">限時挑戰</span>;
    }
    return <span className="text-[11px] font-black tracking-widest text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-lg">特殊加碼</span>;
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
          
          <div className="text-[11px] text-slate-400 font-bold light:text-slate-600 flex items-center gap-1.5 flex-wrap">
            修行期數：
            {userEnrollments.length > 1 && onSwitchCohort ? (
              <select
                value={profile.batch_id || ''}
                onChange={(e) => onSwitchCohort(e.target.value)}
                className="bg-slate-900 border border-amber-500/30 text-amber-500 text-[11px] font-black rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer light:bg-white light:border-amber-400"
              >
                {userEnrollments.map((enroll) => {
                  const batch = batches.find(b => b.id === enroll.batch_id);
                  const batchName = batch ? batch.name : `期數: ${enroll.batch_id || '未設定'}`;
                  const statusText = enroll.status === 'ended' ? ' (已結束)' : enroll.status === 'inactive' ? ' (已停用)' : '';
                  return (
                    <option key={enroll.id} value={enroll.batch_id || ''}>
                      {batchName}{statusText}
                    </option>
                  );
                })}
              </select>
            ) : (
              <span className="text-amber-500">{activeBatch ? activeBatch.name : '未指派'}</span>
            )}
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
                      // 固定 285×285 的框（不是上限）：元素尺寸恆定，圖片無論何時載入都不會改變元素大小，
                      // 避免「載入後元素變大→transform 過渡把圖推到一邊」的位移問題。圖片用 object-fit 置中塞入。
                      width: '285px',
                      height: '285px',
                      objectFit: 'contain',
                      // 行內保險：置中定位也寫死，避免初次進面板 .pet-image CSS 尚未套用時圖跑到右下角。
                      // 動畫執行時會以自身 keyframes(含 translate(-50%,-50%)) 接手，不衝突。
                      position: 'absolute',
                      left: 'calc(50% + var(--pet-x, 0px))',
                      top: 'calc(50% + var(--pet-y, 0px))',
                      transform: 'translate(-50%, -50%) scale(var(--pet-scale))',
                    } as React.CSSProperties}
                  />
                </>
              ) : (
                // 載入中或尚無神獸：顯示蛋佔位（用 flex 置中，不用絕對定位避免偏移）
                <div className="flex items-center justify-center select-none z-[2]" style={{ fontSize: '110px', filter: `drop-shadow(0 0 20px ${glowColor})` }}>
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
            {dailyStreak > 0 && (
              <span className="text-[10px] font-black tracking-wider text-orange-400 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 px-3 py-1 rounded-full mt-2 inline-flex items-center gap-1.5 shadow-[0_0_12px_rgba(249,115,22,0.15)] light:bg-orange-50 light:text-orange-700 light:border-orange-300 light:shadow-none">
                <span className="animate-bounce">🔥</span> 連續修行 <span className="text-white font-extrabold text-xs light:text-orange-900">{dailyStreak}</span> 天
              </span>
            )}
            {/* 🎮 連勝修行航線 (Streak Road Map) */}
            <div className="w-full max-w-[280px] mt-3.5 mb-2 px-2.5 py-3 bg-slate-950/40 border border-white/5 rounded-2xl light:bg-slate-50 light:border-slate-200 select-none">
              <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold mb-3.5 light:text-slate-500">
                <span>🏆 連勝里程碑</span>
                <span className="text-amber-400 font-black light:text-amber-700">當前連勝: {dailyStreak} 天</span>
              </div>
              
              {/* Progress Line Container */}
              <div className="relative flex items-center justify-between w-full px-1">
                {/* Background Line */}
                <div className="absolute left-2 right-2 h-1 bg-slate-800 light:bg-slate-200 rounded-full top-1/2 -translate-y-1/2 z-0" />
                
                {/* Active Glowing Line */}
                <div 
                  className="absolute left-2 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 rounded-full top-1/2 -translate-y-1/2 z-0 shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-all duration-700" 
                  style={{ 
                    width: `${(() => {
                      if (dailyStreak <= 0) return 0;
                      if (dailyStreak >= 30) return 96; // max out
                      const nodes = [0, 3, 7, 14, 21, 30];
                      const percentages = [0, 20, 40, 60, 80, 96]; // alignment with node positions
                      // find interval
                      for (let i = 0; i < nodes.length - 1; i++) {
                        if (dailyStreak >= nodes[i] && dailyStreak <= nodes[i+1]) {
                          const range = nodes[i+1] - nodes[i];
                          const progress = dailyStreak - nodes[i];
                          const pctRange = percentages[i+1] - percentages[i];
                          return percentages[i] + (progress / range) * pctRange;
                        }
                      }
                      return 0;
                    })()}%`
                  }}
                />

                {/* Milestone Nodes */}
                {[
                  { d: 0, bonus: 0, title: '🌱 修行起步', icon: '🌱', desc: '踏上定課修行的旅程，持之以恆以獲得更多獎勵！' },
                  { d: 3, bonus: 100, title: '🥉 初露鋒芒', icon: '🎁', desc: '連續定課修行 3 天，踏出穩健修行的第一步。' },
                  { d: 7, bonus: 200, title: '🥈 漸入佳境', icon: '🎁', desc: '連續定課修行 7 天，養成自律修行的優良習慣。' },
                  { d: 14, bonus: 500, title: '🥇 勢不可擋', icon: '🎁', desc: '連續定課修行 14 天，半月堅持，修行已成日常節奏。' },
                  { d: 21, bonus: 800, title: '🏆 爐火純青', icon: '🎁', desc: '連續定課修行 21 天，將修行完美融入靈魂生命。' },
                  { d: 30, bonus: 1000, title: '👑 登峰造極', icon: '🔥', desc: '連續定課修行 30 天，整月不間斷，自律已內化為本能。' }
                ].map((node) => {
                  const isUnlocked = dailyStreak >= node.d;
                  const isImmediateTarget = !isUnlocked && nextStreakMilestone === node.d;

                  return (
                    <div key={node.d} className="relative z-10 flex flex-col items-center group">
                      {/* Node Circle */}
                      <div
                        onClick={() => {
                          if (isUnlocked && node.bonus > 0) {
                            // 已達成的禮物 → 播放慶祝特效 +「+X EXP」動畫(純視覺)
                            setCelebrateNode({ d: node.d, bonus: node.bonus });
                            setTimeout(() => setCelebrateNode(null), 1800);
                          } else {
                            setSelectedMilestone(node);
                          }
                        }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border transition-all duration-300 relative cursor-pointer hover:scale-110 active:scale-95 ${
                          isUnlocked 
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                            : isImmediateTarget
                              ? 'bg-slate-900 border-amber-400 text-amber-300 animate-pulse scale-110 shadow-[0_0_10px_rgba(245,158,11,0.25)] light:bg-white light:border-amber-350'
                              : 'bg-slate-950 border-slate-800 text-slate-500 light:bg-white light:border-slate-300'
                        }`}
                        title={`${node.title} (${node.d}天)${node.bonus ? ` +${node.bonus} EXP` : ''}`}
                      >
                        {node.d === 0 ? (dailyStreak > 0 ? '✓' : '🌱') : (isUnlocked ? '✓' : node.icon)}
                        {/* 懸停資訊改用節點的 title 屬性,避免自繪泡泡在最右節點溢出視窗、害手機可左右滑 */}
                      </div>
                      
                      {/* Day Label below node */}
                      <span className={`text-[8px] font-extrabold mt-1.5 ${
                        isUnlocked 
                          ? 'text-amber-400 light:text-amber-600' 
                          : isImmediateTarget
                            ? 'text-amber-300 font-black animate-pulse light:text-amber-700'
                            : 'text-slate-600 light:text-slate-400'
                      }`}>
                        {node.d}天
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Progress description label */}
              {!isCohortEnded && nextStreakMilestone && (
                <div className="text-center text-[10px] font-bold mt-3.5 text-slate-350 light:text-slate-600 border-t border-white/5 pt-2.5 light:border-slate-200/60 select-none">
                  {dailyStreak === 0 ? (
                    <span className="text-amber-400 light:text-amber-700 animate-pulse flex items-center justify-center gap-1.5">
                      🌱 點擊下方任務卡片進行簽到，展開你的第一步！
                    </span>
                  ) : (
                    <>
                      🔥 再堅持 <span className="text-white font-black text-xs light:text-orange-900">{nextStreakMilestone - dailyStreak}</span> 天，即可達成
                      <span className="text-amber-400 light:text-amber-700 font-extrabold mx-1">「連勝 {nextStreakMilestone} 天」</span>
                      {STREAK_BONUS[nextStreakMilestone] ? `並獲得 +${STREAK_BONUS[nextStreakMilestone]} EXP 🎁` : ' 🏅'}！
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 🛡️ 連勝護盾:小標籤,點擊才彈出說明(與里程碑同一套互動) */}
            {typeof activeProfile.streak_shields === 'number' && (
              <button
                type="button"
                onClick={() => setShowShieldInfo(true)}
                className="text-[10px] font-black tracking-wider text-sky-300 bg-sky-500/10 border border-sky-500/30 px-3 py-1 rounded-full mt-2 inline-flex items-center gap-1.5 hover:bg-sky-500/20 active:scale-95 transition-all cursor-pointer light:bg-sky-50 light:text-sky-700 light:border-sky-300"
              >
                🛡️ 連勝護盾 <span className="text-white font-extrabold text-xs light:text-sky-900">{activeProfile.streak_shields}</span>/3 張
                <span className="text-sky-300/60 light:text-sky-500">ⓘ</span>
              </button>
            )}

            {/* ⚠️ 斷連提醒：連勝中且今天還沒定課 → 醒目提示快打卡 */}
            {!isCohortEnded && dailyStreak >= 1 && !checkedInToday && (
              <span className="text-[10px] font-black text-red-300 bg-red-500/15 border border-red-500/40 px-3 py-1 rounded-full mt-1.5 inline-flex items-center gap-1 animate-pulse light:text-red-600 light:bg-red-50 light:border-red-200">
                ⚠️ 連勝 {dailyStreak} 天！今天還沒定課，快打卡守住連勝
              </span>
            )}

            <p className="text-xs text-slate-400 mt-2 leading-relaxed light:text-slate-500 max-w-xs text-center">
              {((userPet?.has_pending_evolution) || (userLevel >= 5 && (!userPet || userPet.current_stage_index <= 1))) && (!userPet || userPet.current_stage_index <= 1) ? (
                <span className="text-amber-400 font-bold block animate-pulse">
                  {approvedEvoLine
                    ? '考驗任務已通過！點擊下方按鈕即可直接破殼進化。'
                    : '你的混沌的蛋已經覺醒！完成對應的神秘考驗任務，即可解鎖該方向並破殼進化。'}
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
            {(() => {
              const { currentLevelExp, nextLevelExp, percentage } = getExpProgressInCurrentLevel(totalExp);
              return (
                <>
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-400">
                      {userPet && userPet.current_stage_index > 1 ? (
                        <span>成長等級：<span className="text-indigo-400">LV.{userLevel}</span></span>
                      ) : (
                        '🔥 升級進度 (Next Level)'
                      )}
                    </span>
                    <span className="text-amber-500">{currentLevelExp.toLocaleString()} / {nextLevelExp.toLocaleString()} EXP</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-white/5 light:bg-slate-100 light:border-slate-300">
                    <div 
                      className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  {userPet && userPet.current_stage_index > 1 && (
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-bold">
                      <span>經驗：{totalExp.toLocaleString()} EXP</span>
                      <span>距離下一級：{(nextLevelExp - currentLevelExp).toLocaleString()} EXP</span>
                    </div>
                  )}
                </>
              );
            })()}

            {/* 🔮 大進化進度與遊戲化激勵指引 */}
            {(() => {
              const currentStageIdx = activeStage?.stage_index || 1;
              const isUltimate = currentStageIdx >= 6;
              
              const nextStageIndex = currentStageIdx + 1;
              const nextStage = petStages.find(
                s => (currentStageIdx === 1 ? s.stage_index === 2 : s.line_key === userPet?.pet_line && s.stage_index === nextStageIndex)
              );
              
              const requiredTotalExp = nextStage ? getExpThresholdForLevel(nextStage.min_level) : 0;
              const expNeeded = Math.max(0, requiredTotalExp - totalExp);
              const progressPercent = requiredTotalExp > 0 ? Math.min(100, (totalExp / requiredTotalExp) * 100) : 0;
              
              // 估計天數：
              const earnestDays = Math.ceil(expNeeded / 300);
              const proactiveDays = Math.ceil(expNeeded / 700);
              const isEgg = currentStageIdx === 1;
              
              return (
                <div className="mt-4 p-3.5 rounded-2xl border border-pink-500/20 bg-pink-500/5 space-y-3 select-none light:bg-pink-500/10">
                  {isUltimate && (
                    <div className="p-1 text-center">
                      <span className="text-xs font-black text-amber-500 flex items-center justify-center gap-1">
                        👑 神獸已達終極形態【{stageName}】！
                      </span>
                    </div>
                  )}

                  {!isUltimate && nextStage && (
                    <>
                      <div className="flex flex-col gap-1 text-[11px] font-bold">
                        <span className="text-pink-400 flex items-center gap-1.5 light:text-pink-600">
                          <Sparkles size={12} className="animate-pulse" />
                          {isEgg ? "🥚 距離破殼誕生" : `🔮 距離進化為【${nextStage.stage_name}】`}
                        </span>
                        <span className="text-pink-400 text-sm font-black light:text-pink-600">
                          {totalExp.toLocaleString()} / {requiredTotalExp.toLocaleString()} EXP
                        </span>
                      </div>
                      
                      {/* 進度條 */}
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-pink-500/10 light:bg-slate-200">
                        <div 
                          className="bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(236,72,153,0.3)] animate-pulse"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      
                      {/* 遊戲化文字激勵指引 */}
                      <div className="text-[10px] text-slate-400 leading-relaxed font-semibold light:text-slate-600">
                        {isEgg ? (
                          <>
                            🐣 還差 <span className="text-pink-400 font-extrabold light:text-pink-600">{expNeeded.toLocaleString()} EXP</span>。
                            積極挑戰最快只要 <span className="text-amber-500 font-extrabold">{proactiveDays} 天</span> 即可破殼誕生！認真修行也僅需 <span className="text-indigo-400 font-extrabold">{earnestDays} 天</span>。
                          </>
                        ) : (
                          <>
                            🔥 還差 <span className="text-pink-400 font-extrabold light:text-pink-600">{expNeeded.toLocaleString()} EXP</span>。
                            積極挑戰最快只要 <span className="text-amber-500 font-extrabold">{proactiveDays} 天</span> 即可突破！認真修行則需 <span className="text-indigo-400 font-extrabold">{earnestDays} 天</span>。
                          </>
                        )}
                      </div>
                    </>
                  )}

                  {!isUltimate && !nextStage && (
                    <div className="text-[10px] text-slate-400 leading-relaxed font-semibold light:text-slate-600 text-center">
                      ✨ 累積經驗值，升級並培育你的修行神獸！
                    </div>
                  )}

                  {/* 展開攻略按鈕 */}
                  <div className="pt-1.5 flex justify-start select-none">
                    <button
                      type="button"
                      onClick={() => setShowStrategy(!showStrategy)}
                      className={`
                        px-3.5 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-all duration-300
                        flex items-center gap-1.5 cursor-pointer border active:scale-95
                        ${showStrategy 
                          ? 'bg-pink-500/20 border-pink-500/40 text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.15)] light:bg-pink-100 light:text-pink-700 light:border-pink-300' 
                          : 'bg-white/[0.03] border-white/10 hover:border-pink-500/40 text-slate-300 hover:text-pink-400 hover:shadow-[0_0_12px_rgba(236,72,153,0.1)] light:bg-slate-100 light:border-slate-300 light:text-slate-700 light:hover:text-pink-600 light:hover:border-pink-300'
                        }
                      `}
                    >
                      <Sparkles size={11} className={showStrategy ? "animate-pulse text-pink-400" : "text-slate-400"} />
                      <span>{showStrategy ? "收起修行加速攻略" : "查看修行加速攻略 (天數折抵)"}</span>
                      {showStrategy ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                  </div>

                  {/* 攻略內容 */}
                  {showStrategy && (() => {
                    const allGuides = getAllGuides();
                    const matchedGuide = allGuides.find(g => {
                      if (!activeBatch?.name) return false;
                      const cleanName = g.name.replace(/^[^\w\s\u4e00-\u9fa5]+/, '').trim();
                      return activeBatch.name.toLowerCase().includes(cleanName.toLowerCase()) || activeBatch.name.toLowerCase().includes(g.key.toLowerCase());
                    }) || (isUserAdvanced ? allGuides.find(g => g.key === 'advanced') : allGuides.find(g => g.key === 'beginner')) || allGuides[0];
                    
                    const config = matchedGuide.config;
                    const guideName = matchedGuide.name;
                    
                    // Smart string formatter for bullets
                    const renderBulletText = (bullet: string) => {
                      const parts = bullet.split('：');
                      if (parts.length > 1) {
                        const rightParts = parts[1].split('➔');
                        if (rightParts.length > 1) {
                          return (
                            <>
                              <span className="text-slate-300 light:text-slate-700 font-bold">{parts[0]}</span>
                              {'：'}
                              {rightParts[0]}
                              {'➔ '}
                              <span className="text-amber-500 font-bold">{rightParts[1]}</span>
                            </>
                          );
                        }
                        return (
                          <>
                            <span className="text-slate-300 light:text-slate-700 font-bold">{parts[0]}</span>
                            {'：'}
                            {parts[1]}
                          </>
                        );
                      }
                      return bullet;
                    };

                    return (
                      <div className="mt-2 text-[10px] space-y-3 p-3 rounded-xl border border-white/5 bg-slate-950/80 animate-in slide-in-from-top-2 duration-300 light:bg-white/80 light:border-slate-200">
                        {/* 攻略標題 */}
                        <div className="text-center font-bold text-slate-400 pb-1.5 border-b border-white/5 light:border-slate-200 select-none">
                          {guideName}攻略
                        </div>

                        {/* 認真修行版 */}
                        <div className="space-y-1">
                          <div className="font-extrabold text-indigo-400 flex items-center gap-1 light:text-indigo-600">
                            <span>⏱️ 認真修行版 (均速 {config.seriousSpeed})</span>
                          </div>
                          <ul className="list-disc pl-4 text-slate-400 space-y-0.5 font-medium light:text-slate-500">
                            {config.seriousBullets.map((bullet, i) => (
                              <li key={i}>{renderBulletText(bullet)}</li>
                            ))}
                          </ul>
                        </div>
                        
                        {/* 積極挑戰版 */}
                        <div className="space-y-1 border-t border-white/5 pt-2.5 light:border-slate-150">
                          <div className="font-extrabold text-amber-400 flex items-center gap-1 light:text-amber-600">
                            <span>⚡ 積極挑戰版 (均速 {config.activeSpeed})</span>
                          </div>
                          <ul className="list-disc pl-4 text-slate-400 space-y-0.5 font-medium light:text-slate-500">
                            {config.activeBullets.map((bullet, i) => (
                              <li key={i}>{renderBulletText(bullet)}</li>
                            ))}
                          </ul>
                        </div>

                        {/* ✨ 攻略秘笈：天數直接折抵 */}
                        <div className="space-y-1 border-t border-white/5 pt-2.5 light:border-slate-150">
                          <div className="font-extrabold text-pink-400 flex items-center gap-1 light:text-pink-600">
                            <span>✨ 攻略秘笈：高分任務「天數直接折抵」</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-slate-400 font-medium light:text-slate-600">
                            {config.offsets.map((offset) => (
                              <div
                                key={offset.id}
                                className={`p-1.5 rounded bg-white/[0.02] border border-white/5 light:bg-slate-100/50 light:border-slate-200 ${
                                  offset.highlight ? 'col-span-2' : ''
                                }`}
                              >
                                <span className="text-slate-300 block font-bold light:text-slate-800">
                                  {offset.title} (+{offset.points} EXP)
                                </span>
                                時間立減 <span className="text-emerald-400 font-black light:text-emerald-600">{offset.days} 天</span>！
                                {offset.desc && <span className="text-[9px] text-slate-500 block mt-0.5">{offset.desc}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              );
            })()}
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
      <section className="space-y-6">
        
        {/* Notice Board Header Plaque */}
        <div className="relative glass-panel p-5 rounded-3xl border border-white/10 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-950 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center overflow-hidden w-full select-none light:bg-white light:border-slate-200">
          {/* Decorative metallic rivets representing bulletin board pins */}
          <div className="absolute top-3.5 left-4 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-[0_1px_3px_rgba(0,0,0,0.5)] border border-amber-300/30" />
          <div className="absolute top-3.5 right-4 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-[0_1px_3px_rgba(0,0,0,0.5)] border border-amber-300/30" />
          
          {/* Subtle gold reflection bar */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
          
          {/* Board Content */}
          <div ref={missionBoardRef} className="flex flex-col items-center gap-1.5 py-1 scroll-mt-4">
            {/* Small fantasy sub-badge */}
            <span className="text-[9px] font-black tracking-[0.25em] text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full uppercase">
              Mission Board
            </span>
            
            {/* Main Title */}
            <h2 className="text-lg sm:text-xl font-black tracking-[0.2em] bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(245,158,11,0.2)] flex items-center gap-2 mt-0.5 light:from-amber-600 light:to-orange-700">
              接取任務中心
            </h2>
          </div>
        </div>

        {/* Category Switch Tabs */}
        <div className="flex justify-center select-none">
          <div className="flex bg-slate-900/65 p-1 rounded-2xl border border-white/5 w-full sm:w-auto overflow-x-auto scrollbar-none gap-1 light:bg-slate-100 light:border-slate-300/50">
            {[
              { key: 'daily', label: '每日任務', icon: Flame },
              { key: 'weekly', label: '每週任務', icon: Sparkles },
              { key: 'special', label: '特殊任務', icon: Star },
              { key: 'temporary', label: '限時挑戰', icon: Timer },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key as typeof activeCategory)}
                className={`relative flex-1 sm:flex-initial flex flex-row items-center justify-center gap-1.5 px-2 sm:px-4 py-2.5 rounded-xl text-sm sm:text-xs font-black transition-colors duration-200 select-none whitespace-nowrap cursor-pointer ${
                  activeCategory === key
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40 light:hover:bg-slate-200/50'
                }`}
              >
                {categoryHasUndone(key) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border border-slate-900 animate-pulse" />
                )}
                <Icon size={14} className="shrink-0" />
                <span className="leading-none">
                  <span className="hidden sm:inline">{label}</span>
                  <span className="inline sm:hidden">{label.substring(0, 2)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>


        {/* Task/Mission Grid
            期數任務(missions)與「任務管理」單次任務(tasks)『並存顯示』:
            missions 由期數產生;tasks 是臨時/單次發放(已依 batch 過濾,只給本期+全體)。
            以前是「有 missions 就不顯示 tasks」,導致單次任務被擋住看不到 → 改成兩者一起列。 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isUsingMissions && filteredMissions.map((mission) => {
                  const nowTime = nowTaipei().getTime();
                  const pubTime = parseLocalTime(mission.publish_at).getTime();
                  const deadTime = parseLocalTime(mission.deadline_at).getTime();
                  const { isDone, approvedCount, limit } = getTaskProgress(mission.id);
                  const status = getTaskStatus(mission.id);

                  // 每日任務不看 deadline 過期(其有效範圍由「中午換日界線」決定),永不顯示逾期/已截止。
                  const isExpired = mission.mission_type !== 'daily' && nowTime > deadTime;
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
                          <span className="text-[11px] font-black tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                            {mission.mission_type === 'daily'
                              ? '每日任務'
                              : mission.mission_type === 'weekly'
                              ? '每週任務'
                              : mission.mission_type === 'limited'
                              ? '限時挑戰'
                              : '特殊加碼'}
                          </span>
                          <span className="text-[11px] font-black tracking-wide px-2.5 py-1 rounded-lg border text-amber-400 bg-amber-500/15 border-amber-500/30">
                            +{mission.points} 經驗
                          </span>
                          {(() => {
                            if (limit === 0) {
                              return (
                                <span className="text-[11px] font-black tracking-widest px-2 py-0.5 rounded-lg border text-blue-400 bg-blue-500/10 border-blue-500/20">
                                  已完成 {approvedCount} 次 / 無限制
                                </span>
                              );
                            } else if (limit > 1) {
                              return (
                                <span className="text-[11px] font-black tracking-widest px-2 py-0.5 rounded-lg border text-purple-400 bg-purple-500/10 border-purple-500/20">
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
                        {mission.mission_type !== 'daily' && !isExpired && !isFuture && (() => {
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
                })}
              {sortedTasks.map((task) => {
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
                          <span className={`text-[11px] font-black tracking-wide px-2.5 py-1 rounded-lg border ${
                            isDone
                              ? 'text-slate-500 bg-slate-800/60 border-white/5 light:bg-slate-200 light:text-slate-500'
                              : 'text-amber-400 bg-amber-500/15 border-amber-500/30'
                          }`}>
                            +{task.score} 經驗
                          </span>
                          {(task.reward_shields ?? 0) > 0 && (
                            <span className="text-[11px] font-black tracking-widest px-2 py-0.5 rounded-lg border text-sky-300 bg-sky-500/15 border-sky-500/30 light:text-sky-700 light:bg-sky-50 light:border-sky-300">
                              🛡️ 護盾 x{task.reward_shields}
                            </span>
                          )}
                          {(() => {
                            if (limit === 0) {
                              return (
                                <span className="text-[11px] font-black tracking-widest px-2 py-0.5 rounded-lg border text-blue-400 bg-blue-500/10 border-blue-500/20">
                                  已完成 {approvedCount} 次 / 無限制
                                </span>
                              );
                            } else if (limit > 1) {
                              return (
                                <span className="text-[11px] font-black tracking-widest px-2 py-0.5 rounded-lg border text-purple-400 bg-purple-500/10 border-purple-500/20">
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
                              <span className={`text-[11px] font-black tracking-wide px-2.5 py-1 rounded-lg flex items-center gap-1 border ${
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
                              <span className="text-[11px] font-black tracking-wide px-2.5 py-1 rounded-lg flex items-center gap-1 border text-sky-400 bg-sky-500/10 border-sky-500/20">
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
                              href={safeLinkHref(sub.proof_link)}
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

      {/* 🔮 初階專屬人物面板：以終為始每日抽卡 */}
      {!isUserAdvanced && (
        <section className="glass-panel p-6 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/60 to-slate-950/60 light:bg-none light:bg-white light:border-slate-200 flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden select-none">
          {/* Subtle gold reflection bar */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
          
          {/* Left / Info Area */}
          <div className="flex-1 space-y-3 text-center md:text-left">
            <h2 className="text-xl font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 bg-clip-text text-transparent light:from-amber-600 light:to-orange-700">
              以終為始
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed font-bold max-w-md light:text-slate-600">
              每天可抽取一張「以終為始」修行卡。
              <br />
              <span className="text-amber-400 light:text-amber-700">今日挑戰：</span>
              在日常對話中引導他人主動說出卡片上的雙字詞彙，完成無形中的溝通引導修煉！
            </p>
          </div>

          {/* Right / 3D Card Area */}
          <div className="flex justify-center shrink-0 w-full md:w-auto py-4">
            {isLoadingDraw ? (
              <div className="w-[240px] h-[340px] rounded-2xl border border-dashed border-slate-700 flex items-center justify-center text-slate-500 font-bold text-xs animate-pulse">
                🔮 正在開啟修煉卡庫...
              </div>
            ) : (
              (() => {
                const todayStr = taipeiDateStr();
                const hasDrawnToday = dailyDraw && dailyDraw.drawnDate === todayStr;
                
                return (
                  <div className="relative w-60 h-[340px] flex items-center justify-center select-none modal-force-dark">
                    
                    {/* 🌟 琥珀金背景柔和呼吸光 (Radial Glow) - 增加對比度與懸浮立體感 */}
                    <div className="absolute inset-0 -m-10 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.18)_0%,transparent_70%)] opacity-70 animate-pulse pointer-events-none" />

                    {/* 🃏 卡片堆疊效果 (僅在未抽卡或正在抽出時顯示，營造卡組厚度) */}
                    {(!hasDrawnToday || isDrawingAnimation) && (
                      <>
                        {/* 最底層卡片 (疊卡 3) */}
                        <div 
                          className="absolute inset-0 rounded-[24px] border-2 border-amber-500/10 bg-slate-950/75 backdrop-blur-md opacity-35 shadow-lg pointer-events-none transition-transform duration-500"
                          style={{
                            transform: 'translate(-12px, 12px) rotate(-8deg)',
                          }}
                        />
                        {/* 中間層卡片 (疊卡 2) */}
                        <div 
                          className="absolute inset-0 rounded-[24px] border-2 border-amber-500/20 bg-slate-950/75 backdrop-blur-md opacity-60 shadow-xl pointer-events-none transition-transform duration-500"
                          style={{
                            transform: 'translate(6px, 6px) rotate(4deg)',
                          }}
                        />
                      </>
                    )}

                    {/* 🔮 作用卡片 (3D 旋轉與抽卡主體，藉由 inline styles 確保絕對定位不跑版) */}
                    <div 
                       onClick={!hasDrawnToday ? handleDrawCard : undefined}
                      className="relative w-full h-full"
                      style={{
                        perspective: '1200px',
                      }}
                    >
                      <div 
                        className="relative w-full h-full"
                        style={{
                          transformStyle: 'preserve-3d',
                          transform: (() => {
                            if (isDrawingAnimation && !dailyDraw) {
                              return 'translateY(-120px) rotate(-12deg) scale(0.85) rotateY(0deg)';
                            }
                            if (hasDrawnToday || isFlipping) {
                              return 'rotateY(180deg)';
                            }
                            return 'rotateY(0deg)';
                          })(),
                          transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        {/* 🔒 卡片背面 (使用 absolute 與 backface-visibility) - 曜石玻璃磨砂質感 */}
                        <div 
                          className="absolute inset-0 w-full h-full rounded-[24px] border-2 border-amber-500/40 bg-gradient-to-br from-slate-900/80 via-slate-950/85 to-slate-900/80 backdrop-blur-xl flex flex-col justify-between items-center p-6 shadow-2xl transition-all duration-300 hover:border-amber-400/70 hover:shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(245,158,11,0.25)]"
                          style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            zIndex: 2,
                          }}
                        >
                          {/* Dashed border inlay */}
                          <div className="absolute inset-2 border border-dashed border-amber-500/20 rounded-[18px] pointer-events-none" />
                          
                          {/* ⚜️ 金屬古典防撞角飾 (Corner Brackets) */}
                          <div className="absolute top-3.5 left-3.5 w-3 h-3 border-t border-l border-amber-500/40 pointer-events-none" />
                          <div className="absolute top-3.5 right-3.5 w-3 h-3 border-t border-r border-amber-500/40 pointer-events-none" />
                          <div className="absolute bottom-3.5 left-3.5 w-3 h-3 border-b border-l border-amber-500/40 pointer-events-none" />
                          <div className="absolute bottom-3.5 right-3.5 w-3 h-3 border-b border-r border-amber-500/40 pointer-events-none" />

                          {/* Decorative Gold Header Icon */}
                          <div className="w-12 h-12 rounded-full border border-amber-500/20 bg-amber-500/5 flex items-center justify-center text-amber-500 shrink-0 z-10">
                            <Sparkles size={20} className="animate-pulse" />
                          </div>
                          
                          {/* Prompt Text */}
                          <div className="space-y-2 text-center z-10">
                            <p className="text-sm font-black tracking-widest text-amber-400 uppercase">
                              以終為始
                            </p>
                            <p className="text-[11px] text-slate-400 font-bold px-2 leading-relaxed animate-pulse">
                              🔮 點擊抽取今日修行卡
                            </p>
                          </div>
                          
                          {/* Bottom Plaque */}
                          <span className="text-[9px] font-black text-slate-500 bg-slate-950/60 px-3 py-1 rounded-full border border-white/5 uppercase tracking-widest shrink-0 z-10">
                            NLP CULTIVATION
                          </span>
                        </div>
                        
                        {/* 🔓 卡片正面 (使用 absolute 與 backface-visibility，翻轉 180 度) - 曜石玻璃磨砂質感 */}
                        <div 
                          className="absolute inset-0 w-full h-full rounded-[24px] border-2 border-amber-500/55 bg-gradient-to-br from-slate-900/80 via-slate-950/85 to-slate-900/80 backdrop-blur-xl flex flex-col justify-between items-center p-6 shadow-2xl"
                          style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                          }}
                        >
                          {/* Dashed border inlay */}
                          <div className="absolute inset-2 border border-dashed border-amber-500/20 rounded-[18px] pointer-events-none" />
                          
                          {/* ⚜️ 金屬古典防撞角飾 (Corner Brackets) */}
                          <div className="absolute top-3.5 left-3.5 w-3 h-3 border-t border-l border-amber-500/40 pointer-events-none" />
                          <div className="absolute top-3.5 right-3.5 w-3 h-3 border-t border-r border-amber-500/40 pointer-events-none" />
                          <div className="absolute bottom-3.5 left-3.5 w-3 h-3 border-b border-l border-amber-500/40 pointer-events-none" />
                          <div className="absolute bottom-3.5 right-3.5 w-3 h-3 border-b border-r border-amber-500/40 pointer-events-none" />
                          
                          <div className="text-[10px] font-black tracking-wider text-amber-400/80 uppercase z-10 flex flex-col items-center gap-0.5">
                            <span>★ 今日以終為始修行 ★</span>
                            {dailyDraw?.drawnDate && (
                              <span className="text-[9px] text-slate-400 font-bold bg-slate-950/40 px-2 py-0.5 rounded-full border border-white/5">
                                修行日期：{dailyDraw.drawnDate}
                              </span>
                            )}
                          </div>
                          
                          <div className="my-auto py-4 flex flex-col items-center z-10">
                            <span className="gold-calligraphy text-4xl font-extrabold tracking-widest block mb-2 select-text drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                              {dailyDraw?.word}
                            </span>
                            <span className="text-[11px] text-slate-400 font-bold block mt-1">
                              今日修煉詞
                            </span>
                          </div>
                          
                          <div className="w-full space-y-2.5 z-10">
                            <p 
                              onClick={() => showToast?.('💡 這是今日修行提醒，無須點擊提交。您只要在對話中成功引導他人說出此詞彙即可！', 'info')}
                              className="text-[11px] text-amber-400 bg-slate-950/70 border border-amber-500/30 px-3 py-2.5 rounded-xl leading-relaxed font-bold text-center shadow-inner cursor-pointer hover:bg-slate-900/80 transition-colors"
                            >
                              🎯 引導他人說出這個詞彙以完成今日修行
                            </p>
                            <div className="flex items-center justify-center gap-1 text-[9px] text-slate-400 font-black">
                              <CheckCircle2 size={10} className="text-emerald-500" />
                              已記錄至個人面板
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })()
            )}
          </div>
        </section>
      )}

      {/* 📝 簽到證明上傳 Modal */}
      {showProofModal && selectedTask && (
        <ProofModal
          selectedTask={selectedTask} proofText={proofText} proofImg={proofImg} proofLink={proofLink}
          setProofText={setProofText} setProofImg={setProofImg} setProofLink={setProofLink}
          setShowProofModal={setShowProofModal} setSelectedTask={setSelectedTask}
          handleModalSubmit={handleModalSubmit} handleFileChange={handleFileChange}
          compressing={compressing} submitting={submitting}
        />
      )}

      {/* ⚠️ 免證明直接簽到確認 Modal */}
      {showConfirmModal && confirmTask && (
        <ConfirmModal
          confirmTask={confirmTask} setShowConfirmModal={setShowConfirmModal}
          setConfirmTask={setConfirmTask} onCheckIn={onCheckIn}
        />
      )}

      {/* 🔮 準備進化確認 Modal */}
      {showConfirmEvolve && (() => {
        const isFirst = !userPet || userPet.current_stage_index <= 1;
        
        // ── 1. 混沌的蛋初次進化：完成對應任務即可選擇進化方向 ──
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
                            fromImage: currentStage?.image_url || null,
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
      {showSuccessModal && <SuccessModal showSuccessModal={showSuccessModal} setShowSuccessModal={setShowSuccessModal} />}

      {/* 🚀 神獸升級成功 Modal —— 進化特效進行中時不顯示,確保一次只跳一個 */}
      {showLevelUpModal && !showSuccessModal && <LevelUpModal showLevelUpModal={showLevelUpModal} setShowLevelUpModal={setShowLevelUpModal} onEvolveNow={handleEvolveNow} onContinue={handleLevelUpContinue} />}

      {/* 🏆 連勝里程碑詳細資訊彈窗 */}
      {selectedMilestone && (
        <MilestoneModal
          milestone={selectedMilestone}
          dailyStreak={dailyStreak}
          onClose={() => setSelectedMilestone(null)}
        />
      )}

      {/* 🛡️ 連勝護盾說明彈窗 */}
      {showShieldInfo && (
        <div
          className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowShieldInfo(false)}
        >
          <div
            className="glass-panel w-full max-w-xs rounded-3xl border border-sky-500/30 p-6 text-center relative animate-in zoom-in-95 duration-200 light:bg-white light:border-sky-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl mb-2">🛡️</div>
            <h3 className="text-lg font-black text-white light:text-slate-900">連勝護盾</h3>
            <div className="text-2xl font-black text-sky-400 light:text-sky-600 mt-1 mb-2">
              {activeProfile.streak_shields} <span className="text-sm text-slate-400 light:text-slate-500">/ 3 張</span>
            </div>

            {/* 最重要:強調全自動,不用手動 */}
            <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full mb-3 light:text-emerald-700 light:bg-emerald-50 light:border-emerald-200">
              🤖 全自動 · 不用手動使用
            </div>

            <div className="text-left space-y-2.5 bg-slate-950/40 rounded-2xl p-3.5 light:bg-slate-50">
              <div className="flex gap-2 text-xs text-slate-300 light:text-slate-600 leading-relaxed">
                <span className="shrink-0">①</span>
                <span>哪天<b className="text-white light:text-slate-900">漏打卡</b>,隔天你一打卡,系統會<b className="text-sky-300 light:text-sky-700">自動用掉 1 張護盾</b>把那天補上 → <b className="text-orange-300 light:text-orange-600">連勝不斷</b>!(你什麼都不用按)</span>
              </div>
              <div className="flex gap-2 text-xs text-slate-300 light:text-slate-600 leading-relaxed">
                <span className="shrink-0">②</span>
                <span>怎麼獲得護盾?完成有 <b className="text-sky-300 light:text-sky-700">🛡️ 標記</b> 的任務就會 +1 張,最多存 <b className="text-sky-300 light:text-sky-700">3 張</b>。</span>
              </div>
              <div className="flex gap-2 text-xs text-slate-300 light:text-slate-600 leading-relaxed">
                <span className="shrink-0">③</span>
                <span>只能補<b className="text-white light:text-slate-900">單天</b>漏打;連續漏兩天就會斷連勝喔。</span>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowShieldInfo(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-white/5 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all light:bg-slate-100 light:border-slate-200 light:text-slate-600"
              >
                知道了
              </button>
              {!isCohortEnded && (
                <button
                  type="button"
                  onClick={goEarnShield}
                  className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-black active:scale-95 transition-all"
                >
                  前往賺護盾 →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✨ 連勝禮物「已達成」慶祝特效（純視覺，分數已於達成時自動發放，不重複加分） */}
      {celebrateNode && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center pointer-events-none select-none">
          {/* 中央光暈 */}
          <div className="absolute w-56 h-56 rounded-full bg-amber-400/20 blur-2xl" style={{ animation: 'msGlow 1.8s ease-out forwards' }} />
          <div className="relative flex flex-col items-center">
            {/* 四射星星：外層固定旋轉決定方向，內層做位移動畫 */}
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className="absolute top-6" style={{ transform: `rotate(${i * 36}deg)` }}>
                <span className="block text-lg" style={{ animation: 'msSpark 0.9s ease-out forwards' }}>✨</span>
              </span>
            ))}
            {/* 禮物彈跳 */}
            <div className="text-6xl" style={{ animation: 'msPop 0.6s cubic-bezier(.18,1.4,.4,1) both' }}>🎁</div>
            {/* +X EXP 上升淡出 */}
            <div
              className="mt-3 text-3xl font-black text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)] light:text-amber-600"
              style={{ animation: 'msRise 1.6s ease-out forwards' }}
            >
              +{celebrateNode.bonus} EXP
            </div>
            <div
              className="text-xs font-black text-amber-300 mt-1 light:text-amber-700"
              style={{ animation: 'msRise 1.6s ease-out 0.1s forwards', opacity: 0 }}
            >
              🔥 連勝 {celebrateNode.d} 天獎勵
            </div>
          </div>
          <style>{`
            @keyframes msPop { 0%{transform:scale(0) rotate(-15deg)} 70%{transform:scale(1.25) rotate(6deg)} 100%{transform:scale(1) rotate(0)} }
            @keyframes msRise { 0%{opacity:0;transform:translateY(14px) scale(.8)} 25%{opacity:1;transform:translateY(0) scale(1.1)} 70%{opacity:1;transform:translateY(-14px) scale(1)} 100%{opacity:0;transform:translateY(-46px) scale(.95)} }
            @keyframes msSpark { 0%{opacity:1;transform:translateY(0) scale(.2)} 100%{opacity:0;transform:translateY(-70px) scale(1.4)} }
            @keyframes msGlow { 0%{opacity:0;transform:scale(.4)} 30%{opacity:1} 100%{opacity:0;transform:scale(1.3)} }
          `}</style>
        </div>
      )}
    </div>
  );
}

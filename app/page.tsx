'use client';

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/lib/brand';
import { fetchAllTables } from '@/services/queries';
import { logEvent } from '@/lib/clientLog';
import { useUiFeedback } from '@/hooks/useUiFeedback';
import { useTables } from '@/hooks/useTables';
import { useSquadRoles } from '@/hooks/useSquadRoles';
import { useAdminContent } from '@/hooks/useAdminContent';
import { useAdminMisc } from '@/hooks/useAdminMisc';
import { useAuth } from '@/hooks/useAuth';
import { useAdminPeople } from '@/hooks/useAdminPeople';
import { useMissionGen } from '@/hooks/useMissionGen';
import { useGameActions } from '@/hooks/useGameActions';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import {
  Profile, Team, Task, ScoreLog,
  UserAchievement, UserRole,
} from '@/types';

import { BadgeIcon } from '@/components/BadgeIcon';

// Import layout components
import { Header } from '@/components/Layout/Header';
import { Navigation, TabKey } from '@/components/Layout/Navigation';

// Import login components
import { LoginForm } from '@/components/Login/LoginForm';
import { RegisterForm } from '@/components/Login/RegisterForm';

// Import tab components
import { DailyQuestsTab } from '@/components/Tabs/DailyQuestsTab';
import { WeeklyTopicTab } from '@/components/Tabs/WeeklyTopicTab';
import { SpecialQuestsTab } from '@/components/Tabs/SpecialQuestsTab';
import { LeaderboardTab } from '@/components/Tabs/LeaderboardTab';
import { AchievementsTab } from '@/components/Tabs/AchievementsTab';
import { CourseTab } from '@/components/Tabs/CourseTab';
import { HistoryTab } from '@/components/Tabs/HistoryTab';
// 後台兩個大組件改用 lazy 載入：學員/隊長平常不會進，初次載入不必下載這幾千行 JS
const CaptainDashboard = lazy(() => import('@/components/Captain/CaptainDashboard').then(m => ({ default: m.CaptainDashboard })));
const AdminDashboard = lazy(() => import('@/components/Admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
import { WitnessTab } from '@/components/Tabs/WitnessTab';
import { LifeNumberTab } from '@/components/Tabs/LifeNumberTab';

// 階段0 開關：登入時是否先向後端換取真實 Supabase session。
// 預設開；若新流程出狀況，設環境變數 NEXT_PUBLIC_USE_REAL_AUTH=false 即可退回舊「假登入」。
const USE_REAL_AUTH = process.env.NEXT_PUBLIC_USE_REAL_AUTH !== 'false';

// 階段3 開關：是否「強制要有有效 Supabase session 才放行」。
// 預設關（上傳程式但還沒開 RLS 時，學員無感、舊自動登入照常）。
// 開 RLS 當天才設 NEXT_PUBLIC_REQUIRE_SESSION=true → 沒有效 session 的人會被帶回登入頁
// 重新登入一次（避免卡在「進得去卻讀不到」的壞畫面）。
const REQUIRE_SESSION = process.env.NEXT_PUBLIC_REQUIRE_SESSION === 'true';

// lazy 後台組件載入中的暫時畫面
function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-10 h-10 rounded-full border-2 border-purple-400/30 border-t-purple-400 animate-spin" />
      <p className="text-sm font-black text-slate-400">載入後台中…</p>
    </div>
  );
}

export default function Home() {
  // --- Auth / User State ---
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [userEnrollments, setUserEnrollments] = useState<Profile[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [viewState, setViewState] = useState<'login' | 'register' | 'app'>('login');
  const [loadError, setLoadError] = useState(false);
  // 大隊長「檢視某學員帳號」：存被檢視的學員 id；null = 正常檢視自己
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(null);
  // 檢視時是否「可操作」：預設 false（唯讀），需手動開啟才能代打卡等（防誤觸）
  const [viewCanOperate, setViewCanOperate] = useState(false);
  // 檢視中「編輯此帳號」面板
  const [editAccountOpen, setEditAccountOpen] = useState(false);
  const [accForm, setAccForm] = useState<{ name: string; phone: string; role: UserRole; team_id: string; status: string }>({ name: '', phone: '', role: 'student', team_id: '', status: 'active' });
  const [accAdjAmount, setAccAdjAmount] = useState('');
  const [accAdjReason, setAccAdjReason] = useState('');
  // 防連點 / 重複打卡：記錄「進行中」的任務 id，避免同一任務在送出尚未完成時被重複觸發而重複加分
  const checkInLock = useRef<Set<string>>(new Set());
  // 開機時先確認 session，避免每次重整閃一下登入頁
  const [booting, setBooting] = useState(true);

  // --- Invitation States ---
  const [inviteCode, setInviteCode] = useState<string>('');
  const [invitedTeamName, setInvitedTeamName] = useState<string>('');
  const [invitedCaptainName, setInvitedCaptainName] = useState<string>('');
  const [inviteError, setInviteError] = useState<string>('');
  
  // --- GM Mode Simulation ---
  const [gmMode, setGmMode] = useState(false);
  const [selectedGmRole, setSelectedGmRole] = useState<UserRole>('student');

  // --- Database States ---（25 個資料表 state + applyTables 純搬移到 hooks/useTables.ts，名稱不變）
  const {
    batches, setBatches,
    missionTemplates, setMissionTemplates,
    batchMissionTemplates, setBatchMissionTemplates,
    profiles, setProfiles,
    teams, setTeams,
    tasks, setTasks,
    submissions, setSubmissions,
    missions, setMissions,
    courses, setCourses,
    attendance, setAttendance,
    achievements, setAchievements,
    userAchievements, setUserAchievements,
    announcements, setAnnouncements,
    notes, setNotes,
    scoreLogs, setScoreLogs,
    pets, setPets,
    userPets, setUserPets,
    cards, setCards,
    decks, setDecks,
    deckCards, setDeckCards,
    userDecks, setUserDecks,
    petLines, setPetLines,
    petStages, setPetStages,
    captainCandidates, setCaptainCandidates,
    squadRoles, setSquadRoles,
    applyTables,
  } = useTables();
  const [pendingAchievements, setPendingAchievements] = useState<UserAchievement[]>([]);
  // 升級/進化彈窗顯示中時為 true → 成就彈窗排在它們之後,避免重疊
  const [questModalActive, setQuestModalActive] = useState(false);

  // --- UI States ---
  const [activeTab, setActiveTab] = useState<TabKey>('daily');

  // ⚡ score_logs 延後載入:大隊長登入「不載」歷程(它是最慢的查詢之一),
  //    改成切到「歷程 / 神隊管理」分頁時才載一次。學員/隊長走 fetchScoped 已自帶歷程,不受影響。
  const scoreLogsLoadedRef = useRef(false);
  const loadScoreLogs = useCallback(async () => {
    if (scoreLogsLoadedRef.current) return;
    scoreLogsLoadedRef.current = true;
    const { data } = await supabase
      .from('score_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1200);
    if (data && data.length > 0) setScoreLogs(data);
  }, []);
  useEffect(() => {
    if (currentUser?.role === 'admin' && (activeTab === 'history' || activeTab === 'captain')) {
      loadScoreLogs();
    }
  }, [activeTab, currentUser?.role, loadScoreLogs]);

  // 切換分頁時自動捲回頂端，避免新分頁停在上一頁的捲動位置（例如修行明細看不到上方標頭）
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }, [activeTab]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSyncing, setIsSyncing] = useState(false);
  const [adminSelectedTeamId, setAdminSelectedTeamId] = useState<string>('');

  // --- UI 回饋（Toast / 彩帶 / 分數浮動）抽到 hooks/useUiFeedback ---
  const { toasts, particles, scoreFloats, showToast, triggerConfetti, triggerScoreFloat } = useUiFeedback();

  // Load theme preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme') as 'dark' | 'light';
      if (storedTheme === 'light') {
        setTheme('light');
        document.documentElement.classList.add('light');
      } else {
        setTheme('dark');
        document.documentElement.classList.remove('light');
      }
    }
  }, []);

  // Toggle dark/light theme
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', nextTheme);
      if (nextTheme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    }
  };

  // Fetch all data from localStorage/Supabase
  const fetchData = useCallback(async (userId?: string) => {
    setIsSyncing(true);
    setLoadError(false);
    let loadedProfile: Profile | null = null;
    try {
      // 1. Fetch current profile
      const targetUserId = userId || currentUser?.id;
      if (targetUserId) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', targetUserId);
        if (profileData && profileData.length > 0) {
          const prof = profileData[0] as Profile;
          if (prof.role !== 'admin' && !prof.batch_id) {
            prof.batch_id = 'batch-50';
          }
          setCurrentUser(prof);
          loadedProfile = prof;

          // Fetch team of this profile
          if (prof.team_id) {
            const { data: teamData } = await supabase.from('teams').select('*').eq('id', prof.team_id);
            if (teamData && teamData.length > 0) {
              setCurrentTeam(teamData[0] as Team);
            } else {
              setCurrentTeam(null);
            }
          } else {
            setCurrentTeam(null);
          }
        }
      } else {
        setCurrentUser(null);
        setCurrentTeam(null);
      }

      // 2. 分流讀取（P0）：學員/隊長只撈本期資料、跳過後台表；大隊長全撈。詳見 services/queries.ts
      const isAdminUser = loadedProfile?.role === 'admin';
      const userBatchId = loadedProfile?.batch_id || null;
      // 純學員走「瘦身載入」(只有自己的完整提交+全員精簡計數);
      // 隊長 or 有小組角色者(如盯盯隊長,要看隊員進度)維持整期完整提交。
      const keepBatchSubs = loadedProfile?.role !== 'student' || !!loadedProfile?.squad_role;

      // 「AllTables → 畫面 state」已純搬移到 hooks/useTables.ts 的 applyTables，
      // 供 SWR 兩次呼叫(先快取、後最新)。行為與原本完全一致。
      // applyTables 原引用 fetchData 閉包的 loadedProfile/currentUser 與 setUserEnrollments，
      // 搬出後改由此處以 extra 參數帶入。
      const applyExtra = { activeProfile: loadedProfile || currentUser, setUserEnrollments };

      // 2a. SWR：先用上次快取把畫面「秒畫」出來(僅學員/非 admin；admin 需即時看到自己後台編輯，不快取)
      const cacheKey = (!isAdminUser && targetUserId) ? `nlp_tables_${targetUserId}` : null;
      if (cacheKey && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const cached = JSON.parse(raw);
            if (cached?.t && cached.tables && (Date.now() - cached.t) < 24 * 60 * 60 * 1000) {
              applyTables(cached.tables, applyExtra);
              setIsSyncing(false); // 畫面先出來，不卡「載入中」轉圈
            }
          }
        } catch { /* 快取壞了就忽略，照常往下撈最新 */ }
      }

      // 2b. 撈最新資料覆蓋畫面（背景刷新）
      const _loadStart = Date.now();
      const fresh = await fetchAllTables({ batchId: userBatchId, isAdmin: isAdminUser, studentId: loadedProfile?.id ?? null, keepBatchSubs });
      // 監控:載入過慢(>8秒)主動記下,讓大隊長在後台看到「誰、何時、轉幾秒」,不用等學員回報。
      const _loadSec = (Date.now() - _loadStart) / 1000;
      if (_loadSec > 8) {
        logEvent('slow_load', `${_loadSec.toFixed(1)}s, ${isAdminUser ? 'admin' : 'student'}`, loadedProfile?.name);
      }
      applyTables(fresh, applyExtra);

      // 2c. 更新快取(大小防護：超過上限就不存，避免塞爆 localStorage)
      if (cacheKey && typeof window !== 'undefined') {
        try {
          const s = JSON.stringify({ t: Date.now(), tables: fresh });
          if (s.length < 3_500_000) localStorage.setItem(cacheKey, s);
          else localStorage.removeItem(cacheKey);
        } catch { /* 容量不足等 → 放棄快取，不影響功能 */ }
      }

      return loadedProfile;
    } catch (err) {
      console.error('Error fetching data:', err);
      setLoadError(true);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser?.id]);

  // 在畫面真正繪製前先判斷：沒登入且沒邀請 → 直接顯示登入框，不先閃「載入中…」
  // （已登入或有邀請者仍維持 booting，由 initSession 處理）
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const hasSession = !!localStorage.getItem('nlp_mock_user_id');
    const params = new URLSearchParams(window.location.search);
    const hasInvite = !!params.get('invite');
    if (!hasSession && !hasInvite) {
      setBooting(false);
    }
  }, []);

  // Load session on startup & handle invite query params
  useEffect(() => {
    const initSession = async () => {
      // 不再無條件預抓全部資料：已登入會由 fetchData(activeUserId) 載入，
      // 邀請/註冊流程則各自直接查詢所需資料，避免開機跑兩次 fetchData。
      let queryInvite = '';
      let queryBatch = '';
      let queryTeam = '';
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        queryInvite = params.get('invite') || '';
        queryBatch = params.get('batch') || '';
        queryTeam = params.get('team') || '';
      }

      // Only use nlp_mock_user_id — we do NOT call supabase.auth.getUser()
      // because this project uses profiles table login, not Supabase Auth accounts.
      const mockUserId = typeof window !== 'undefined' ? localStorage.getItem('nlp_mock_user_id') : null;
      
      let activeUserId = mockUserId;
      let loadedProfile: Profile | null = null;

      // 階段3：開了 RLS 後，沒有效 Supabase session 的人若用舊的自動登入，
      // 會卡在「進得去卻讀不到」的壞畫面。此時清掉舊登入、帶回登入頁重新登入一次。
      if (REQUIRE_SESSION && activeUserId && typeof (supabase as any)?.auth?.getSession === 'function') {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('nlp_mock_user_id');
              localStorage.removeItem('nlp_session');
            }
            activeUserId = null;
          }
        } catch {
          // 取 session 失敗時保守起見也要求重新登入
          if (typeof window !== 'undefined') {
            localStorage.removeItem('nlp_mock_user_id');
            localStorage.removeItem('nlp_session');
          }
          activeUserId = null;
        }
      }

      if (activeUserId) {
        loadedProfile = await fetchData(activeUserId);
        if (!loadedProfile) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('nlp_mock_user_id');
            localStorage.removeItem('nlp_session');
          }
          activeUserId = null;
        }
      }

      // 階段3 強化：不只「有 session」，還要「session 與帳號綁定(auth_user_id)相符」才放行。
      // 否則（未綁定 / 綁定對不上 / session 失效）一律強制重新登入，
      // 避免「進得去 app 卻因 RLS 打不了卡」的壞狀態。
      if (REQUIRE_SESSION && activeUserId && loadedProfile && typeof (supabase as any)?.auth?.getSession === 'function') {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const boundUid = (loadedProfile as any).auth_user_id;
          if (!session || !boundUid || session.user?.id !== boundUid) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('nlp_mock_user_id');
              localStorage.removeItem('nlp_session');
            }
            try { await supabase.auth.signOut(); } catch { /* 忽略 */ }
            activeUserId = null;
            loadedProfile = null;
          }
        } catch {
          activeUserId = null;
          loadedProfile = null;
        }
      }

      if (activeUserId) {
        setViewState('app');
        
        // If they followed an invite link while logged in, check enrollment!
        if (queryInvite && queryBatch && queryTeam) {
          // 先清掉網址的邀請參數，避免每次重整都重新觸發（彈出「您已是此小隊成員」等）
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          const { data: teamsList } = await supabase.from('teams').select('*');
          const team = teamsList?.find((t: any) => t.invite_code === queryInvite);

          if (!team || team.id !== queryTeam || team.batch_id !== queryBatch) {
            alert('邀請資訊不符，防竄改保護已啟動！');
          } else if (!team.invite_enabled) {
            alert('此邀請通道已關閉');
          } else {
            const { data: profilesList } = await supabase.from('profiles').select('*');
            const isEnrolled = profilesList?.some((p: any) => p.profile_id === loadedProfile?.profile_id && p.batch_id === queryBatch);
            
            if (isEnrolled) {
              const userEnrollment = profilesList?.find((p: any) => p.profile_id === loadedProfile?.profile_id && p.batch_id === queryBatch);
              if (userEnrollment?.team_id === queryTeam) {
                alert('您已是此小隊成員！');
              } else {
                alert('同一學員不可在同一期重複加入多個小隊。若需換隊，請洽後台管理員。');
              }
            } else {
              setIsSyncing(true);
              const enrollId = (typeof crypto !== 'undefined' && crypto.randomUUID)
                ? crypto.randomUUID()
                : `usr-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
              const { error: enrollErr } = await supabase.from('profiles').insert({
                id: enrollId,
                profile_id: loadedProfile?.profile_id,
                name: loadedProfile?.name,
                phone: loadedProfile?.phone,
                batch_id: queryBatch,
                team_id: queryTeam,
                captain_id: team?.captain_id || null,
                role: 'student',
                score: 0,
                status: 'active',
                created_at: new Date().toISOString()
              });
              
              if (enrollErr) {
                alert(enrollErr.message || '加入小隊失敗');
              } else {
                alert('🎉 成功加入小隊！已為您切換至新期數。');
                if (typeof window !== 'undefined') {
                  window.history.replaceState({}, document.title, window.location.pathname);
                }
                const updatedProfiles = await fetchData(activeUserId);
                const { data: newProfiles } = await supabase.from('profiles').select('*');
                const newEnrollment = newProfiles?.find((p: any) => p.profile_id === loadedProfile?.profile_id && p.batch_id === queryBatch);
                if (newEnrollment) {
                  localStorage.setItem('nlp_session', JSON.stringify(newEnrollment));
                  await fetchData(newEnrollment.id);
                }
              }
              setIsSyncing(false);
            }
          }
        }
        
        if (loadedProfile && loadedProfile.role === 'admin') {
          setActiveTab('admin');
        } else {
          setActiveTab('daily');
        }
      } else if (queryInvite) {
        setInviteCode(queryInvite);
        setViewState('register');

        // Validate invite code using DB data
        const { data: teamsList } = await supabase.from('teams').select('*');
        const team = teamsList?.find((t: any) => t.invite_code === queryInvite);
        
        const params = new URLSearchParams(window.location.search);
        const urlBatch = params.get('batch') || '';
        const urlTeam = params.get('team') || '';

        if (!team || team.id !== urlTeam || team.batch_id !== urlBatch) {
          setInviteError('邀請資訊不符，防竄改保護已啟動！');
        } else if (!team.invite_enabled) {
          setInviteError('此邀請通道已關閉');
        } else {
          const { data: profilesList } = await supabase.from('v_public_profiles').select('*');
          const currentMembersCount = profilesList?.filter((p: any) => p.team_id === team.id && p.role === 'student').length || 0;
          if (currentMembersCount >= (team.max_members || 10)) {
            setInviteError(`此小隊成員已滿（上限 ${team.max_members || 10} 人）`);
          } else {
            setInvitedTeamName(team.name);
            const captain = profilesList?.find((p: any) => p.id === team.captain_id);
            if (captain) {
              setInvitedCaptainName(captain.name);
            }
          }
        }
      } else {
        setViewState('login');
      }
    };
    initSession().finally(() => setBooting(false));
  }, []);

  // --- Auth Actions ---
  const {
    handleLogin,
    handleRegister,
    handleLogout,
    handleSwitchCohort,
  } = useAuth({
    setIsSyncing,
    fetchData,
    currentUser,
    setCurrentUser,
    setCurrentTeam,
    setViewState,
    setGmMode,
    setActiveTab,
    inviteCode,
    setInviteCode,
    setInvitedTeamName,
    setInvitedCaptainName,
    setInviteError,
    userEnrollments,
    USE_REAL_AUTH,
  });

  useEffect(() => {
    if (teams.length > 0 && !adminSelectedTeamId) {
      setAdminSelectedTeamId(teams[0].id);
    }
  }, [teams, adminSelectedTeamId]);

  // 監聽是否有未通知的已解鎖成就，推入彈窗佇列
  useEffect(() => {
    if (!currentUser || gmMode) return; // GM Mode (模擬特定學員) 下不彈窗，避免管理員切換學員時被洗版
    const unnotified = userAchievements.filter(
      ua => ua.student_id === currentUser.id && ua.notified === false
    );
    if (unnotified.length > 0) {
      setPendingAchievements(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newPending = unnotified.filter(p => !existingIds.has(p.id));
        if (newPending.length === 0) return prev;
        return [...prev, ...newPending];
      });
    }
  }, [userAchievements, currentUser, gmMode]);

  const handleAcceptAchievementBlessing = async () => {
    if (pendingAchievements.length === 0 || !currentUser) return;
    
    // trigger confetti for visual celebration
    triggerConfetti();

    // Call RPC to mark all unnotified as notified in backend
    try {
      await supabase.rpc('mark_achievements_notified', { p_student_id: currentUser.id });
    } catch (err) {
      console.error('Failed to mark achievements notified:', err);
    }

    // Update local state for userAchievements to prevent re-triggering
    setUserAchievements(prev => 
      prev.map(ua => ua.student_id === currentUser.id ? { ...ua, notified: true } : ua)
    );

    // Pop the active one from queue
    setPendingAchievements(prev => prev.slice(1));
  };



  const {
    handleCheckIn, handleRegisterCourse, handleSaveNote, handleReviewSubmission,
    handleToggleCell, handleHideWitness, handleDeleteWitness,
    handleEvolvePet, handleSelectEvolutionLine, handleMarkAttendance,
  } = useGameActions({
    currentUser, viewAsUserId, profiles, tasks, missions, submissions, gmMode,
    notes, attendance, courses, userPets, petStages, petLines, missionTemplates, batches,
    scoreLogs, checkInLock,
    setSubmissions, setCurrentUser, setProfiles, setUserPets, setScoreLogs,
    setAttendance, setNotes, setViewState, setIsSyncing,
    showToast, triggerConfetti, triggerScoreFloat, fetchData,
  });

  const {
    handleCreateTask, handleCreateTasksBulk, handleDeleteTask, handleUpdateTask,
    handleAddCaptainCandidate, handleUpdateCaptainCandidate, handleDeleteCaptainCandidate,
    handleCreateMissionTemplate, handleUpdateMissionTemplate, handleDeleteMissionTemplate,
    handleDeleteMission, handleUpdateMission, handleManualAdjustScore,
    handleCreatePet, handleCreateCard, handleCreateDeck,
    handleAwardPetSkin, handleLevelUpPet, handleUpdatePetStage, handleUpdatePetLine,
  } = useAdminMisc({ currentUser, setIsSyncing, fetchData, userPets });

  const {
    handleAddProfile, handleUpdateProfile, handleDeleteProfile, handleHardDeleteProfile,
    handleUpdateTeamSettings, handleAssignTeam, handleQuickAssignCaptain,
    handleCreateBatch, handleUpdateBatch, handleDeleteBatch,
  } = useAdminPeople({ setIsSyncing, fetchData, teams, profiles, gmMode, setTeams, currentTeam, setCurrentTeam });

  const { handleCreateSquadRole, handleUpdateSquadRole, handleDeleteSquadRole } =
    useSquadRoles({ setIsSyncing, fetchData, showToast });


  const { handleSaveBatchMissionTemplates, handleGenerateMissions } =
    useMissionGen({ setIsSyncing, fetchData, batches, missionTemplates });

  const {
    handleCreateAnnouncement, handleUpdateAnnouncement, handleDeleteAnnouncement,
    handleCreateCourse, handleUpdateCourse, handleDeleteCourse,
    handleCreateAchievement, handleUpdateAchievement, handleDeleteAchievement,
  } = useAdminContent({ currentUser, setIsSyncing, fetchData, setAchievements, setUserAchievements });


  // ⚠️ 效能:經驗明細(score_logs)顯示原本每次 render 全量 filter+map,且 map 內對
  //   submissions/tasks/missions 做巢狀 .find(O(logs × 資料量))。改包 useMemo(相關資料變動才重算)
  //   + 先建 id→物件 Map 讓查表 O(1)。行為與原本逐字相同。
  //   ⚠️ 必須放在下面 early return 之前(hooks 規則),故在此就地把 panelUser 用同一套邏輯算出來。
  const memoScoreLogs = useMemo(() => {
    const vp = viewAsUserId ? profiles.find(p => p.id === viewAsUserId) : null;
    const pu = vp || currentUser;
    if (!pu) return [] as ScoreLog[];
    const subById = new Map(submissions.map(s => [s.id, s]));
    const taskById = new Map(tasks.map(t => [t.id, t]));
    const missionById = new Map(missions.map(m => [m.id, m]));
    return scoreLogs.filter((l: ScoreLog) => l.student_id === pu.id).map(log => {
      let displayReason = log.reason;
      if (displayReason === '完成任務' && log.submission_id) {
        const sub = subById.get(log.submission_id);
        if (sub) {
          let taskName = '';
          let taskType = '';
          const targetId = sub.mission_id || sub.task_id;

          const t = targetId ? taskById.get(targetId) : undefined;
          if (t) {
            taskName = t.name;
            taskType = t.type;
          } else {
            const m = targetId ? missionById.get(targetId) : undefined;
            if (m) {
              taskName = m.title;
              taskType = m.mission_type;
            }
          }

          if (taskName) {
            let prefix = '[特殊]';
            if (taskType === 'daily') prefix = '[每日]';
            else if (taskType === 'weekly') prefix = '[每週]';
            else if (taskType === 'limited' || taskName.includes('限時') || taskName.includes('最後一週')) prefix = '[限時]';

            displayReason = `完成任務：${prefix} ${taskName}`;
          } else {
            displayReason = `完成任務 (紀錄已移除)`;
          }
        }
      }
      return { ...log, reason: displayReason };
    });
  }, [scoreLogs, submissions, tasks, missions, currentUser, viewAsUserId, profiles]);

  // --- Render logic ---
  // 開機確認 session 期間顯示載入畫面，避免閃登入頁
  if (booting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-amber-500 gap-4">
        <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-bold">載入中…</p>
      </div>
    );
  }

  if (viewState === 'login') {
    return (
      <LoginForm
        onLogin={handleLogin}
        onGoToRegister={() => setViewState('register')}
        isSyncing={isSyncing}
      />
    );
  }

  if (viewState === 'register') {
    return (
      <RegisterForm
        onRegister={handleRegister as any}
        onGoToLogin={() => {
          setInviteCode('');
          setInvitedTeamName('');
          setInvitedCaptainName('');
          setInviteError('');
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          setViewState('login');
        }}
        isSyncing={isSyncing}
        inviteCode={inviteCode}
        invitedTeamName={invitedTeamName}
        invitedCaptainName={invitedCaptainName}
        inviteError={inviteError}
      />
    );
  }

  // 載入失敗（免費版 Supabase 偶爾慢或斷線）→ 給明確提示與重試，避免白畫面
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-slate-950 text-center">
        <div className="glass-panel max-w-sm w-full p-8 rounded-3xl border border-white/10">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-white mb-2">連線失敗</h2>
          <p className="text-sm text-slate-400 mb-6">
            無法載入資料，可能是網路不穩或伺服器忙碌。請稍候再試一次。
          </p>
          <button
            onClick={() => { if (typeof window !== 'undefined') window.location.reload(); }}
            className="w-full btn-action py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black active:scale-95 transition-transform"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  // 資料尚未載入完成（避免短暫白畫面）
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950">
        <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-bold tracking-wide">載入中…</p>
      </div>
    );
  }

  // Compute active role for UI (GM override mode)
  const currentUiRole = (gmMode && currentUser.role === 'admin') ? selectedGmRole : currentUser.role;

  // 盯盯隊長:學員身分,但其小組角色(squad_role)定義的 can_view_squad=true → 可「唯讀」檢視自己小組指揮所
  // (只看成員清單+接龍;不能審核/補簽/改任何東西,資料庫 RLS 也會擋寫入)。
  const isSquadObserver = currentUser.role === 'student'
    && !!squadRoles.find(r => r.id === currentUser.squad_role)?.can_view_squad;

  // For admin (大隊長) viewing Captain Dashboard, we use their selected team; otherwise use their own team
  // 隊長/盯盯隊長若沒有自己的小隊，一律為 null（不可退回 teams[0]，否則會看到/操作別隊資料）
  const selectedTeamForCaptainView = (currentUser.role === 'admin' || currentUiRole === 'admin')
    ? (teams.find(t => t.id === adminSelectedTeamId) || teams[0])
    : (currentTeam || teams.find(t => t.id === currentUser.team_id) || null);

  // 大隊長唯讀檢視某學員：個人分頁(個人面板/歷史/成就/課程)的資料來源改為被檢視的學員
  const viewedProfile = viewAsUserId ? profiles.find(p => p.id === viewAsUserId) : null;
  const isViewingStudent = !!viewedProfile;
  const panelUser = viewedProfile || currentUser;
  const panelBatchId = panelUser.batch_id;
  // GM 模擬模式:傳給個人面板的使用者角色換成「模擬角色」,讓面板真的等於該角色
  // (例如模擬學員時 role=student → 顯示該期的每日/每週/特殊/限時任務、隱藏管理鈕)。
  // 注意:Header 仍用 panelUser(大隊長)以保留模擬切換鈕。
  const effectivePanelUser = (gmMode && currentUser.role === 'admin' && !viewedProfile)
    ? { ...panelUser, role: selectedGmRole }
    : panelUser;
  // 檢視學員時：預設唯讀；按「開啟操作」後才可代該學員打卡/進化/課程（handler 內部自動對 actingUser 操作）
  const readOnlyView = isViewingStudent && !viewCanOperate;
  const blockedAction: any = async () => { showToast('🔒 目前為唯讀檢視。要操作此帳號，請先按上方「開啟操作」。', 'info'); };
  const vCheckIn = readOnlyView ? blockedAction : handleCheckIn;
  const vEvolvePet = readOnlyView ? blockedAction : handleEvolvePet;
  const vSelectLine = readOnlyView ? blockedAction : handleSelectEvolutionLine;
  const vRegisterCourse = readOnlyView ? blockedAction : handleRegisterCourse;
  const vMarkAttendance = readOnlyView ? blockedAction : handleMarkAttendance;

  // Filter data by batch context
  const batchFilterId = currentUser.batch_id; // 後台/隊長情境用，維持大隊長身分
  const filteredProfiles = currentUser.role === 'admin' ? profiles : profiles.filter(p => p.batch_id === batchFilterId);
  const now = new Date();
  // 以下為「個人分頁」用，依 panelUser（被檢視學員或自己）
  // 「大隊長全看」只在:真的是 admin、不是在檢視某學員、且不是在模擬其他角色(GM 模式)時。
  // → 模擬學員/小隊長時改套用「該角色+該期」過濾,讓預覽真的等於該角色看到的畫面。
  const isAdminFullView = panelUser.role === 'admin' && !isViewingStudent && !gmMode;
  // ⚠️ 要放行「通用任務」(batch_id 空,例如通用補打卡任務)—— 否則所有期數都看不到。與公告/課程一致。
  const filteredTasks = isAdminFullView ? tasks : tasks.filter(t => !t.batch_id || t.batch_id === panelBatchId);
  const filteredAnnouncements = isAdminFullView
    ? announcements
    : announcements.filter(ann => (!ann.batch_id || ann.batch_id === panelBatchId) && new Date(ann.created_at) <= now);
  const filteredCourses = isAdminFullView ? courses : courses.filter(c => !c.batch_id || c.batch_id === panelBatchId);

  // Filter submissions / logs for the active tab context
  const filteredSubmissions = submissions.filter(s => s.student_id === panelUser.id);
  // filteredScoreLogs 已在元件上方以 useMemo 計算(memoScoreLogs);此處僅取用。
  //   (useMemo 必須放在 early return 之前才不違反 hooks 規則,故不能寫在這裡。)
  const filteredScoreLogs = memoScoreLogs;

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 bg-slate-950 text-white light:bg-slate-925">
      
      {/* 1. Header */}
      <Header
        profile={panelUser}
        team={currentTeam}
        batches={batches}
        achievements={achievements}
        theme={theme}
        toggleTheme={toggleTheme}
        onLogout={handleLogout}
        gmMode={gmMode}
        setGmMode={setGmMode}
        selectedGmRole={selectedGmRole}
        setSelectedGmRole={setSelectedGmRole as any}
        userEnrollments={userEnrollments}
        onSwitchCohort={handleSwitchCohort}
      />

      {/* 2. Horizontal navigation tab bar */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={isViewingStudent ? 'student' : currentUiRole}
        canViewSquad={isSquadObserver}
      />

      {/* 檢視學員：提示列 + 編輯此帳號 + 返回 */}
      {isViewingStudent && (
        <div className="sticky top-0 z-40 w-full shadow-lg select-none">
          <div className="bg-amber-500 text-slate-950 px-4 py-2.5 flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-black flex items-center gap-1.5 min-w-0">
              <span>👁️</span>
              <span className="truncate">正在檢視【{viewedProfile?.name}】的帳號</span>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {currentUser.role === 'admin' && (
                <>
                  <button
                    onClick={() => setViewCanOperate(v => !v)}
                    className={`font-black text-xs px-3 py-1.5 rounded-xl active:scale-95 transition-all ${viewCanOperate ? 'bg-emerald-600 text-white' : 'bg-slate-950/15 text-slate-950 hover:bg-slate-950/25'}`}
                    title={viewCanOperate ? '目前可代此帳號操作，點此鎖回唯讀' : '目前唯讀，點此開啟操作'}
                  >
                    {viewCanOperate ? '✅ 可操作中' : '🔒 開啟操作'}
                  </button>
                  <button
                    onClick={() => {
                      if (!editAccountOpen && viewedProfile) {
                        setAccForm({
                          name: viewedProfile.name || '',
                          phone: viewedProfile.phone || '',
                          role: viewedProfile.role,
                          team_id: viewedProfile.team_id || '',
                          status: viewedProfile.status || 'active',
                        });
                        setAccAdjAmount('');
                        setAccAdjReason('');
                      }
                      setEditAccountOpen(v => !v);
                    }}
                    className={`font-black text-xs px-3 py-1.5 rounded-xl active:scale-95 transition-all ${editAccountOpen ? 'bg-slate-950 text-amber-400' : 'bg-slate-950/15 text-slate-950 hover:bg-slate-950/25'}`}
                  >
                    ✏️ 編輯此帳號
                  </button>
                </>
              )}
              <button
                onClick={() => { setViewAsUserId(null); setViewCanOperate(false); setEditAccountOpen(false); setActiveTab(currentUser.role === 'admin' ? 'admin' : 'captain'); }}
                className="bg-slate-950 text-amber-400 font-black text-xs px-3 py-1.5 rounded-xl hover:bg-slate-800 active:scale-95 transition-all"
              >
                ← 返回
              </button>
            </div>
          </div>

          {/* 行內編輯面板 */}
          {editAccountOpen && viewedProfile && (
            <div className="bg-slate-900 border-b border-amber-500/30 px-4 py-4 text-white text-xs space-y-3 light:bg-white light:text-slate-900">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1"><span className="text-slate-400 font-bold">姓名</span>
                  <input value={accForm.name} onChange={e => setAccForm({ ...accForm, name: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg p-2 outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-900" /></label>
                <label className="flex flex-col gap-1"><span className="text-slate-400 font-bold">手機</span>
                  <input value={accForm.phone} onChange={e => setAccForm({ ...accForm, phone: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg p-2 outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-900" /></label>
                <label className="flex flex-col gap-1"><span className="text-slate-400 font-bold">角色</span>
                  <select value={accForm.role} onChange={e => setAccForm({ ...accForm, role: e.target.value as UserRole })} className="bg-slate-950 border border-slate-700 rounded-lg p-2 outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-900">
                    <option value="student">學員</option><option value="captain">小隊長</option><option value="admin">大隊長</option>
                  </select></label>
                <label className="flex flex-col gap-1"><span className="text-slate-400 font-bold">小隊</span>
                  <select value={accForm.team_id} onChange={e => setAccForm({ ...accForm, team_id: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg p-2 outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-900">
                    <option value="">— 未分配 —</option>
                    {teams.filter(t => t.batch_id === viewedProfile.batch_id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select></label>
                <label className="flex flex-col gap-1"><span className="text-slate-400 font-bold">狀態</span>
                  <select value={accForm.status} onChange={e => setAccForm({ ...accForm, status: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg p-2 outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-900">
                    <option value="active">進行中</option><option value="ended">已結束</option><option value="inactive">已停用</option>
                  </select></label>
                <div className="flex items-end">
                  <button
                    disabled={isSyncing}
                    onClick={async () => {
                      await handleUpdateProfile(viewedProfile.id, { name: accForm.name.trim(), phone: accForm.phone.trim(), role: accForm.role, team_id: accForm.team_id || null, status: accForm.status as any });
                      showToast('✓ 已更新帳號資料', 'success');
                    }}
                    className="w-full btn-action bg-amber-500 text-slate-950 font-black rounded-lg py-2 disabled:opacity-50"
                  >儲存資料</button>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-white/10 light:border-slate-200">
                <label className="flex flex-col gap-1"><span className="text-slate-400 font-bold">調分（+加 / -扣）</span>
                  <input type="number" value={accAdjAmount} onFocus={e => e.target.select()} onChange={e => setAccAdjAmount(e.target.value)} className="w-28 bg-slate-950 border border-slate-700 rounded-lg p-2 text-center font-mono outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-900" placeholder="例 500 / -300" /></label>
                <label className="flex flex-col gap-1 flex-1 min-w-[140px]"><span className="text-slate-400 font-bold">調分原因</span>
                  <input value={accAdjReason} onChange={e => setAccAdjReason(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg p-2 outline-none focus:border-amber-500 light:bg-slate-50 light:border-slate-300 light:text-slate-900" placeholder="例：補登課堂表現" /></label>
                <button
                  disabled={isSyncing || !accAdjAmount || !accAdjReason.trim()}
                  onClick={async () => {
                    const amt = Number(accAdjAmount);
                    if (!amt) { showToast('請輸入調分數字', 'error'); return; }
                    if (Math.abs(amt) > 5000 && !window.confirm(`確定要調整 ${amt > 0 ? '+' : ''}${amt} 分嗎？數字很大，請確認沒打錯。`)) return;
                    try {
                      await handleManualAdjustScore(viewedProfile.id, amt, accAdjReason.trim());
                      showToast(`✓ 已調整 ${amt > 0 ? '+' : ''}${amt} 分`, 'success');
                      setAccAdjAmount(''); setAccAdjReason('');
                    } catch (err: any) { showToast('調分失敗：' + (err?.message || ''), 'error'); }
                  }}
                  className="btn-action bg-emerald-600 text-white font-black rounded-lg px-4 py-2 disabled:opacity-40"
                >套用調分</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Main Workspace Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 pt-8 pb-24 md:pb-8 overflow-y-auto overflow-x-hidden">
        {activeTab === 'daily' && (
          <DailyQuestsTab
            profile={effectivePanelUser}
            tasks={filteredTasks}
            submissions={filteredSubmissions}
            announcements={filteredAnnouncements}
            onCheckIn={vCheckIn}
            isSyncing={isSyncing}
            missions={missions}
            showToast={showToast}
            userPet={userPets.find(up => up.student_id === panelUser.id) || null}
            petStages={petStages}
            onEvolvePet={vEvolvePet}
            batchStartDate={batches.find(b => b.id === panelUser.batch_id)?.start_date || null}
            allProfiles={profiles}
            allUserPets={userPets}
            batches={batches}
            petLines={petLines}
            missionTemplates={missionTemplates}
            onSelectEvolutionLine={vSelectLine}
            onModalActiveChange={setQuestModalActive}
            userEnrollments={userEnrollments}
            onSwitchCohort={handleSwitchCohort}
          />
        )}

        {activeTab === 'rank' && (
          <LeaderboardTab
            profiles={profiles}
            teams={teams}
            batches={batches}
            submissions={submissions}
            missions={missions}
            currentUser={currentUser}
            currentUiRole={currentUiRole}
            onToggleRankingsVisible={async (batchId, visible) => {
              await handleUpdateBatch(batchId, { rankings_visible: visible });
            }}
          />
        )}

        {activeTab === 'achievements' && (
          <AchievementsTab
            achievements={achievements}
            userAchievements={userAchievements.filter(ua => ua.student_id === panelUser.id)}
            studentScore={panelUser.score}
          />
        )}

        {activeTab === 'course' && (
          <CourseTab
            courses={filteredCourses}
            attendance={attendance}
            profiles={profiles}
            teams={teams}
            currentUserId={panelUser.id}
            onRegisterCourse={vRegisterCourse}
            onMarkAttendance={vMarkAttendance}
            isSyncing={isSyncing}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            logs={filteredScoreLogs}
            submissions={filteredSubmissions}
            tasks={tasks}
            missions={missions}
            userId={panelUser.id}
          />
        )}

        {activeTab === 'witness' && (
          <WitnessTab
            profiles={profiles}
            tasks={tasks}
            submissions={submissions}
            currentUserId={currentUser.id}
            onRefresh={async () => { await fetchData(); }}
            batches={batches}
            teams={teams}
            onHideWitness={handleHideWitness}
            onDeleteWitness={handleDeleteWitness}
            showToast={showToast}
          />
        )}

        {activeTab === 'lifenumber' && (
          <LifeNumberTab
            currentUser={panelUser}
            showToast={showToast}
          />
        )}

        {/* 隊長沒有被指派小隊：顯示擋板，不可看到/操作任何別隊資料 */}
        {activeTab === 'captain' && currentUiRole !== 'student' && currentUiRole !== 'admin' && !selectedTeamForCaptainView && (
          <div className="glass-panel p-10 rounded-3xl border border-white/10 text-center max-w-md mx-auto mt-8">
            <div className="text-4xl mb-4">🪧</div>
            <h2 className="text-lg font-bold text-white mb-2 light:text-slate-800">尚未指派小隊</h2>
            <p className="text-sm text-slate-400 light:text-slate-600">
              你的帳號還沒有被分配到任何小隊，請聯絡大隊長（管理員）為你指派後，即可使用隊長功能。
            </p>
          </div>
        )}
        {activeTab === 'captain' && (currentUiRole !== 'student' || isSquadObserver) && (currentUiRole === 'admin' || selectedTeamForCaptainView) && (
          <Suspense fallback={<DashboardLoading />}>
          <CaptainDashboard
            team={selectedTeamForCaptainView}
            allTeams={teams}
            currentUserRole={currentUser.role}
            observerMode={isSquadObserver}
            onAdminSelectTeam={(teamId) => setAdminSelectedTeamId(teamId)}
            profiles={filteredProfiles}
            tasks={[
              ...tasks.filter(t => t.batch_id === (selectedTeamForCaptainView?.batch_id || teams[0]?.batch_id)),
              ...missions
                .filter(m => m.batch_id === (selectedTeamForCaptainView?.batch_id || teams[0]?.batch_id))
                .map(m => ({
                  id: m.id,
                  name: m.title,
                  description: m.description,
                  type: m.mission_type === 'special' ? 'temporary' : m.mission_type,
                  score: m.points,
                  requires_approval: m.review_type !== 'auto',
                  requires_proof: m.review_type !== 'auto',
                  publish_time: m.publish_at,
                  start_time: m.publish_at,
                  end_time: m.deadline_at,
                  target_type: 'all',
                  target_team_id: null,
                  target_user_id: null,
                  batch_id: m.batch_id,
                  category: m.category,
                  max_completions: m.max_completions,
                  created_by: null,
                  created_at: m.created_at
                } as Task))
            ]}
            submissions={submissions}
            notes={notes}
            scoreLogs={scoreLogs}
            currentUserId={currentUser.id}
            onSaveNote={handleSaveNote}
            isSyncing={isSyncing}
            onRefresh={async () => { await fetchData(); }}
            onUpdateTeamSettings={handleUpdateTeamSettings}
            batches={batches}
            gmMode={gmMode}
            onReviewSubmission={handleReviewSubmission}
            squadRoles={squadRoles}
            onToggleCell={handleToggleCell}
            onUpdateProfile={handleUpdateProfile}
            showToast={showToast}
            onViewAsStudent={(id) => { setViewAsUserId(id); setViewCanOperate(false); setEditAccountOpen(false); setActiveTab('daily'); }}
          />
          </Suspense>
        )}

        {activeTab === 'admin' && currentUiRole === 'admin' && (
          <Suspense fallback={<DashboardLoading />}>
          <AdminDashboard
            profiles={profiles}
            teams={teams}
            tasks={tasks}
            submissions={submissions}
            courses={courses}
            achievements={achievements}
            announcements={announcements}
            pets={pets}
            userPets={userPets}
            cards={cards}
            decks={decks}
            deckCards={deckCards}
            userDecks={userDecks}
            batches={batches}
            missionTemplates={missionTemplates}
            batchMissionTemplates={batchMissionTemplates}
            petLines={petLines}
            petStages={petStages}
            onUpdatePetStage={handleUpdatePetStage}
            onUpdatePetLine={handleUpdatePetLine}
            onReviewSubmission={handleReviewSubmission}
            onCreateTask={handleCreateTask}
            onCreateTasksBulk={handleCreateTasksBulk}
            onDeleteTask={handleDeleteTask}
            onUpdateTask={handleUpdateTask}
            onAssignTeam={handleAssignTeam}
            onManualAdjustScore={handleManualAdjustScore}
            onCreateAnnouncement={handleCreateAnnouncement}
            onUpdateAnnouncement={handleUpdateAnnouncement}
            onDeleteAnnouncement={handleDeleteAnnouncement}
            onCreateCourse={handleCreateCourse}
            notes={notes}
            onSaveNote={handleSaveNote}
            currentUserId={currentUser?.id}
            onUpdateCourse={handleUpdateCourse}
            onDeleteCourse={handleDeleteCourse}
            onCreateAchievement={handleCreateAchievement}
            onUpdateAchievement={handleUpdateAchievement}
            onDeleteAchievement={handleDeleteAchievement}
            onCreatePet={handleCreatePet}
            onCreateCard={handleCreateCard}
            onCreateDeck={handleCreateDeck}
            onAwardPetSkin={handleAwardPetSkin}
            onLevelUpPet={handleLevelUpPet}
            onCreateBatch={handleCreateBatch}
            onUpdateBatch={handleUpdateBatch}
            onDeleteBatch={handleDeleteBatch}
            onCreateMissionTemplate={handleCreateMissionTemplate}
            onUpdateMissionTemplate={handleUpdateMissionTemplate}
            onDeleteMissionTemplate={handleDeleteMissionTemplate}
            onSaveBatchMissionTemplates={handleSaveBatchMissionTemplates}
            onGenerateMissions={handleGenerateMissions}
            missions={missions}
            onDeleteMission={handleDeleteMission}
            onUpdateMission={handleUpdateMission}
            onViewAsStudent={(id: string) => { setViewAsUserId(id); setViewCanOperate(false); setEditAccountOpen(false); setActiveTab('daily'); }}
            onAddProfile={handleAddProfile}
            onUpdateProfile={handleUpdateProfile}
            onDeleteProfile={handleDeleteProfile}
            onHardDeleteProfile={handleHardDeleteProfile}
            captainCandidates={captainCandidates}
            onAddCaptainCandidate={handleAddCaptainCandidate}
            onUpdateCaptainCandidate={handleUpdateCaptainCandidate}
            onDeleteCaptainCandidate={handleDeleteCaptainCandidate}
            squadRoles={squadRoles}
            onCreateSquadRole={handleCreateSquadRole}
            onUpdateSquadRole={handleUpdateSquadRole}
            onDeleteSquadRole={handleDeleteSquadRole}
            onUpdateTeamSettings={handleUpdateTeamSettings}
            onQuickAssignCaptain={handleQuickAssignCaptain}
            isSyncing={isSyncing}
            showToast={showToast}
          />
          </Suspense>
        )}
      </main>
      {/* Footer copyright select-none */}
      <footer className="w-full text-center py-6 border-t border-white/5 text-[10px] text-slate-600 uppercase font-mono select-none light:border-slate-200">
        © {new Date().getFullYear()} {BRAND.systemName} • 版權所有
      </footer>

      {/* Confetti styles injected dynamically */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes particleFade {
          0% {
            transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--tx), var(--ty), 0) scale(0) rotate(var(--rot)deg);
            opacity: 0;
          }
        }
        .confetti-particle {
          position: fixed;
          left: 50%;
          top: 40%;
          border-radius: 4px; /* confetti shapes */
          pointer-events: none;
          z-index: 9999;
          will-change: transform, opacity;
          animation: particleFade 1.3s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
        @keyframes scoreFloatUp {
          0% {
            transform: translate3d(-50%, 0, 0) scale(0.7);
            opacity: 0;
          }
          15% {
            transform: translate3d(-50%, -40px, 0) scale(1.2);
            opacity: 1;
          }
          85% {
            transform: translate3d(-50%, -120px, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate3d(-50%, -150px, 0) scale(0.8);
            opacity: 0;
          }
        }
        .score-float {
          position: fixed;
          left: 50%;
          top: 45%;
          font-family: inherit;
          font-weight: 900;
          font-size: 2.25rem;
          color: #fbbf24;
          text-shadow: 0 0 15px rgba(245, 158, 11, 0.8), 0 0 30px rgba(245, 158, 11, 0.4);
          pointer-events: none;
          z-index: 10000;
          will-change: transform, opacity;
          animation: scoreFloatUp 1.8s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
        }
      `}} />

      {/* Floating particles (Confetti) */}
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            width: `${p.size}px`,
            height: `${p.size * 1.5}px`, // rectangular confetti
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            ['--tx' as any]: p.tx,
            ['--ty' as any]: p.ty,
            ['--rot' as any]: p.rot,
          }}
        />
      ))}

      {/* Score Floating Animations */}
      {scoreFloats.map(sf => (
        <div key={sf.id} className="score-float">
          {sf.text}
        </div>
      ))}

      {/* Toasts Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-md shadow-2xl flex items-center gap-3 transition-all duration-300 animate-in slide-in-from-right-5 ${
              t.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-950/20'
                : t.type === 'info'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-amber-950/20'
                : 'bg-red-500/10 border-red-500/30 text-red-400 shadow-red-950/20'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 size={16} className="shrink-0" />}
            {t.type === 'info' && <Clock size={16} className="shrink-0" />}
            {t.type === 'error' && <AlertCircle size={16} className="shrink-0" />}
            <span className="text-xs font-black leading-snug">{t.message}</span>
          </div>
        ))}
      </div>

      {/* 🏆 成就解鎖即時通知彈窗 —— 等升級/進化彈窗都關掉後才跳(排最後、不重疊) */}
      {pendingAchievements.length > 0 && !questModalActive && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 modal-force-dark">
          {/* Luxury VIP-card Style Card */}
          <div className="relative w-full max-w-sm mx-4 p-8 rounded-[2.5rem] border border-amber-500/35 bg-gradient-to-br from-[#1c1917] via-[#0f0e0d] to-[#1c1917] shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.08),0_0_35px_rgba(245,158,11,0.15)] text-center space-y-6 select-none overflow-hidden animate-in zoom-in-95 duration-300">
            {/* VIP Card Ambient glows & Reflection ray */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-b from-amber-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-t from-orange-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_35%,rgba(245,158,11,0.08)_45%,rgba(255,255,255,0.05)_50%,rgba(245,158,11,0.08)_55%,transparent_65%)] pointer-events-none" />
            
            {/* Congratulations title */}
            <div className="space-y-1 relative z-10">
              <h4 className="text-[10px] font-black tracking-widest text-amber-500/80 uppercase">
                🎉 恭喜解鎖全新成就 🎉
              </h4>
              <h2 className="text-2xl font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {pendingAchievements[0].achievement?.title}
              </h2>
            </div>

            {/* Framed luxury collectible card container for badge */}
            <div className="relative w-44 h-44 mx-auto flex items-center justify-center bg-gradient-to-b from-[#23201d] to-[#0c0a09] border border-amber-500/20 rounded-2xl shadow-[inset_0_0_20px_rgba(245,158,11,0.2)] p-4 overflow-hidden relative z-10">
              {/* Card metallic corner brackets */}
              <div className="absolute top-2.5 left-2.5 w-2 h-2 border-t border-l border-amber-500/40" />
              <div className="absolute top-2.5 right-2.5 w-2 h-2 border-t border-r border-amber-500/40" />
              <div className="absolute bottom-2.5 left-2.5 w-2 h-2 border-b border-l border-amber-500/40" />
              <div className="absolute bottom-2.5 right-2.5 w-2 h-2 border-b border-r border-amber-500/40" />
              
              {/* Internal Halo */}
              <div className="absolute w-28 h-28 rounded-full bg-amber-500/10 blur-xl scale-110 animate-pulse pointer-events-none" />
              
              <div className="relative z-10">
                <BadgeIcon 
                  name={pendingAchievements[0].achievement?.icon_url || 'Trophy'} 
                  unlocked={true} 
                  size={96} 
                  className="transition-transform hover:scale-105" 
                />
              </div>
            </div>

            {/* Quote style Description Box */}
            <p className="text-xs text-amber-100/90 leading-relaxed max-w-[260px] mx-auto font-medium py-3.5 border-t border-b border-amber-500/15 italic relative z-10">
              「{pendingAchievements[0].achievement?.description}」
            </p>

            {/* Luxury Shimmer Button */}
            <button
              onClick={handleAcceptAchievementBlessing}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-slate-950 text-xs font-black shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:brightness-110 active:scale-98 transition-all cursor-pointer border border-amber-300/30 shimmer-btn relative z-10"
            >
              收下修煉祝福
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

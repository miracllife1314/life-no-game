'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, uploadProofImage, isRealSupabase } from '@/lib/supabase';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { 
  Profile, Team, Task, Submission, ScoreLog, SubmissionStatus,
  Course, CourseAttendance, Achievement, UserAchievement, 
  Announcement, StudentNote, UserRole,
  Pet, UserPet, Card, Deck, DeckCard, UserDeck, Batch, MissionTemplate, BatchMissionTemplate, Mission, PetLine, PetStage, CaptainCandidate, SquadRoleDef
} from '@/types';

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
import { CaptainDashboard } from '@/components/Captain/CaptainDashboard';
import { AdminDashboard } from '@/components/Admin/AdminDashboard';
import { WitnessTab } from '@/components/Tabs/WitnessTab';

export default function Home() {
  // --- Auth / User State ---
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [userEnrollments, setUserEnrollments] = useState<Profile[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [viewState, setViewState] = useState<'login' | 'register' | 'app'>('login');
  const [loadError, setLoadError] = useState(false);
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

  // --- Database States ---
  const [batches, setBatches] = useState<Batch[]>([]);
  const [missionTemplates, setMissionTemplates] = useState<MissionTemplate[]>([]);
  const [batchMissionTemplates, setBatchMissionTemplates] = useState<BatchMissionTemplate[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [attendance, setAttendance] = useState<CourseAttendance[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [scoreLogs, setScoreLogs] = useState<ScoreLog[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [userPets, setUserPets] = useState<UserPet[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckCards, setDeckCards] = useState<DeckCard[]>([]);
  const [userDecks, setUserDecks] = useState<UserDeck[]>([]);
  const [petLines, setPetLines] = useState<PetLine[]>([]);
  const [petStages, setPetStages] = useState<PetStage[]>([]);
  const [captainCandidates, setCaptainCandidates] = useState<CaptainCandidate[]>([]);
  const [squadRoles, setSquadRoles] = useState<SquadRoleDef[]>([]);

  // --- UI States ---
  const [activeTab, setActiveTab] = useState<TabKey>('daily');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSyncing, setIsSyncing] = useState(false);
  const [adminSelectedTeamId, setAdminSelectedTeamId] = useState<string>('');

  // --- Toast & Confetti Animations States ---
  interface ToastInfo {
    message: string;
    type: 'success' | 'info' | 'error';
    id: string;
  }
  interface Particle {
    id: string;
    size: number;
    color: string;
    angle: number;
    speed: number;
    delay: number;
    tx: string;
    ty: string;
    rot: string;
  }
  interface ScoreFloat {
    id: string;
    text: string;
  }

  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [scoreFloats, setScoreFloats] = useState<ScoreFloat[]>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const triggerConfetti = () => {
    const newParticles: Particle[] = Array.from({ length: 65 }).map((_, i) => {
      const angle = Math.random() * 360;
      const speed = Math.random() * 8 + 4;
      const tx = `${Math.cos(angle * Math.PI / 180) * speed * 22}vh`;
      const ty = `${Math.sin(angle * Math.PI / 180) * speed * 22}vh`;
      const rot = `${(Math.random() - 0.5) * 720}`;
      return {
        id: `${Date.now()}-${i}`,
        size: Math.random() * 8 + 4,
        color: ['#fbbf24', '#f59e0b', '#d97706', '#fef08a', '#fb7185', '#38bdf8', '#c084fc'][Math.floor(Math.random() * 7)],
        angle,
        speed,
        delay: Math.random() * 0.15,
        tx,
        ty,
        rot
      };
    });
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1500);
  };

  const triggerScoreFloat = (text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setScoreFloats(prev => [...prev, { text, id }]);
    setTimeout(() => {
      setScoreFloats(prev => prev.filter(sf => sf.id !== id));
    }, 1800);
  };

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

      // 2. Fetch standard tables —— 全部「平行」查詢，避免 24 次序列往返拖慢載入
      const [
        batchesRes, templatesRes, rulesRes, profilesRes, teamsRes, tasksRes,
        subsRes, coursesRes, attendanceRes, achsRes, userAchsRes, annsRes,
        notesRes, scoreLogsRes, petsRes, userPetsRes, cardsRes, decksRes,
        deckCardsRes, userDecksRes, missionsRes, petLinesRes, petStagesRes, candidatesRes, squadRolesRes
      ] = await Promise.all([
        supabase.from('batches').select('*'),
        supabase.from('mission_templates').select('*'),
        supabase.from('batch_mission_templates').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('teams').select('*'),
        supabase.from('tasks').select('*'),
        supabase.from('submissions').select('*'),
        supabase.from('courses').select('*'),
        supabase.from('course_attendance').select('*'),
        supabase.from('achievements').select('*'),
        supabase.from('user_achievements').select('*'),
        supabase.from('announcements').select('*'),
        supabase.from('student_notes').select('*'),
        supabase.from('score_logs').select('*'),
        supabase.from('pets').select('*'),
        supabase.from('user_pets').select('*'),
        supabase.from('cards').select('*'),
        supabase.from('decks').select('*'),
        supabase.from('deck_cards').select('*'),
        supabase.from('user_decks').select('*'),
        supabase.from('missions').select('*'),
        supabase.from('pet_lines').select('*'),
        supabase.from('pet_stages').select('*'),
        supabase.from('captain_candidates').select('*'),
        supabase.from('squad_roles').select('*').order('created_at', { ascending: true }),
      ]);
      const batchesList = batchesRes.data;
      const templatesList = templatesRes.data;
      const rulesList = rulesRes.data;
      const profilesList = profilesRes.data;
      const teamsList = teamsRes.data;
      const tasksList = tasksRes.data;
      const subsList = subsRes.data;
      const coursesList = coursesRes.data;
      const attendanceList = attendanceRes.data;
      const achsList = achsRes.data;
      const userAchsList = userAchsRes.data;
      const annsList = annsRes.data;
      const notesList = notesRes.data;
      const scoreLogsList = scoreLogsRes.data;
      const petsList = petsRes.data;
      const userPetsList = userPetsRes.data;
      const cardsList = cardsRes.data;
      const decksList = decksRes.data;
      const deckCardsList = deckCardsRes.data;
      const userDecksList = userDecksRes.data;
      const missionsList = missionsRes.data;
      const petLinesList = petLinesRes.data;
      const petStagesList = petStagesRes.data;
      const candidatesList = candidatesRes.data;
      const squadRolesList = squadRolesRes.data;

      if (batchesList) setBatches(batchesList);
      if (templatesList) setMissionTemplates(templatesList);
      if (rulesList) setBatchMissionTemplates(rulesList);
      let mappedProfiles: any[] = [];
      if (profilesList) {
        mappedProfiles = profilesList.map((p: any) => {
          const profile_id = p.profile_id || p.id;
          if (p.role !== 'admin' && !p.batch_id) {
            return { ...p, batch_id: 'batch-50', profile_id };
          }
          return { ...p, profile_id };
        });
        setProfiles(mappedProfiles);

        const activeProfile = loadedProfile || currentUser;
        if (activeProfile) {
          const enrolls = mappedProfiles.filter((p: any) =>
            (activeProfile.phone && p.phone === activeProfile.phone) ||
            (!activeProfile.phone && p.name === activeProfile.name)
          );
          setUserEnrollments(enrolls);
        } else {
          setUserEnrollments([]);
        }
      }

      if (teamsList) setTeams(teamsList);
      if (tasksList) setTasks(tasksList);
      if (subsList) setSubmissions(subsList);

      // 任務一律由後台「產生任務」明確發布（含 4 個隱藏的進化任務）。
      // 不再於載入頁面時寫入 DB —— 那會在多人同時開啟時造成任務重複、並拖慢載入。
      const finalMissions = missionsList || [];

      // ---- 在 JS 端補上巢狀關聯（真實 PostgREST 不會自動 embed）----
      const profArr: any[] = mappedProfiles;
      const attachUserPet = (up: any) => {
        const stage = petStagesList?.find(
          (s: any) => s.line_key === up.pet_line && s.stage_index === up.current_stage_index
        ) || null;
        return {
          ...up,
          stage,
          pet: stage ? {
            id: stage.id,
            name: stage.stage_name,
            description: stage.description,
            image_url: stage.image_url,
            evolution_image_url: stage.image_url,
            unlock_score_threshold: (stage.min_level || 0) * 500,
            created_at: stage.created_at
          } : null,
          profile: profArr.find((p: any) => p.id === up.student_id)
        };
      };

      const joinedMissions = finalMissions.map((m: any) => ({
        ...m,
        batch: batchesList?.find((b: any) => b.id === m.batch_id),
        template: templatesList?.find((t: any) => t.id === m.template_id)
      }));
      const joinedSubs = (subsList || []).map((sub: any) => ({
        ...sub,
        mission: joinedMissions.find((m: any) => m.id === sub.mission_id),
        profile: profArr.find((p: any) => p.id === sub.student_id)
      }));
      const joinedAttendance = (attendanceList || []).map((att: any) => ({
        ...att,
        course: coursesList?.find((c: any) => c.id === att.course_id),
        profile: profArr.find((p: any) => p.id === att.student_id)
      }));
      const joinedUserAchs = (userAchsList || []).map((ua: any) => ({
        ...ua,
        achievement: achsList?.find((a: any) => a.id === ua.achievement_id)
      }));
      const joinedNotes = (notesList || []).map((sn: any) => ({
        ...sn,
        student: profArr.find((p: any) => p.id === sn.student_id)
      }));
      const joinedRules = (rulesList || []).map((bmt: any) => ({
        ...bmt,
        batch: batchesList?.find((b: any) => b.id === bmt.batch_id),
        template: templatesList?.find((t: any) => t.id === bmt.template_id)
      }));
      const joinedDeckCards = (deckCardsList || []).map((dc: any) => ({
        ...dc,
        card: cardsList?.find((c: any) => c.id === dc.card_id)
      }));
      const joinedUserDecks = (userDecksList || []).map((ud: any) => ({
        ...ud,
        deck: decksList?.find((d: any) => d.id === ud.deck_id)
      }));
      const joinedUserPets = (userPetsList || []).map(attachUserPet);

      setMissions(joinedMissions);
      setBatchMissionTemplates(joinedRules);
      setSubmissions(joinedSubs);
      setAttendance(joinedAttendance);
      setUserAchievements(joinedUserAchs);
      setNotes(joinedNotes);
      setUserPets(joinedUserPets);
      setDeckCards(joinedDeckCards);
      setUserDecks(joinedUserDecks);
      // 依 sort_order 排序（數字小在前）；未設定者視為 0。欄位尚未建立時 ?? 0 也不會壞
      if (coursesList) setCourses([...coursesList].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
      if (achsList) setAchievements(achsList);
      if (annsList) setAnnouncements(annsList);
      if (scoreLogsList) setScoreLogs(scoreLogsList);
      if (petsList) setPets(petsList);
      if (cardsList) setCards(cardsList);
      if (decksList) setDecks(decksList);
      if (petLinesList) setPetLines(petLinesList);
      if (petStagesList) setPetStages(petStagesList);
      if (candidatesList) setCaptainCandidates(candidatesList);
      if (squadRolesList) setSquadRoles(squadRolesList);

      // 小隊長候選：依 profile_id 帶出姓名/手機/曾參與期數/曾擔任角色
      const roleLabel = (r: string) => r === 'captain' ? '小隊長' : r === 'admin' ? '大隊長' : '學員';
      const joinedCandidates = (candidatesList || []).map((c: any) => {
        const personRows = profArr.filter((p: any) => p.profile_id === c.profile_id);
        const base = personRows[0] || profArr.find((p: any) => p.id === c.profile_id) || null;
        const cohorts = Array.from(new Set(
          personRows.map((p: any) => batchesList?.find((b: any) => b.id === p.batch_id)?.name).filter(Boolean)
        ));
        const roles = Array.from(new Set(
          personRows.filter((p: any) => p.role && p.role !== 'student').map((p: any) => roleLabel(p.role))
        ));
        return { ...c, name: base?.name, phone: base?.phone, past_cohorts: cohorts, past_roles: roles };
      });
      setCaptainCandidates(joinedCandidates);
      
      return loadedProfile;
    } catch (err) {
      console.error('Error fetching data:', err);
      setLoadError(true);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser?.id]);

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
          const { data: profilesList } = await supabase.from('profiles').select('*');
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
  const handleLogin = async (name: string, phone: string) => {
    setIsSyncing(true);
    try {
      // 需「姓名」與「手機號碼」兩者都吻合才能登入
      const safeName = (name || '').trim();
      const safePhone = (phone || '').trim();
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('name', safeName)
        .eq('phone', safePhone)
        .limit(1)
        .maybeSingle();

      if (error || !profile) {
        throw new Error('姓名與手機號碼不符，請再確認後重試');
      }

      // 記住登入身分，設定單次重整標記，整合至個人面板切換時統一重整
      if (typeof window !== 'undefined') {
        localStorage.setItem('nlp_mock_user_id', profile.id);
        localStorage.setItem('nlp_need_pet_refresh', 'true');
      }

      setViewState('app');
      const loadedProfile = await fetchData(profile.id);
      if (loadedProfile && loadedProfile.role === 'admin') {
        setActiveTab('admin');
      } else {
        setActiveTab('daily');
      }
    } catch (err: any) {
      setIsSyncing(false);
      throw new Error(err.message || '登入失敗');
    }
  };

  useEffect(() => {
    if (teams.length > 0 && !adminSelectedTeamId) {
      setAdminSelectedTeamId(teams[0].id);
    }
  }, [teams, adminSelectedTeamId]);

  useEffect(() => {
    if (activeTab === 'daily' && currentUser && typeof window !== 'undefined') {
      const needRefresh = localStorage.getItem('nlp_need_pet_refresh');
      if (needRefresh === 'true') {
        localStorage.removeItem('nlp_need_pet_refresh');
        window.location.reload();
      }
    }
  }, [activeTab, currentUser?.id, currentUser?.batch_id]);

  const handleRegister = async (regData: { name: string; phone: string; role: UserRole }) => {
    setIsSyncing(true);

    // 防呆：同「姓名+手機」若已存在，不可重複註冊（避免產生重複帳號、破壞多期相連）
    const safeName = (regData.name || '').trim();
    const safePhone = (regData.phone || '').trim();
    const { data: existingPerson } = await supabase
      .from('profiles')
      .select('id')
      .eq('name', safeName)
      .eq('phone', safePhone)
      .limit(1);
    if (existingPerson && existingPerson.length > 0) {
      setIsSyncing(false);
      throw new Error('此姓名與手機已經註冊過了。若要加入新的一期，請改用「登入」，登入後再點一次邀請連結即可加入。');
    }

    let batch_id: string | null = null;
    let team_id: string | null = null;
    let captain_id: string | null = null;

    if (inviteCode) {
      const params = new URLSearchParams(window.location.search);
      const urlBatch = params.get('batch') || '';
      const urlTeam = params.get('team') || '';
      const { data: teamsList } = await supabase.from('teams').select('*');
      const team = teamsList?.find((t: any) => t.invite_code === inviteCode && t.batch_id === urlBatch && t.id === urlTeam);
      if (team) {
        batch_id = team.batch_id || 'batch-50';
        team_id = team.id;
        captain_id = team.captain_id;
      }
    }

    // 本系統不走 Supabase Auth：直接在 profiles 建立一筆報名列（id 與 profile_id 同值＝新的人）
    const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `usr-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const { error } = await supabase.from('profiles').insert({
      id: newId,
      profile_id: newId,
      name: safeName,
      phone: safePhone,
      role: regData.role,
      batch_id,
      team_id,
      captain_id,
      score: 0,
      status: 'active',
      created_at: new Date().toISOString()
    });

    if (error) {
      setIsSyncing(false);
      throw new Error(error.message);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('nlp_mock_user_id', newId);
      localStorage.setItem('nlp_need_pet_refresh', 'true');
    }
    setViewState('app');
    setActiveTab('daily');
    setInviteCode('');
    setInvitedTeamName('');
    setInvitedCaptainName('');
    setInviteError('');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    await fetchData(newId);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nlp_session');
      localStorage.removeItem('nlp_mock_user_id');
    }
    setCurrentUser(null);
    setCurrentTeam(null);
    setViewState('login');
    setGmMode(false);
    setActiveTab('daily');
  };

  const handleSwitchCohort = async (batchId: string) => {
    const nextEnrollment = userEnrollments.find(e => e.batch_id === batchId);
    if (nextEnrollment) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('nlp_session', JSON.stringify(nextEnrollment));
        localStorage.setItem('nlp_mock_user_id', nextEnrollment.id);
        localStorage.setItem('nlp_need_pet_refresh', 'true');
      }
      await fetchData(nextEnrollment.id);
    }
  };

  // --- Student Actions ---
  const handleCheckIn = async (taskId: string, proofText?: string, proofImg?: string, proofLink?: string, shareToWitness?: boolean) => {
    if (!currentUser) return;

    // 先在 tasks 找，找不到再去 missions 找（期數任務）
    const task = tasks.find(t => t.id === taskId);
    const mission = !task ? missions.find(m => m.id === taskId) : null;

    if (!task && !mission) return;

    const requiresApproval = task ? task.requires_approval : mission!.review_type !== 'auto';
    const points = task ? task.score : mission!.points;
    const title = task ? task.name : mission!.title;

    // 防連點：同一任務正在送出時，忽略重複觸發
    if (checkInLock.current.has(taskId)) return;
    // 防重複打卡：已達可完成次數就擋下（避免重複加分）。
    // max_completions：null/未設 → 1 次；0（或負數）→ 無限次（與畫面、隊長端一致）
    const maxCompletions = (task ? task.max_completions : mission!.max_completions) ?? 1;
    const completionLimit = maxCompletions <= 0 ? Infinity : maxCompletions;
    const priorCount = submissions.filter(
      s => s.mission_id === taskId && s.student_id === currentUser.id && s.status !== 'rejected'
    ).length;
    if (priorCount >= completionLimit) {
      showToast('這個任務已經完成囉，不用重複打卡 😊', 'info');
      return;
    }
    checkInLock.current.add(taskId);

    const submissionData = {
      id: crypto.randomUUID(),
      mission_id: taskId,
      student_id: currentUser.id,
      proof_text: proofText || '免證明直接簽到',
      proof_image_url: proofImg || null,
      proof_link: proofLink || null,
      status: (requiresApproval ? 'pending' : 'approved') as SubmissionStatus,
      score_awarded: requiresApproval ? 0 : points,
      reviewed_by: null,       // must be UUID or null; 'admin1' is not valid
      reviewed_at: requiresApproval ? null : new Date().toISOString(),
      // 只有「需審核」的提交、且學員勾選分享時才上見證牆；自動簽到一律不上牆
      share_to_witness: requiresApproval && !!shareToWitness,
      created_at: new Date().toISOString()
    };

    if (gmMode) {
      const mockSubId = `mock-sub-${Date.now()}`;
      const newSub: Submission = {
        id: mockSubId,
        mission_id: taskId,
        student_id: currentUser.id,
        proof_text: proofText || '免證明直接簽到',
        proof_image_url: proofImg || null,
        proof_link: proofLink || null,
        status: (requiresApproval ? 'pending' : 'approved') as SubmissionStatus,
        score_awarded: requiresApproval ? 0 : points,
        reviewed_by: null,
        reviewed_at: requiresApproval ? null : new Date().toISOString(),
        created_at: new Date().toISOString(),
        profile: currentUser,
        mission: mission || undefined
      };
      setSubmissions(prev => [newSub, ...prev]);

      if (!requiresApproval) {
        const nextScore = currentUser.score + points;
        const nextUser = { ...currentUser, score: nextScore };
        setCurrentUser(nextUser);
        setProfiles(prev => prev.map(p => p.id === currentUser.id ? nextUser : p));

        setUserPets(prev => prev.map(up => {
          if (up.student_id === currentUser.id) {
            const nextExp = up.total_exp + points;
            const nextLv = Math.floor(nextExp / 500);
            return {
              ...up,
              total_exp: nextExp,
              level: nextLv,
              updated_at: new Date().toISOString()
            };
          }
          return up;
        }));

        const newLog: ScoreLog = {
          id: `mock-log-${Date.now()}`,
          student_id: currentUser.id,
          amount: points,
          reason: `完成任務: ${title}`,
          submission_id: mockSubId,
          created_by: 'admin1',
          created_at: new Date().toISOString(),
          profile: currentUser
        };
        setScoreLogs(prev => [newLog, ...prev]);
      }

      if (requiresApproval) {
        showToast('✓ 證明已成功送出！等待小隊長審核中...', 'info');
      } else {
        showToast(`✓ 打卡成功！獲得 +${points} 經驗！`, 'success');
        triggerConfetti();
        triggerScoreFloat(`+${points} 經驗！`);
      }
      checkInLock.current.delete(taskId);
      return;
    }

    try {
      // 證明圖片若為 base64，先上傳到 Storage 換成公開 URL（避免把大圖塞進 DB 欄位）
      const uploadedImg = await uploadProofImage(submissionData.proof_image_url);
      const { error: insertError } = await supabase
        .from('submissions')
        .insert({ ...submissionData, proof_image_url: uploadedImg });
      if (insertError) {
        console.error('[CheckIn] submissions insert error:', insertError);
        showToast(`❌ 打卡失敗：${insertError.message}`, 'error');
        return;
      }
      // 樂觀更新 UI (Optimistic Update)
      if (!requiresApproval) {
        const nextScore = currentUser.score + points;
        const nextUser = { ...currentUser, score: nextScore };
        setCurrentUser(nextUser);
        setProfiles(prev => prev.map(p => p.id === currentUser.id ? nextUser : p));

        setUserPets(prev => prev.map(up => {
          if (up.student_id === currentUser.id) {
            const nextExp = up.total_exp + points;
            const nextLv = Math.floor(nextExp / 500);
            return {
              ...up,
              total_exp: nextExp,
              level: nextLv,
              updated_at: new Date().toISOString()
            };
          }
          return up;
        }));
      }

      // Trigger success animations and toasts IMMEDIATELY
      if (requiresApproval) {
        showToast('✓ 證明已成功送出！等待小隊長審核中...', 'info');
      } else {
        showToast(`✓ 打卡成功！獲得 +${points} 經驗！`, 'success');
        triggerConfetti();
        triggerScoreFloat(`+${points} 經驗！`);
      }

      // 讓畫面先反應，背後慢慢重抓資料 (不阻擋 async return)
      fetchData().catch(console.error);

    } catch (err: any) {
      console.error('[CheckIn] unexpected error:', err);
      showToast(`❌ 打卡失敗：${err?.message || '未知錯誤'}`, 'error');
    } finally {
      // 無論成功或失敗都解除鎖，讓使用者之後仍可正常操作（例如多次可完成的任務）
      checkInLock.current.delete(taskId);
    }
  };

  const handleRegisterCourse = async (courseId: string) => {
    if (!currentUser) return;

    if (gmMode) {
      const newAtt: CourseAttendance = {
        id: `mock-att-${Date.now()}`,
        course_id: courseId,
        student_id: currentUser.id,
        status: 'registered',
        attended_at: null,
        created_at: new Date().toISOString()
      };
      setAttendance(prev => [newAtt, ...prev]);
      return;
    }

    await supabase.from('course_attendance').insert({
      course_id: courseId,
      student_id: currentUser.id,
      status: 'registered',
      attended_at: null
    });
    await fetchData();
  };

  // --- Captain Actions ---
  const handleSaveNote = async (studentId: string, noteText: string) => {
    if (!currentUser) return;

    if (gmMode) {
      const existing = notes.find(n => n.student_id === studentId && n.captain_id === currentUser.id);
      if (existing) {
        setNotes(prev => prev.map(n => n.id === existing.id ? { ...n, note: noteText, updated_at: new Date().toISOString() } : n));
      } else {
        const newNote: StudentNote = {
          id: `mock-note-${Date.now()}`,
          student_id: studentId,
          captain_id: currentUser.id,
          note: noteText,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          student: profiles.find(p => p.id === studentId)
        };
        setNotes(prev => [newNote, ...prev]);
      }
      return;
    }
    
    // Check if note already exists
    const existing = notes.find(n => n.student_id === studentId && n.captain_id === currentUser.id);
    
    if (existing) {
      await supabase
        .from('student_notes')
        .update({ note: noteText, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('student_notes').insert({
        student_id: studentId,
        captain_id: currentUser.id,
        note: noteText,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    await fetchData();
  };

  // --- Admin Actions ---
  const handleReviewSubmission = async (submissionId: string, status: 'approved' | 'rejected', shareToWitness?: boolean) => {
    if (!currentUser) return;

    if (gmMode) {
      const sub = submissions.find(s => s.id === submissionId);
      if (!sub) return;

      const task = tasks.find(t => t.id === sub.mission_id);
      const mission = !task ? missions.find(m => m.id === sub.mission_id) : null;
      const points = status === 'approved' ? (task ? task.score : (mission ? mission.points : 0)) : 0;
      const title = task ? task.name : (mission ? mission.title : '任務');

      let scoreDiff = 0;
      if (sub.status === 'approved' && status !== 'approved') {
        scoreDiff = -sub.score_awarded;
      } else if (sub.status !== 'approved' && status === 'approved') {
        scoreDiff = points;
      }

      setSubmissions(prev => prev.map(s => s.id === submissionId ? {
        ...s,
        status,
        score_awarded: status === 'approved' ? (sub.score_awarded || points) : 0,
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString()
      } : s));

      if (scoreDiff !== 0) {
        setProfiles(prev => prev.map(p => {
          if (p.id === sub.student_id) {
            const nextScore = p.score + scoreDiff;
            if (currentUser && p.id === currentUser.id) {
              setCurrentUser(prevUser => prevUser ? { ...prevUser, score: nextScore } : null);
            }
            return { ...p, score: nextScore };
          }
          return p;
        }));

        setUserPets(prev => prev.map(up => {
          if (up.student_id === sub.student_id) {
            const nextExp = up.total_exp + scoreDiff;
            const nextLv = Math.floor(nextExp / 500);
            return { ...up, total_exp: nextExp, level: nextLv, updated_at: new Date().toISOString() };
          }
          return up;
        }));

        const newLog: ScoreLog = {
          id: `mock-log-${Date.now()}`,
          student_id: sub.student_id,
          amount: scoreDiff,
          reason: scoreDiff > 0 ? `完成任務: ${title}` : `取消已核准任務: ${title}`,
          submission_id: submissionId,
          created_by: currentUser.id,
          created_at: new Date().toISOString(),
          profile: profiles.find(p => p.id === sub.student_id)
        };
        setScoreLogs(prev => [newLog, ...prev]);
      }
      return;
    }

    // 審核通過時要把 score_awarded 設成該任務分數，計分觸發器才會加分（提交時為 0）
    const sub = submissions.find(s => s.id === submissionId);
    const task = sub ? tasks.find(t => t.id === sub.mission_id) : null;
    const mission = sub && !task ? missions.find(m => m.id === sub.mission_id) : null;
    const points = task ? task.score : (mission ? mission.points : 0);

    const updatePayload: any = {
      status,
      reviewed_by: currentUser.id,
      reviewed_at: new Date().toISOString(),
      // 通過：給該任務分數（自訂貼文等查不到任務則為 0）；退回：0
      score_awarded: status === 'approved' ? points : 0,
      // 審核者通過時可決定是否上見證牆；退回則一律不上牆
      share_to_witness: status === 'approved' ? !!shareToWitness : false,
    };
    await supabase
      .from('submissions')
      .update(updatePayload)
      .eq('id', submissionId);
    await fetchData();
  };

  const handleToggleCell = async (studentId: string, taskId: string) => {
    if (!currentUser) return;
    const dbTask = tasks.find(t => t.id === taskId);
    const mission = !dbTask ? missions.find(m => m.id === taskId) : null;
    if (!dbTask && !mission) return;
    
    const task = dbTask || {
      id: mission!.id,
      name: mission!.title,
      score: mission!.points,
      requires_approval: mission!.review_type !== 'auto',
      max_completions: mission!.max_completions
    } as any;
    
    const limit = task.max_completions ?? 1;
    const studentSubs = submissions.filter(s => s.mission_id === taskId && s.student_id === studentId);
    
    const pendingSubs = studentSubs.filter(s => s.status === 'pending');
    const approvedSubs = studentSubs.filter(s => s.status === 'approved');
    
    const sortedPending = [...pendingSubs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const sortedApproved = [...approvedSubs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    if (gmMode) {
      if (sortedPending.length > 0) {
        const targetSub = sortedPending[0];
        setSubmissions(prev => prev.map(s => s.id === targetSub.id ? {
          ...s,
          status: 'approved',
          score_awarded: task.score,
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString()
        } : s));
        setProfiles(prev => prev.map(p => {
          if (p.id === studentId) {
            const nextScore = p.score + task.score;
            if (p.id === currentUser.id) {
              setCurrentUser(prevUser => prevUser ? { ...prevUser, score: nextScore } : null);
            }
            return { ...p, score: nextScore };
          }
          return p;
        }));
        setUserPets(prev => prev.map(up => {
          if (up.student_id === studentId) {
            const nextExp = up.total_exp + task.score;
            const nextLv = Math.floor(nextExp / 500);
            return { ...up, total_exp: nextExp, level: nextLv, updated_at: new Date().toISOString() };
          }
          return up;
        }));
        const newLog: ScoreLog = {
          id: `mock-log-${Date.now()}`,
          student_id: studentId,
          amount: task.score,
          reason: `完成任務: ${task.name}`,
          submission_id: targetSub.id,
          created_by: currentUser.id,
          created_at: new Date().toISOString(),
          profile: profiles.find(p => p.id === studentId)
        };
        setScoreLogs(prev => [newLog, ...prev]);
      } else if (limit === 0 || approvedSubs.length < limit) {
        const mockSubId = `mock-sub-${Date.now()}`;
        const newSub: Submission = {
          id: mockSubId,
          mission_id: taskId,
          student_id: studentId,
          proof_text: '由小隊長於指揮所手動設定打卡',
          proof_image_url: null,
          proof_link: null,
          status: 'approved',
          score_awarded: task.score,
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          profile: profiles.find(p => p.id === studentId),
          mission: undefined
        };
        setSubmissions(prev => [newSub, ...prev]);
        setProfiles(prev => prev.map(p => {
          if (p.id === studentId) {
            const nextScore = p.score + task.score;
            if (p.id === currentUser.id) {
              setCurrentUser(prevUser => prevUser ? { ...prevUser, score: nextScore } : null);
            }
            return { ...p, score: nextScore };
          }
          return p;
        }));
        setUserPets(prev => prev.map(up => {
          if (up.student_id === studentId) {
            const nextExp = up.total_exp + task.score;
            const nextLv = Math.floor(nextExp / 500);
            return { ...up, total_exp: nextExp, level: nextLv, updated_at: new Date().toISOString() };
          }
          return up;
        }));
        const newLog: ScoreLog = {
          id: `mock-log-${Date.now()}`,
          student_id: studentId,
          amount: task.score,
          reason: `完成任務: ${task.name}`,
          submission_id: mockSubId,
          created_by: currentUser.id,
          created_at: new Date().toISOString(),
          profile: profiles.find(p => p.id === studentId)
        };
        setScoreLogs(prev => [newLog, ...prev]);
      } else {
        const targetSub = sortedApproved[0];
        setSubmissions(prev => prev.filter(s => s.id !== targetSub.id));
        setProfiles(prev => prev.map(p => {
          if (p.id === studentId) {
            const nextScore = p.score - targetSub.score_awarded;
            if (p.id === currentUser.id) {
              setCurrentUser(prevUser => prevUser ? { ...prevUser, score: nextScore } : null);
            }
            return { ...p, score: nextScore };
          }
          return p;
        }));
        setUserPets(prev => prev.map(up => {
          if (up.student_id === studentId) {
            const nextExp = up.total_exp - targetSub.score_awarded;
            const nextLv = Math.floor(nextExp / 500);
            return { ...up, total_exp: nextExp, level: nextLv, updated_at: new Date().toISOString() };
          }
          return up;
        }));
        const newLog: ScoreLog = {
          id: `mock-log-${Date.now()}`,
          student_id: studentId,
          amount: -targetSub.score_awarded,
          reason: `取消已核准任務: ${task.name}`,
          submission_id: targetSub.id,
          created_by: currentUser.id,
          created_at: new Date().toISOString(),
          profile: profiles.find(p => p.id === studentId)
        };
        setScoreLogs(prev => [newLog, ...prev]);
      }
      return;
    }

    try {
      if (sortedPending.length > 0) {
        await supabase.from('submissions').update({
          status: 'approved',
          score_awarded: task.score,
          reviewed_by: currentUser.id,
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
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      } else {
        await supabase.from('submissions').delete().eq('id', sortedApproved[0].id);
      }
      await fetchData();
    } catch (err) {
      console.error('Error toggling cell:', err);
    }
  };

  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'created_by'>) => {
    if (!currentUser) return;
    await supabase.from('tasks').insert({
      id: crypto.randomUUID(),
      ...taskData,
      created_by: currentUser.id,
      created_at: new Date().toISOString()
    });
    await fetchData();
  };

  const handleDeleteTask = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId);
    await fetchData();
  };

  const handleAddProfile = async (profileData: { name: string; phone: string; role: UserRole; batchId: string; teamId: string; divisionName?: string | null; directorId?: string | null }) => {
    setIsSyncing(true);
    
    // Check if phone number is already registered in this batch
    const { data: profilesList } = await supabase.from('profiles').select('*');
    const duplicatePhone = profileData.phone && profilesList?.some((p: any) => p.phone === profileData.phone && p.batch_id === profileData.batchId);
    if (duplicatePhone) {
      setIsSyncing(false);
      throw new Error('此手機號碼在同一個期數中已重複註冊');
    }

    const { data: teamsList } = await supabase.from('teams').select('*');
    const team = teamsList?.find((t: any) => t.id === profileData.teamId);
    const captain_id = team ? team.captain_id : null;

    const { error } = await supabase.from('profiles').insert({
      name: profileData.name,
      phone: profileData.phone,
      role: profileData.role,
      batch_id: profileData.batchId,
      team_id: profileData.teamId || null,
      captain_id,
      division_name: profileData.role === 'admin' ? profileData.divisionName || null : null,
      director_id: profileData.role === 'captain' ? profileData.directorId || null : null,
      score: 0,
      created_at: new Date().toISOString()
    });

    if (error) {
      setIsSyncing(false);
      throw new Error(error.message || '新增修行者失敗');
    }

    await fetchData();
  };

  const handleUpdateProfile = async (profileId: string, updates: Partial<Profile>) => {
    setIsSyncing(true);
    try {
      const allowedUpdates = [
        'name', 'phone', 'role', 'team_id', 'batch_id', 'score', 
        'division_name', 'director_id', 'status', 'squad_role'
      ];
      const cleanUpdates: any = {};
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) cleanUpdates[key] = updates[key as keyof Profile];
      });
      // 換隊時同步「所屬隊長」，避免學員仍掛在舊隊長底下（換到無隊長的隊則清空）
      if ('team_id' in cleanUpdates) {
        const newTeam = teams.find(t => t.id === cleanUpdates.team_id);
        cleanUpdates.captain_id = newTeam?.captain_id ?? null;
      }
      const { error } = await supabase.from('profiles').update(cleanUpdates).eq('id', profileId);
      if (error) throw new Error(error.message);
      await fetchData();
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    // Soft delete: set status to 'inactive' to preserve past records
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('profiles').update({ status: 'inactive' }).eq('id', profileId);
      if (error) throw new Error(error.message);
      await fetchData();
    } catch (err) {
      console.error('Error deactivating profile:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleHardDeleteProfile = async (profileId: string) => {
    // Hard delete: actually remove the record from database
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', profileId);
      if (error) throw new Error(error.message);
      await fetchData();
    } catch (err) {
      console.error('Error hard deleting profile:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateTeamSettings = async (teamId: string, settings: Partial<Team>) => {
    setIsSyncing(true);
    if (gmMode) {
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, ...settings } : t));
      if (currentTeam && currentTeam.id === teamId) {
        setCurrentTeam(prev => prev ? { ...prev, ...settings } : null);
      }
      setIsSyncing(false);
      return;
    }
    try {
      await supabase.from('teams').update(settings).eq('id', teamId);

      // 指派小隊長時：確保該隊長在「這個梯次」有一筆 captain 報名（支援跨期小隊長）。
      // 否則只設了 teams.captain_id，本人沒有該期報名 → 登入後看不到也管不了這一隊。
      if ('captain_id' in settings && settings.captain_id) {
        const team = teams.find(t => t.id === teamId);
        const batchId = team?.batch_id || null;
        const capProfileId = settings.captain_id;
        if (batchId) {
          const existing = profiles.find(p => p.profile_id === capProfileId && p.batch_id === batchId);
          if (existing) {
            // 已有該期報名 → 設為小隊長並綁到此隊
            await supabase.from('profiles').update({ role: 'captain', team_id: teamId }).eq('id', existing.id);
          } else {
            // 該期還沒有報名 → 用同一人(其他期)的資料，新增一筆「隊長報名」(同 profile_id)
            const anyProfile = profiles.find(p => p.profile_id === capProfileId);
            if (anyProfile) {
              const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
                ? crypto.randomUUID()
                : `usr-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
              await supabase.from('profiles').insert({
                id: newId,
                profile_id: capProfileId,
                name: anyProfile.name,
                phone: anyProfile.phone,
                role: 'captain',
                batch_id: batchId,
                team_id: teamId,
                score: 0,
                status: 'active',
                created_at: new Date().toISOString()
              });
            }
          }
        }
      }

      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAssignTeam = async (
    studentId: string, 
    teamId: string | null, 
    role: UserRole, 
    batchId?: string | null,
    divisionName?: string | null,
    directorId?: string | null,
    status?: 'active' | 'ended' | 'inactive'
  ) => {
    const updateData: any = { 
      team_id: teamId, 
      role: role,
      division_name: role === 'admin' ? divisionName || null : null,
      director_id: role === 'captain' ? directorId || null : null
    };
    if (batchId !== undefined) {
      updateData.batch_id = batchId;
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', studentId);
    await fetchData();
  };

  const handleCreateSquadRole = async (data: Omit<SquadRoleDef, "id" | "created_at">) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from("squad_roles").insert([data]);
      if (error) throw error;
      await fetchData();
      showToast("成功新增小隊職責", "success");
    } catch (err: any) {
      console.error("Error creating squad role:", err);
      showToast(err.message || "新增失敗", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateSquadRole = async (id: string, updates: Partial<SquadRoleDef>) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from("squad_roles").update(updates).eq("id", id);
      if (error) throw error;
      await fetchData();
      showToast("成功更新小隊職責", "success");
    } catch (err: any) {
      console.error("Error updating squad role:", err);
      showToast(err.message || "更新失敗", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteSquadRole = async (id: string) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from("squad_roles").delete().eq("id", id);
      if (error) throw error;
      await fetchData();
      showToast("成功刪除小隊職責", "success");
    } catch (err: any) {
      console.error("Error deleting squad role:", err);
      showToast(err.message || "刪除失敗", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddCaptainCandidate = async (profileId: string, status: 'eligible' | 'paused' | 'disabled') => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('captain_candidates').insert({ profile_id: profileId, status });
      if (error) throw new Error(error.message);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || '新增小隊長候選人失敗');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateCaptainCandidate = async (candidateId: string, status: 'eligible' | 'paused' | 'disabled') => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('captain_candidates').update({ status }).eq('id', candidateId);
      if (error) throw new Error(error.message);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || '更新小隊長狀態失敗');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteCaptainCandidate = async (candidateId: string) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('captain_candidates').delete().eq('id', candidateId);
      if (error) throw new Error(error.message);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || '移出小隊長候選人失敗');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleQuickAssignCaptain = async (
    batchId: string,
    captainProfileId: string,
    teamId: string,
    directorId: string | null
  ) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('teams').update({ captain_id: captainProfileId }).eq('id', teamId);
      if (error) throw new Error(error.message);
      
      const { data: profilesList } = await supabase.from('profiles').select('*');
      const capEnrollment = profilesList?.find((p: any) => p.profile_id === captainProfileId && p.batch_id === batchId);
      if (capEnrollment) {
        const { error: assignErr } = await supabase
          .from('profiles')
          .update({ director_id: directorId })
          .eq('id', capEnrollment.id);
        if (assignErr) throw new Error(assignErr.message);
      }
      
      await fetchData();
      alert('⚡ 小隊長指派與大隊長綁定設定成功！');
    } catch (err: any) {
      console.error(err);
      alert(err.message || '指派小隊長失敗');
    } finally {
      setIsSyncing(false);
    }
  };

  const getChineseNumber = (n: number) => {
    const chineseNums = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
    return chineseNums[n] || n.toString();
  };

  const handleCreateBatch = async (batchData: Omit<Batch, 'id' | 'created_at' | 'updated_at'>, teamCount?: number) => {
    const batchId = 'batch-' + Math.random().toString(36).substring(2, 9);
    await supabase.from('batches').insert({
      ...batchData,
      id: batchId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (teamCount && teamCount > 0) {
      const prefix = (batchData.name.includes('NLP') || batchData.name.includes('ＮＬＰ')) ? batchData.name : `NLP初階${batchData.name}`;
      for (let i = 1; i <= teamCount; i++) {
        const chNum = getChineseNumber(i);
        const teamName = `${prefix}第${chNum}隊`;
        const teamId = 'team-' + Math.random().toString(36).substring(2, 9);
        await supabase.from('teams').insert({
          id: teamId,
          name: teamName,
          captain_id: null,
          total_score: 0,
          batch_id: batchId,
          invite_code: `invite-${batchId}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          invite_enabled: true,
          max_members: 10,
          created_at: new Date().toISOString()
        });
      }
    }

    await fetchData();
  };

  const handleHideWitness = async (submissionId: string) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('submissions').update({ share_to_witness: false }).eq('id', submissionId);
      if (error) throw new Error(error.message);
      await fetchData();
    } catch (err) {
      console.error('Error hiding witness:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // 從 Storage 公開 URL 解析出 bucket/path 並刪除檔案（釋放空間；失敗不影響流程）
  // 自訂貼文可能含多張圖（以 '|' 串接），逐一刪除
  const removeStorageImageByUrl = async (url?: string | null) => {
    if (!url) return;
    const marker = '/storage/v1/object/public/';
    for (const one of url.split('|')) {
      const u = one.trim();
      if (!u) continue;
      const idx = u.indexOf(marker);
      if (idx < 0) continue;
      const rest = u.substring(idx + marker.length); // bucket/path...
      const slash = rest.indexOf('/');
      if (slash <= 0) continue;
      const bucket = rest.substring(0, slash);
      const filePath = decodeURIComponent(rest.substring(slash + 1));
      try { await supabase.storage.from(bucket).remove([filePath]); } catch { /* 忽略 */ }
    }
  };

  const handleDeleteWitness = async (submissionId: string) => {
    setIsSyncing(true);
    try {
      const sub = submissions.find(s => s.id === submissionId);
      if (!sub) return;
      const isSocialPost = sub.mission_id === 'task-custom-post';

      if (isSocialPost) {
        // 純分享貼文：與任務無關 → 整筆刪除。
        // 先把 score_awarded 歸零，避免刪除 trigger 連帶扣分（見證牆與分數解耦）。
        if (sub.status === 'approved' && (sub.score_awarded ?? 0) !== 0) {
          await supabase.from('submissions').update({ score_awarded: 0 }).eq('id', submissionId);
        }
        await removeStorageImageByUrl(sub.proof_image_url);
        const { error } = await supabase.from('submissions').delete().eq('id', submissionId);
        if (error) throw new Error(error.message);
      } else {
        // 任務打卡：只刪「照片」釋放空間，保留任務完成與經驗（不刪資料列、不碰分數）。
        await removeStorageImageByUrl(sub.proof_image_url);
        const { error } = await supabase
          .from('submissions')
          .update({ proof_image_url: null, share_to_witness: false })
          .eq('id', submissionId);
        if (error) throw new Error(error.message);
      }

      await fetchData();
    } catch (err) {
      console.error('Error deleting witness:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateBatch = async (batchId: string, batchData: Partial<Batch>, teamCount?: number) => {
    await supabase
      .from('batches')
      .update({
        ...batchData,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId);

    if (teamCount !== undefined) {
      const { data: teamsList } = await supabase.from('teams').select('*');
      const currentTeams = teamsList?.filter((t: any) => t.batch_id === batchId) || [];
      const currentCount = currentTeams.length;

      if (teamCount > currentCount) {
        const { data: dbBatch } = await supabase.from('batches').select('name').eq('id', batchId).single();
        const batchName = batchData.name || dbBatch?.name || '';
        const prefix = batchName ? ((batchName.includes('NLP') || batchName.includes('ＮＬＰ')) ? batchName : `NLP初階${batchName}`) : 'NLP初階小隊';
        for (let i = currentCount + 1; i <= teamCount; i++) {
          const chNum = getChineseNumber(i);
          const teamName = `${prefix}第${chNum}隊`;
          const teamId = 'team-' + Math.random().toString(36).substring(2, 9);
          await supabase.from('teams').insert({
            id: teamId,
            name: teamName,
            captain_id: null,
            total_score: 0,
            batch_id: batchId,
            invite_code: `invite-${batchId}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            invite_enabled: true,
            max_members: 10,
            created_at: new Date().toISOString()
          });
        }
      } else if (teamCount < currentCount) {
        const sortedTeams = [...currentTeams].sort((a, b) => a.name.localeCompare(b.name));
        const teamsToDelete = sortedTeams.slice(teamCount);
        
        for (const teamToDelete of teamsToDelete) {
          await supabase.from('teams').delete().eq('id', teamToDelete.id);
          await supabase.from('profiles').update({ team_id: null }).eq('team_id', teamToDelete.id);
        }
      }
    }

    await fetchData();
  };

  const handleDeleteBatch = async (batchId: string) => {
    // Delete related data in order (cascade-safe)
    await supabase.from('batch_mission_templates').delete().eq('batch_id', batchId);
    await supabase.from('missions').delete().eq('batch_id', batchId);
    // Clear profiles' batch_id that belong to this batch
    await supabase.from('profiles').update({ batch_id: null, team_id: null }).eq('batch_id', batchId);
    // Delete teams in this batch
    await supabase.from('teams').delete().eq('batch_id', batchId);
    // Finally delete the batch itself
    await supabase.from('batches').delete().eq('id', batchId);
    await fetchData();
  };

  const handleCreateMissionTemplate = async (templateData: Omit<MissionTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    const { data } = await supabase.from('mission_templates').insert({
      id: crypto.randomUUID(),
      ...templateData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    await fetchData();
    return data?.[0] || (Array.isArray(data) ? data[0] : data);
  };

  const handleUpdateMissionTemplate = async (templateId: string, templateData: Partial<MissionTemplate>) => {
    await supabase
      .from('mission_templates')
      .update({
        ...templateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId);
    await fetchData();
  };

  const handleDeleteMissionTemplate = async (templateId: string) => {
    await supabase.from('batch_mission_templates').delete().eq('template_id', templateId);
    await supabase.from('mission_templates').delete().eq('id', templateId);
    await fetchData();
  };

  const handleSaveBatchMissionTemplates = async (
    batchId: string, 
    rules: Omit<BatchMissionTemplate, 'id' | 'created_at' | 'updated_at'>[]
  ) => {
    // 1. Delete existing rules for this cohort
    await supabase.from('batch_mission_templates').delete().eq('batch_id', batchId);
    
    // 2. Insert new ones if any
    if (rules.length > 0) {
      await supabase.from('batch_mission_templates').insert(
        rules.map(r => ({
          ...r,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      );
    }
    
    // 3. Clear existing missions for this cohort that DO NOT have student submissions yet
    const { data: currentMissions } = await supabase.from('missions').select('id').eq('batch_id', batchId);
    if (currentMissions && currentMissions.length > 0) {
      const { data: subs } = await supabase.from('submissions').select('mission_id');
      const submittedMissionIds = new Set((subs || []).map((s: any) => s.mission_id));
      
      const missionsToDelete = currentMissions
        .map((m: any) => m.id)
        .filter((id: string) => !submittedMissionIds.has(id));
        
      if (missionsToDelete.length > 0) {
        await supabase.from('missions').delete().in('id', missionsToDelete);
      }
    }

    // 4. Auto-generate missions for this batch so user doesn't have to confirm manually
    const batch = batches.find(b => b.id === batchId);
    if (batch && rules.length > 0) {
      const startDate = new Date(batch.start_date);
      const endDate = new Date(batch.end_date);
      const previews: any[] = [];
      
      rules.filter(r => r.is_enabled).forEach((rule: any) => {
        const template = missionTemplates.find((t: any) => t.id === rule.template_id);
        if (!template) return;
        
        const type = template.mission_type;
        const points = template.points;
        const title = template.title;
        const desc = template.description;
        const reviewType = template.review_type;
        const category = template.category;
        const maxCompletions = template.max_completions;
        
        if (type === 'daily') {
          let cur = new Date(startDate);
          while (cur <= endDate) {
            const dayStr = cur.toISOString().substring(0, 10);
            previews.push({
              batch_id: batchId,
              template_id: rule.template_id,
              title,
              description: desc,
              mission_type: type,
              points,
              publish_at: `${dayStr} 00:00:00`,
              deadline_at: `${dayStr} 23:59:59`,
              status: 'scheduled',
              review_type: reviewType,
              category: category,
              max_completions: maxCompletions,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
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
                batch_id: batchId,
                template_id: rule.template_id,
                title,
                description: desc,
                mission_type: type,
                points,
                publish_at: `${pubStr} 00:00:00`,
                deadline_at: `${deadStr} 23:59:59`,
                status: 'scheduled',
                review_type: reviewType,
                category: category,
                max_completions: maxCompletions,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
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
              batch_id: batchId,
              template_id: rule.template_id,
              title,
              description: desc,
              mission_type: type,
              points,
              publish_at: `${pubStr} 00:00:00`,
              deadline_at: `${deadStr} 23:59:59`,
              status: 'scheduled',
              review_type: reviewType,
              category: category,
              max_completions: maxCompletions,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        } else if (type === 'special') {
          const dayStr = startDate.toISOString().substring(0, 10);
          previews.push({
            batch_id: batchId,
            template_id: rule.template_id,
            title,
            description: desc,
            mission_type: type,
            points,
            publish_at: `${dayStr} 00:00:00`,
            deadline_at: batch.end_date.substring(0, 10) + ' 23:59:59',
            status: 'scheduled',
            review_type: reviewType,
            category: category,
            max_completions: maxCompletions,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
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
            batch_id: batchId,
            template_id: rule.template_id,
            title,
            description: desc,
            mission_type: type,
            points,
            publish_at: `${pubStr} 00:00:00`,
            deadline_at: `${deadStr} 23:59:59`,
            status: 'scheduled',
            review_type: reviewType,
            category: category,
            max_completions: maxCompletions,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      });

      if (previews.length > 0) {
        const { data: existingMissions } = await supabase.from('missions').select('*').eq('batch_id', batchId);
        const existingKeys = new Set((existingMissions || []).map((m: any) => `${m.template_id}_${m.publish_at}`));
        
        const missionsToInsert = previews.filter(p => !existingKeys.has(`${p.template_id}_${p.publish_at}`));
        if (missionsToInsert.length > 0) {
          await supabase.from('missions').insert(missionsToInsert);
        }
      }
    }
    
    await fetchData();
  };

  const handleGenerateMissions = async (
    batchId: string,
    previews: Array<{
      templateId: string;
      title: string;
      description: string;
      type: 'daily' | 'weekly' | 'special' | 'limited';
      points: number;
      publishAt: string;
      deadlineAt: string;
      reviewType: 'auto' | 'leader' | 'admin';
      category?: string;
      maxCompletions?: number;
    }>
  ) => {
    setIsSyncing(true);
    let successCount = 0;
    let skipCount = 0;
    
    try {
      // 1. Fetch existing missions for the batch
      const { data: existing } = await supabase.from('missions').select('*').eq('batch_id', batchId);
      // 用「發布日期(YYYY-MM-DD)」當去重 key：不受 DB(+00:00) 與預覽字串時區解讀差異影響
      const existingSet = new Set(
        (existing || []).map((m: any) => `${m.batch_id}_${m.template_id}_${String(m.publish_at).substring(0, 10)}`)
      );

      const newMissions: Omit<Mission, 'id' | 'created_at' | 'updated_at'>[] = [];

      previews.forEach(p => {
        const key = `${batchId}_${p.templateId}_${String(p.publishAt).substring(0, 10)}`;
        if (existingSet.has(key)) {
          skipCount++;
        } else {
          newMissions.push({
            batch_id: batchId,
            template_id: p.templateId,
            title: p.title,
            description: p.description,
            mission_type: p.type,
            points: p.points,
            publish_at: p.publishAt,
            deadline_at: p.deadlineAt,
            status: 'scheduled',
            review_type: p.reviewType,
            category: p.category,
            max_completions: p.maxCompletions
          });
          successCount++;
        }
      });

      // 1b. 確保 4 個「進化任務」存在（隱藏任務，學員到 5 級走進化流程才會用到）
      //     改由此處集中發布，取代過去「每次載入頁面就寫入」造成的重複與變慢問題。
      const EVOLVE_TEMPLATE_IDS = ['temp-evolve-dragon', 'temp-evolve-lion', 'temp-evolve-fox', 'temp-evolve-spirit'];
      const targetBatch = batches.find(b => b.id === batchId);
      EVOLVE_TEMPLATE_IDS.forEach(tid => {
        const alreadyExists = (existing || []).some((m: any) => m.template_id === tid);
        if (alreadyExists) return;
        const template = missionTemplates.find(t => t.id === tid);
        if (!template) return;
        newMissions.push({
          batch_id: batchId,
          template_id: tid,
          title: template.title,
          description: template.description,
          mission_type: template.mission_type,
          points: template.points,
          publish_at: targetBatch?.start_date || new Date().toISOString(),
          deadline_at: targetBatch?.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          review_type: template.review_type,
          category: template.category || '神獸進化',
          max_completions: template.max_completions ?? 1
        });
        successCount++;
      });

      // 2. Insert batch missions
      if (newMissions.length > 0) {
        await supabase.from('missions').insert(
          newMissions.map(m => ({
            ...m,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
        );
      }
      
      await fetchData();
    } catch (err) {
      console.error('產生任務失敗:', err);
    } finally {
      setIsSyncing(false);
    }
    
    return { successCount, skipCount };
  };

  // 後台單筆刪除「已產生的任務」：先刪該任務的打卡（DB trigger 會自動退回已給經驗），再刪任務本身
  const handleDeleteMission = async (missionId: string) => {
    setIsSyncing(true);
    try {
      const { error: e1 } = await supabase.from('submissions').delete().eq('mission_id', missionId);
      if (e1) throw new Error(e1.message);
      const { error: e2 } = await supabase.from('missions').delete().eq('id', missionId);
      if (e2) throw new Error(e2.message);
      await fetchData();
    } catch (err: any) {
      console.error('刪除任務失敗:', err);
      alert('刪除任務失敗：' + (err?.message || '請稍後再試'));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualAdjustScore = async (studentId: string, amount: number, reason: string) => {
    if (!currentUser) return;
    // 檢查 RPC 是否真的成功，失敗就拋錯（避免「假成功」）
    const { error } = await supabase.rpc('adjust_score', {
      p_student_id: studentId,
      p_amount: amount,
      p_reason: reason,
      p_created_by: currentUser.id
    });
    if (error) throw new Error(error.message || '調分失敗');
    await fetchData();
  };

  const handleCreateAnnouncement = async (title: string, content: string, batchId?: string | null, publishAt?: string | null) => {
    if (!currentUser) return;
    await supabase.from('announcements').insert({
      title,
      content,
      created_by: currentUser.id,
      batch_id: batchId || null,
      created_at: publishAt ? new Date(publishAt).toISOString() : new Date().toISOString()
    });
    await fetchData();
  };

  const handleUpdateAnnouncement = async (id: string, updates: Partial<Announcement>) => {
    try {
      setIsSyncing(true);
      const { error } = await supabase.from('announcements').update(updates).eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || '更新公告失敗');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      setIsSyncing(true);
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || '刪除公告失敗');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateCourse = async (name: string, description: string, classDate: string, batchId?: string | null, registerUrl?: string | null) => {
    await supabase.from('courses').insert({
      name,
      description: description || null,
      class_date: classDate,
      batch_id: batchId || null,
      register_url: registerUrl || null
    });
    await fetchData();
  };

  const handleUpdateCourse = async (id: string, updates: Partial<Course>) => {
    try {
      setIsSyncing(true);
      const { error } = await supabase.from('courses').update(updates).eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || '更新課程失敗');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      setIsSyncing(true);
      const { error } = await supabase.from('courses').delete().eq('id', courseId);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || '刪除課程失敗');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateAchievement = async (title: string, description: string, value: number, iconUrl?: string | null) => {
    // 若 icon 是上傳的 base64 圖片，先上傳 Storage 換 URL；若是 lucide 圖示名稱則原樣保留
    const uploadedIcon = await uploadProofImage(iconUrl);
    await supabase.from('achievements').insert({
      title,
      description: description || null,
      icon_url: uploadedIcon || 'Flame',
      condition_type: 'total_score',
      condition_value: value
    });
    await fetchData();
  };

  const handleUpdateAchievement = async (id: string, updates: Partial<Achievement>) => {
    try {
      setIsSyncing(true);
      if (isRealSupabase && supabase) {
        if (updates.icon_url && updates.icon_url.startsWith('data:')) {
          updates.icon_url = await uploadProofImage(updates.icon_url);
        }
        const { error } = await supabase.from('achievements').update(updates).eq('id', id);
        if (error) throw error;
      }
      setAchievements(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
      alert('成就更新成功！');
      await fetchData();
    } catch (err: any) {
      console.error('Update achievement error:', err);
      alert('更新失敗：' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteAchievement = async (id: string) => {
    if (!confirm('確定要刪除這個成就嗎？這會同時刪除所有學員解鎖此成就的紀錄。')) return;
    try {
      setIsSyncing(true);
      if (isRealSupabase && supabase) {
        const { error } = await supabase.from('achievements').delete().eq('id', id);
        if (error) throw error;
      }
      setAchievements(prev => prev.filter(a => a.id !== id));
      setUserAchievements(prev => prev.filter(ua => ua.achievement_id !== id));
      alert('成就已刪除！');
      await fetchData();
    } catch (err: any) {
      console.error('Delete achievement error:', err);
      alert('刪除失敗：' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreatePet = async (petData: Omit<Pet, 'id' | 'created_at'>) => {
    await supabase.from('pets').insert(petData);
    await fetchData();
  };

  const handleCreateCard = async (cardData: Omit<Card, 'id' | 'created_at'>) => {
    await supabase.from('cards').insert(cardData);
    await fetchData();
  };

  const handleCreateDeck = async (name: string, isTemplate: boolean, cardIds: { cardId: string; count: number }[]) => {
    const deckId = 'deck-' + Math.random().toString(36).substring(2, 11);
    await supabase.from('decks').insert({
      id: deckId,
      name,
      created_by: currentUser?.id || 'admin1',
      is_template: isTemplate
    });
    
    const deckCardsToInsert = cardIds.map(c => ({
      deck_id: deckId,
      card_id: c.cardId,
      count: c.count
    }));
    await supabase.from('deck_cards').insert(deckCardsToInsert);
    await fetchData();
  };

  const handleAwardPetSkin = async (studentId: string, petId: string, skinName: string) => {
    const userPetRecord = userPets.find(up => up.student_id === studentId && up.pet_id === petId);
    if (userPetRecord) {
      await supabase.from('user_pets').update({ current_skin: skinName }).eq('id', userPetRecord.id);
      await fetchData();
    }
  };

  const handleLevelUpPet = async (userPetId: string) => {
    const record = userPets.find(up => up.id === userPetId);
    if (record) {
      await supabase.from('user_pets').update({ pet_level: (record.pet_level ?? 1) + 1 }).eq('id', userPetId);
      await fetchData();
    }
  };

  const handleUpdatePetStage = async (stageId: string, updatedFields: Partial<PetStage>) => {
    await supabase.from('pet_stages').update(updatedFields).eq('id', stageId);
    await fetchData();
  };

  const handleUpdatePetLine = async (lineId: string, updatedFields: Partial<PetLine>) => {
    await supabase.from('pet_lines').update(updatedFields).eq('id', lineId);
    await fetchData();
  };

  const handleEvolvePet = async (studentId: string, lineKey: string) => {
    const userPetRecord = userPets.find(up => up.student_id === studentId);
    // 該神獸線可用的最高階段（避免進化超出已定義的型態）；無資料時保底為 2
    const lineStageIdxs = petStages.filter(s => s.line_key === lineKey).map(s => s.stage_index);
    const maxStage = lineStageIdxs.length > 0 ? Math.max(...lineStageIdxs) : 2;
    if (userPetRecord) {
      // 推進到「下一階」，而非寫死第 2 階（修正第 3 階以上會被打回第 2 階的 bug）
      const current = userPetRecord.current_stage_index || 1;
      const nextStage = Math.min(current + 1, maxStage);
      await supabase.from('user_pets').update({
        pet_line: lineKey,
        current_stage_index: nextStage,
        has_pending_evolution: false,
        evolved_at: new Date().toISOString(),
        selected_evolution_line: null // reset selection after evolution
      }).eq('id', userPetRecord.id);
    } else {
      const profile = profiles.find(p => p.id === studentId);
      const exp = profile?.score || 0;
      await supabase.from('user_pets').insert({
        student_id: studentId,
        total_exp: exp,
        level: Math.floor(exp / 500),
        pet_line: lineKey,
        current_stage_index: Math.min(2, maxStage), // 第一次進化：蛋(1) → 第 2 階
        has_pending_evolution: false,
        evolved_at: new Date().toISOString()
      });
    }
    await fetchData();
  };

  const handleSelectEvolutionLine = async (studentId: string, lineKey: string) => {
    let userPetRecord = userPets.find(up => up.student_id === studentId);
    
    // 如果沒有神獸紀錄，先建立一筆
    if (!userPetRecord) {
      const profile = profiles.find(p => p.id === studentId);
      const exp = profile?.score || 0;
      const { data, error } = await supabase.from('user_pets').insert({
        student_id: studentId,
        total_exp: exp,
        level: Math.floor(exp / 500),
        pet_line: null,
        current_stage_index: 1,
        has_pending_evolution: false,
        evolved_at: new Date().toISOString()
      }).select().single();
      
      if (!error && data) {
        userPetRecord = data;
      }
    }

    if (userPetRecord) {
      const selectedLine = petLines.find(l => l.line_key === lineKey);
      if (selectedLine && selectedLine.task_template_id) {
        const studentBatchId = userPetRecord.profile?.batch_id || profiles.find(p => p.id === studentId)?.batch_id || 'batch-50';
        const matchedMission = missions.find(
          m => m.template_id === selectedLine.task_template_id && m.batch_id === studentBatchId
        );
        
        if (!matchedMission) {
          const template = missionTemplates.find(t => t.id === selectedLine.task_template_id);
          if (template) {
            const batch = batches.find(b => b.id === studentBatchId);
            const publishAt = batch?.start_date || new Date().toISOString();
            const deadlineAt = batch?.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            
            const newMission: Mission = {
              id: `mission-evolve-${lineKey}-${Date.now()}`,
              batch_id: studentBatchId,
              template_id: template.id,
              title: template.title,
              description: template.description,
              mission_type: template.mission_type,
              points: template.points,
              publish_at: publishAt,
              deadline_at: deadlineAt,
              status: 'active',
              review_type: template.review_type,
              category: template.category || '神獸進化',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              max_completions: template.max_completions ?? 1
            };
            
            await supabase.from('missions').insert(newMission);
          }
        }
      }

      await supabase.from('user_pets').update({
        selected_evolution_line: lineKey
      }).eq('id', userPetRecord.id);
      
      await fetchData();
    }
  };

  const handleMarkAttendance = async (courseId: string, studentId: string) => {
    if (!currentUser) return;
    // Check if they registered first
    const record = attendance.find(a => a.course_id === courseId && a.student_id === studentId);
    
    if (record) {
      await supabase
        .from('course_attendance')
        .update({ status: 'attended', attended_at: new Date().toISOString() })
        .eq('id', record.id);
    } else {
      await supabase.from('course_attendance').insert({
        course_id: courseId,
        student_id: studentId,
        status: 'attended',
        attended_at: new Date().toISOString()
      });
    }

    // Award 1000 points automatically for attending course!
    await supabase.rpc('adjust_score', {
      p_student_id: studentId,
      p_amount: 1000,
      p_reason: `出席簽到課程：${courses.find(c => c.id === courseId)?.name || '實體課'}`,
      p_created_by: currentUser.id
    });

    await fetchData();
  };

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

  // For admin (大隊長) viewing Captain Dashboard, we use their selected team; otherwise use their own team
  // 隊長若沒有自己的小隊，一律為 null（不可退回 teams[0]，否則會看到/操作別隊資料）
  const selectedTeamForCaptainView = (currentUser.role === 'admin' || currentUiRole === 'admin')
    ? (teams.find(t => t.id === adminSelectedTeamId) || teams[0])
    : (currentTeam || null);

  // Filter data by batch context
  const batchFilterId = currentUser.batch_id;
  const filteredTasks = currentUser.role === 'admin' ? tasks : tasks.filter(t => t.batch_id === batchFilterId);
  const filteredProfiles = currentUser.role === 'admin' ? profiles : profiles.filter(p => p.batch_id === batchFilterId);
  const now = new Date();
  const filteredAnnouncements = currentUser.role === 'admin' && currentUiRole === 'admin'
    ? announcements
    : announcements.filter(ann => (!ann.batch_id || ann.batch_id === batchFilterId) && new Date(ann.created_at) <= now);
  const filteredCourses = currentUser.role === 'admin' ? courses : courses.filter(c => !c.batch_id || c.batch_id === batchFilterId);

  // Filter submissions / logs for the active tab context
  const filteredSubmissions = submissions.filter(s => s.student_id === currentUser.id);
  const filteredScoreLogs = scoreLogs.filter((l: ScoreLog) => l.student_id === currentUser.id).map(log => {
    let displayReason = log.reason;
    if (displayReason === '完成任務' && log.submission_id) {
      const sub = submissions.find(s => s.id === log.submission_id);
      if (sub) {
        let taskName = '';
        let taskType = '';
        const targetId = sub.mission_id || sub.task_id;
        
        const t = tasks.find(t => t.id === targetId);
        if (t) {
          taskName = t.name;
          taskType = t.type;
        } else {
          const m = missions.find(m => m.id === targetId);
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

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 bg-slate-950 text-white light:bg-slate-925">
      
      {/* 1. Header */}
      <Header
        profile={currentUser}
        team={currentTeam}
        batches={batches}
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
        userRole={currentUiRole}
      />

      {/* 3. Main Workspace Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 pt-8 pb-24 md:pb-8 overflow-y-auto">
        {activeTab === 'daily' && (
          <DailyQuestsTab
            profile={currentUser}
            tasks={filteredTasks}
            submissions={filteredSubmissions}
            announcements={filteredAnnouncements}
            onCheckIn={handleCheckIn}
            isSyncing={isSyncing}
            missions={missions}
            showToast={showToast}
            userPet={userPets.find(up => up.student_id === currentUser.id) || null}
            petStages={petStages}
            onEvolvePet={handleEvolvePet}
            batchStartDate={batches.find(b => b.id === currentUser.batch_id)?.start_date || null}
            allProfiles={profiles}
            allUserPets={userPets}
            batches={batches}
            petLines={petLines}
            missionTemplates={missionTemplates}
            onSelectEvolutionLine={handleSelectEvolutionLine}
          />
        )}

        {activeTab === 'rank' && (
          <LeaderboardTab
            profiles={profiles}
            teams={teams}
            batches={batches}
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
            userAchievements={userAchievements.filter(ua => ua.student_id === currentUser.id)}
            studentScore={currentUser.score}
          />
        )}

        {activeTab === 'course' && (
          <CourseTab
            courses={filteredCourses}
            attendance={attendance}
            profiles={profiles}
            teams={teams}
            currentUserId={currentUser.id}
            onRegisterCourse={handleRegisterCourse}
            onMarkAttendance={handleMarkAttendance}
            isSyncing={isSyncing}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            logs={filteredScoreLogs}
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
            onHideWitness={handleHideWitness}
            onDeleteWitness={handleDeleteWitness}
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
        {activeTab === 'captain' && currentUiRole !== 'student' && (currentUiRole === 'admin' || selectedTeamForCaptainView) && (
          <CaptainDashboard
            team={selectedTeamForCaptainView}
            allTeams={teams}
            currentUserRole={currentUser.role}
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
          />
        )}

        {activeTab === 'admin' && currentUiRole === 'admin' && (
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
            onDeleteTask={handleDeleteTask}
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
          />
        )}
      </main>
      {/* Footer copyright select-none */}
      <footer className="w-full text-center py-6 border-t border-white/5 text-[10px] text-slate-600 uppercase font-mono select-none light:border-slate-200">
        © {new Date().getFullYear()} NLP 人性溝通術評分系統 • 版權所有
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

    </div>
  );
}

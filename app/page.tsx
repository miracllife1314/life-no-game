'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { 
  Profile, Team, Task, Submission, ScoreLog, 
  Course, CourseAttendance, Achievement, UserAchievement, 
  Announcement, StudentNote, UserRole,
  Pet, UserPet, Card, Deck, DeckCard, UserDeck, Batch, MissionTemplate, BatchMissionTemplate, Mission
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
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [viewState, setViewState] = useState<'login' | 'register' | 'app'>('login');

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

  // --- UI States ---
  const [activeTab, setActiveTab] = useState<TabKey>('daily');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSyncing, setIsSyncing] = useState(false);

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

      // 2. Fetch standard tables
      const { data: batchesList } = await supabase.from('batches').select('*');
      const { data: templatesList } = await supabase.from('mission_templates').select('*');
      const { data: rulesList } = await supabase.from('batch_mission_templates').select('*');
      const { data: profilesList } = await supabase.from('profiles').select('*');
      const { data: teamsList } = await supabase.from('teams').select('*');
      const { data: tasksList } = await supabase.from('tasks').select('*');
      const { data: subsList } = await supabase.from('submissions').select('*');
      const { data: coursesList } = await supabase.from('courses').select('*');
      const { data: attendanceList } = await supabase.from('course_attendance').select('*');
      const { data: achsList } = await supabase.from('achievements').select('*');
      const { data: userAchsList } = await supabase.from('user_achievements').select('*');
      const { data: annsList } = await supabase.from('announcements').select('*');
      const { data: notesList } = await supabase.from('student_notes').select('*');
      const { data: scoreLogsList } = await supabase.from('score_logs').select('*');
      const { data: petsList } = await supabase.from('pets').select('*');
      const { data: userPetsList } = await supabase.from('user_pets').select('*');
      const { data: cardsList } = await supabase.from('cards').select('*');
      const { data: decksList } = await supabase.from('decks').select('*');
      const { data: deckCardsList } = await supabase.from('deck_cards').select('*');
      const { data: userDecksList } = await supabase.from('user_decks').select('*');
      const { data: missionsList } = await supabase.from('missions').select('*');

      if (batchesList) setBatches(batchesList);
      if (templatesList) setMissionTemplates(templatesList);
      if (rulesList) setBatchMissionTemplates(rulesList);
      if (profilesList) {
        const mappedProfiles = profilesList.map((p: any) => {
          if (p.role !== 'admin' && !p.batch_id) {
            return { ...p, batch_id: 'batch-50' };
          }
          return p;
        });
        setProfiles(mappedProfiles);
      }
      if (teamsList) setTeams(teamsList);
      if (tasksList) setTasks(tasksList);
      if (subsList) setSubmissions(subsList);

      // Inject mock missions for batch-50 to ensure frontend displays test data correctly
      let finalMissions = missionsList || [];
      
      if (batchesList && rulesList && templatesList) {
        for (const batch of batchesList) {
          if (batch.status === 'active' || batch.id === 'batch-50') {
            const rules = rulesList.filter((r: any) => r.batch_id === batch.id && r.is_enabled);
            if (rules.length > 0) {
                const startDate = new Date(batch.start_date);
                const endDate = new Date(batch.end_date);
                const previews: any[] = [];
                
                rules.forEach((rule: any) => {
                  const template = templatesList.find((t: any) => t.id === rule.template_id);
                  if (!template) return;
                  
                  const type = template.mission_type;
                  const points = template.points;
                  const title = template.title;
                  const desc = template.description;
                  const reviewType = template.review_type;
                  
                  if (type === 'daily') {
                    let cur = new Date(startDate);
                    while (cur <= endDate) {
                      const dayStr = cur.toISOString().substring(0, 10);
                      previews.push({
                        templateId: rule.template_id,
                        title,
                        description: desc,
                        type,
                        points,
                        publishAt: `${dayStr} 00:00:00`,
                        deadlineAt: `${dayStr} 23:59:59`,
                        reviewType: reviewType
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
                      templateId: rule.template_id,
                      title,
                      description: desc,
                      type,
                      points,
                      publishAt: `${pubStr} 00:00:00`,
                      deadlineAt: `${deadStr} 23:59:59`,
                      reviewType: reviewType
                    });
                  } else if (type === 'special') {
                    const dayStr = startDate.toISOString().substring(0, 10);
                    previews.push({
                      templateId: rule.template_id,
                      title,
                      description: desc,
                      type,
                      points,
                      publishAt: `${dayStr} 00:00:00`,
                      deadlineAt: batch.end_date.substring(0, 10) + ' 23:59:59',
                      reviewType: reviewType
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
                      templateId: rule.template_id,
                      title,
                      description: desc,
                      type,
                      points,
                      publishAt: `${pubStr} 00:00:00`,
                      deadlineAt: `${deadStr} 23:59:59`,
                      reviewType: reviewType
                    });
                  }
                });
                
                const existingKeys = new Set(
                  finalMissions
                    .filter((m: any) => m.batch_id === batch.id)
                    .map((m: any) => `${m.template_id}_${m.publish_at}`)
                );
                const missingPreviews = previews.filter(
                  p => !existingKeys.has(`${p.templateId}_${p.publishAt}`)
                );
                
                if (missingPreviews.length > 0) {
                  const newMissions = missingPreviews.map(p => ({
                    batch_id: batch.id,
                    template_id: p.templateId,
                    title: p.title,
                    description: p.description,
                    mission_type: p.type,
                    points: p.points,
                    publish_at: p.publishAt,
                    deadline_at: p.deadlineAt,
                    status: 'scheduled',
                    review_type: p.reviewType,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }));
                  
                  await supabase.from('missions').insert(newMissions);
                  
                  const { data: refetchedMissions } = await supabase.from('missions').select('*');
                  if (refetchedMissions) {
                    finalMissions = refetchedMissions;
                  }
                }
              }
            }
          }
        }
      setMissions(finalMissions);
      if (coursesList) setCourses(coursesList);
      if (attendanceList) setAttendance(attendanceList);
      if (achsList) setAchievements(achsList);
      if (userAchsList) setUserAchievements(userAchsList);
      if (annsList) setAnnouncements(annsList);
      if (notesList) setNotes(notesList);
      if (scoreLogsList) setScoreLogs(scoreLogsList);
      if (petsList) setPets(petsList);
      if (userPetsList) setUserPets(userPetsList);
      if (cardsList) setCards(cardsList);
      if (decksList) setDecks(decksList);
      if (deckCardsList) setDeckCards(deckCardsList);
      if (userDecksList) setUserDecks(userDecksList);

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser?.id]);

  // Load session on startup & handle invite query params
  useEffect(() => {
    const initSession = async () => {
      // Pre-fetch general tables so teams/profiles lists are available for validation
      await fetchData();

      let queryInvite = '';
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        queryInvite = params.get('invite') || '';
      }

      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setViewState('app');
        setActiveTab('daily');
        await fetchData(data.user.id);
      } else if (queryInvite) {
        setInviteCode(queryInvite);
        setViewState('register');

        // Validate invite code using DB data
        const { data: teamsList } = await supabase.from('teams').select('*');
        const team = teamsList?.find((t: any) => t.invite_code === queryInvite);
        if (!team) {
          setInviteError('此邀請連結無效');
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
    initSession();
  }, []);

  // --- Auth Actions ---
  const handleLogin = async (name: string) => {
    setIsSyncing(true);
    // Standard mock or real sign-in (email uses dummy prefix for names)
    const email = `${name.toLowerCase()}@nlpgame.local`;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'dummy-password'
    });

    if (error) {
      setIsSyncing(false);
      throw new Error(error.message);
    }

    if (data?.user) {
      setViewState('app');
      setActiveTab('daily');
      await fetchData(data.user.id);
    }
  };

  const handleRegister = async (regData: { name: string; phone: string; role: UserRole }) => {
    setIsSyncing(true);

    let batch_id: string | null = null;
    let team_id: string | null = null;
    let captain_id: string | null = null;

    if (inviteCode) {
      const { data: teamsList } = await supabase.from('teams').select('*');
      const team = teamsList?.find((t: any) => t.invite_code === inviteCode);
      if (team) {
        batch_id = team.batch_id || 'batch-50';
        team_id = team.id;
        captain_id = team.captain_id;
      }
    }

    const email = `${regData.name.toLowerCase()}@nlpgame.local`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password: 'dummy-password',
      options: {
        data: {
          name: regData.name,
          role: regData.role,
          phone: regData.phone,
          batch_id,
          team_id,
          captain_id
        }
      }
    });

    if (error) {
      setIsSyncing(false);
      throw new Error(error.message);
    }

    if (data?.user) {
      setViewState('app');
      setActiveTab('daily');
      setInviteCode('');
      setInvitedTeamName('');
      setInvitedCaptainName('');
      setInviteError('');
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      await fetchData(data.user.id);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentTeam(null);
    setViewState('login');
    setGmMode(false);
    setActiveTab('daily');
  };

  // --- Student Actions ---
  const handleCheckIn = async (taskId: string, proofText?: string, proofImg?: string, proofLink?: string) => {
    if (!currentUser) return;

    // 先在 tasks 找，找不到再去 missions 找（期數任務）
    const task = tasks.find(t => t.id === taskId);
    const mission = !task ? missions.find(m => m.id === taskId) : null;

    if (!task && !mission) return;

    const requiresApproval = task ? task.requires_approval : mission!.review_type !== 'auto';
    const points = task ? task.score : mission!.points;

    const submissionData = {
      mission_id: taskId,
      student_id: currentUser.id,
      proof_text: proofText || null,
      proof_image_url: proofImg || null,
      proof_link: proofLink || null,
      status: requiresApproval ? 'pending' : 'approved',
      score_awarded: requiresApproval ? 0 : points,
      reviewed_by: requiresApproval ? null : 'admin1',
      reviewed_at: requiresApproval ? null : new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    try {
      await supabase.from('submissions').insert(submissionData);
      await fetchData();

      // Trigger success animations and toasts
      if (requiresApproval) {
        showToast('✓ 證明已成功送出！等待小隊長審核中...', 'info');
      } else {
        showToast(`✓ 打卡成功！獲得 +${points} 修為！`, 'success');
        triggerConfetti();
        triggerScoreFloat(`+${points} 修為！`);
      }
    } catch (err) {
      console.error(err);
      showToast('❌ 打卡失敗，請重試！', 'error');
    }
  };

  const handleRegisterCourse = async (courseId: string) => {
    if (!currentUser) return;
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
  const handleReviewSubmission = async (submissionId: string, status: 'approved' | 'rejected') => {
    if (!currentUser) return;
    await supabase
      .from('submissions')
      .update({
        status,
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', submissionId);
    await fetchData();
  };

  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'created_by'>) => {
    if (!currentUser) return;
    await supabase.from('tasks').insert({
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

  const handleAddProfile = async (profileData: { name: string; phone: string; role: UserRole; batchId: string; teamId: string }) => {
    setIsSyncing(true);
    
    // Check if phone number is already registered in this batch
    const { data: profilesList } = await supabase.from('profiles').select('*');
    const duplicatePhone = profilesList?.some((p: any) => p.phone === profileData.phone && p.batch_id === profileData.batchId);
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
      team_id: profileData.teamId,
      captain_id,
      score: 0,
      created_at: new Date().toISOString()
    });

    if (error) {
      setIsSyncing(false);
      throw new Error(error.message || '新增修行者失敗');
    }

    await fetchData();
  };

  const handleUpdateTeamSettings = async (teamId: string, settings: Partial<Team>) => {
    setIsSyncing(true);
    try {
      await supabase.from('teams').update(settings).eq('id', teamId);
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
    batchId?: string | null
  ) => {
    const updateData: any = { team_id: teamId, role: role };
    if (batchId !== undefined) {
      updateData.batch_id = batchId;
    }
    await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', studentId);
    await fetchData();
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
          invite_code: `invite-${batchId}-${i}`,
          invite_enabled: true,
          max_members: 10,
          created_at: new Date().toISOString()
        });
      }
    }

    await fetchData();
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
            invite_code: `invite-${batchId}-${i}`,
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

  const handleCreateMissionTemplate = async (templateData: Omit<MissionTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    await supabase.from('mission_templates').insert({
      ...templateData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    await fetchData();
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
    }>
  ) => {
    setIsSyncing(true);
    let successCount = 0;
    let skipCount = 0;
    
    try {
      // 1. Fetch existing missions for the batch
      const { data: existing } = await supabase.from('missions').select('*').eq('batch_id', batchId);
      const existingSet = new Set(
        (existing || []).map((m: any) => `${m.batch_id}_${m.template_id}_${m.publish_at}`)
      );
      
      const newMissions: Omit<Mission, 'id' | 'created_at' | 'updated_at'>[] = [];
      
      previews.forEach(p => {
        const key = `${batchId}_${p.templateId}_${p.publishAt}`;
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
            review_type: p.reviewType
          });
          successCount++;
        }
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

  const handleManualAdjustScore = async (studentId: string, amount: number, reason: string) => {
    if (!currentUser) return;
    await supabase.rpc('adjust_score', {
      p_student_id: studentId,
      p_amount: amount,
      p_reason: reason,
      p_created_by: currentUser.id
    });
    await fetchData();
  };

  const handleCreateAnnouncement = async (title: string, content: string, batchId?: string | null) => {
    if (!currentUser) return;
    await supabase.from('announcements').insert({
      title,
      content,
      created_by: currentUser.id,
      batch_id: batchId || null
    });
    await fetchData();
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

  const handleDeleteCourse = async (courseId: string) => {
    await supabase.from('courses').delete().eq('id', courseId);
    await fetchData();
  };

  const handleCreateAchievement = async (title: string, description: string, value: number) => {
    await supabase.from('achievements').insert({
      title,
      description: description || null,
      icon_url: 'Flame',
      condition_type: 'total_score',
      condition_value: value
    });
    await fetchData();
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
      await supabase.from('user_pets').update({ pet_level: record.pet_level + 1 }).eq('id', userPetId);
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

  if (!currentUser) return null;

  // Compute active role for UI (GM override mode)
  const currentUiRole = (gmMode && currentUser.role === 'admin') ? selectedGmRole : currentUser.role;

  // Filter data by batch context
  const batchFilterId = currentUser.batch_id;
  const filteredTasks = currentUser.role === 'admin' ? tasks : tasks.filter(t => t.batch_id === batchFilterId);
  const filteredProfiles = currentUser.role === 'admin' ? profiles : profiles.filter(p => p.batch_id === batchFilterId);
  const filteredAnnouncements = currentUser.role === 'admin' ? announcements : announcements.filter(ann => !ann.batch_id || ann.batch_id === batchFilterId);
  const filteredCourses = currentUser.role === 'admin' ? courses : courses.filter(c => !c.batch_id || c.batch_id === batchFilterId);

  // Filter submissions / logs for the active tab context
  const filteredSubmissions = submissions.filter(s => s.student_id === currentUser.id);
  const filteredScoreLogs = scoreLogs.filter((l: ScoreLog) => l.student_id === currentUser.id);

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
          />
        )}

        {activeTab === 'rank' && (
          <LeaderboardTab
            profiles={filteredProfiles}
            teams={teams}
            currentUserId={currentUser.id}
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
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'captain' && currentUiRole !== 'student' && (
          <CaptainDashboard
            team={currentTeam || teams[0]} // Fallback for GM test admin
            profiles={filteredProfiles}
            tasks={filteredTasks}
            submissions={submissions}
            notes={notes}
            scoreLogs={scoreLogs}
            currentUserId={currentUser.id}
            onSaveNote={handleSaveNote}
            isSyncing={isSyncing}
            onRefresh={fetchData}
            onUpdateTeamSettings={handleUpdateTeamSettings}
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
            pets={pets}
            userPets={userPets}
            cards={cards}
            decks={decks}
            deckCards={deckCards}
            userDecks={userDecks}
            batches={batches}
            missionTemplates={missionTemplates}
            batchMissionTemplates={batchMissionTemplates}
            onReviewSubmission={handleReviewSubmission}
            onCreateTask={handleCreateTask}
            onDeleteTask={handleDeleteTask}
            onAssignTeam={handleAssignTeam}
            onManualAdjustScore={handleManualAdjustScore}
            onCreateAnnouncement={handleCreateAnnouncement}
            onCreateCourse={handleCreateCourse}
            onDeleteCourse={handleDeleteCourse}
            onCreateAchievement={handleCreateAchievement}
            onCreatePet={handleCreatePet}
            onCreateCard={handleCreateCard}
            onCreateDeck={handleCreateDeck}
            onAwardPetSkin={handleAwardPetSkin}
            onLevelUpPet={handleLevelUpPet}
            onCreateBatch={handleCreateBatch}
            onUpdateBatch={handleUpdateBatch}
            onCreateMissionTemplate={handleCreateMissionTemplate}
            onUpdateMissionTemplate={handleUpdateMissionTemplate}
            onSaveBatchMissionTemplates={handleSaveBatchMissionTemplates}
            onGenerateMissions={handleGenerateMissions}
            onAddProfile={handleAddProfile}
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

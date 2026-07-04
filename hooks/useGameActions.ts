// =====================================================================
// 核心計分／使用者端動作：打卡 / 報名 / 隊長筆記 / 審核 / 指揮所格子 /
//   見證牆隱藏·刪除 / 神獸進化·選線 / 課程出席
//   —— 從 app/page.tsx 抽出，行為完全不變（含 gmMode 樂觀更新路徑）。
// =====================================================================
import { supabase, uploadProofImage } from '@/lib/supabase';
import { logEvent } from '@/lib/clientLog';
import { removeStorageImageByUrl } from '@/lib/helpers';
import { calculateLevelFromExp } from '@/lib/levelLogic';
import {
  Profile, Submission, Task, Mission, ScoreLog, StudentNote, CourseAttendance,
  UserPet, PetStage, PetLine, MissionTemplate, Batch, Course, SubmissionStatus,
} from '@/types';

interface Deps {
  // state
  currentUser: Profile | null;
  viewAsUserId: string | null;
  profiles: Profile[];
  tasks: Task[];
  missions: Mission[];
  submissions: Submission[];
  gmMode: boolean;
  notes: StudentNote[];
  attendance: CourseAttendance[];
  courses: Course[];
  userPets: UserPet[];
  petStages: PetStage[];
  petLines: PetLine[];
  missionTemplates: MissionTemplate[];
  batches: Batch[];
  scoreLogs: ScoreLog[];
  // ref
  checkInLock: React.MutableRefObject<Set<string>>;
  // setters
  setSubmissions: React.Dispatch<React.SetStateAction<Submission[]>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<Profile | null>>;
  setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>;
  setUserPets: React.Dispatch<React.SetStateAction<UserPet[]>>;
  setScoreLogs: React.Dispatch<React.SetStateAction<ScoreLog[]>>;
  setAttendance: React.Dispatch<React.SetStateAction<CourseAttendance[]>>;
  setNotes: React.Dispatch<React.SetStateAction<StudentNote[]>>;
  setViewState: (v: any) => void;
  setIsSyncing: (v: boolean) => void;
  // ui feedback
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  triggerConfetti: () => void;
  triggerScoreFloat: (text: string) => void;
  // data
  fetchData: () => Promise<any>;
}

export function useGameActions(d: Deps) {
  const {
    currentUser, viewAsUserId, profiles, tasks, missions, submissions, gmMode,
    notes, attendance, courses, userPets, petStages, petLines, missionTemplates, batches,
    scoreLogs, checkInLock,
    setSubmissions, setCurrentUser, setProfiles, setUserPets, setScoreLogs,
    setAttendance, setNotes, setViewState, setIsSyncing,
    showToast, triggerConfetti, triggerScoreFloat, fetchData,
  } = d;

  const handleCheckIn = async (taskId: string, proofText?: string, proofImg?: string, proofLink?: string, shareToWitness?: boolean) => {
    if (!currentUser) return;

    // 先在 tasks 找，找不到再去 missions 找（期數任務）
    const task = tasks.find(t => t.id === taskId);
    const mission = !task ? missions.find(m => m.id === taskId) : null;

    if (!task && !mission) return;

    const requiresApproval = task ? task.requires_approval : mission!.review_type !== 'auto';
    const points = task ? task.score : mission!.points;
    const title = task ? task.name : mission!.title;

    // 操作對象：檢視某學員時 = 該學員；平常 = 登入者自己
    const actingUser = (viewAsUserId ? profiles.find(p => p.id === viewAsUserId) : null) || currentUser;

    // 🛡️ 防呆：同一任務、心得內容「一模一樣」時不允許再送 —— 擋掉不小心重複上傳的同一筆。
    //    內容不同（真的是不同人/不同貼文）照樣能送，不影響「可多次完成」任務的正常使用。
    const newProof = (proofText || '').trim();
    if (newProof && submissions.some(
      s => s.mission_id === taskId &&
           s.student_id === actingUser.id &&
           s.status !== 'rejected' &&
           (s.proof_text || '').trim() === newProof
    )) {
      showToast('這筆心得內容跟之前送過的一樣，請勿重複上傳', 'info');
      return;
    }

    // 防連點：同一任務正在送出時，忽略重複觸發
    if (checkInLock.current.has(taskId)) return;
    // 防重複打卡：已達可完成次數就擋下（避免重複加分）。
    // max_completions：null/未設 → 1 次；0（或負數）→ 無限次（與畫面、隊長端一致）
    const maxCompletions = (task ? task.max_completions : mission!.max_completions) ?? 1;
    const completionLimit = maxCompletions <= 0 ? Infinity : maxCompletions;
    const priorCount = submissions.filter(
      s => s.mission_id === taskId && s.student_id === actingUser.id && s.status !== 'rejected'
    ).length;
    if (priorCount >= completionLimit) {
      showToast('這個任務已經完成囉，不用重複打卡 😊', 'info');
      return;
    }
    checkInLock.current.add(taskId);

    const submissionData = {
      id: crypto.randomUUID(),
      mission_id: taskId,
      student_id: actingUser.id,
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
        share_to_witness: requiresApproval && !!shareToWitness,
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
            const nextLv = calculateLevelFromExp(nextExp);
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
      // 失敗時記錄到本機 → 讓「明細 → 任務審核」看得到這筆失敗與原因(學員才知道要重傳)。
      const recordFailed = (reason: string) => {
        try {
          const k = `nlp_failed_subs_${actingUser.id}`;
          const list = JSON.parse(localStorage.getItem(k) || '[]');
          list.unshift({ id: `fail-${Date.now()}`, mission_id: taskId, task_name: mission?.title || '任務', reason, created_at: new Date().toISOString() });
          localStorage.setItem(k, JSON.stringify(list.slice(0, 20)));
        } catch { /* 忽略 */ }
      };

      // 證明圖片若為 base64，先上傳到 Storage 換成公開 URL（避免把大圖塞進 DB 欄位）
      const uploadedImg = await uploadProofImage(submissionData.proof_image_url);
      // 有給圖片但上傳失敗(回 null)→ 不送出「沒圖的證明」,記錄失敗讓學員重傳。
      if (typeof submissionData.proof_image_url === 'string' && submissionData.proof_image_url.startsWith('data:') && !uploadedImg) {
        recordFailed('圖片上傳失敗(可能網路不穩或圖片太大),請重新上傳一次');
        logEvent('upload_fail', mission?.title || taskId, actingUser.name);
        showToast('圖片上傳失敗,請重新上傳一次 🙏', 'error');
        checkInLock.current.delete(taskId);
        return;
      }
      const { error: insertError } = await supabase
        .from('submissions')
        .insert({ ...submissionData, proof_image_url: uploadedImg });
      if (insertError) {
        console.error('[CheckIn] submissions insert error:', insertError);
        recordFailed(insertError.message || '送出失敗,請稍後再試');
        logEvent('submit_fail', `${mission?.title || taskId}:${insertError.message || ''}`, actingUser.name);
        // 安全鎖擋下通常代表「登入身分失效/未綁定」→ 引導重新登入，而非顯示嚇人的安全訊息
        if (/\[安全\]|只能為自己|row-level security/i.test(insertError.message || '')) {
          showToast('您的登入似乎已過期，請重新登入後再打卡 🙏', 'error');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('nlp_mock_user_id');
            localStorage.removeItem('nlp_session');
          }
          try { await supabase.auth.signOut(); } catch { /* 忽略 */ }
          setViewState('login');
        } else {
          showToast(`❌ 打卡失敗：${insertError.message}`, 'error');
        }
        return;
      }
      // 送出成功 → 清掉這個任務先前的失敗紀錄(避免一直顯示舊失敗)。
      try {
        const k = `nlp_failed_subs_${actingUser.id}`;
        const kept = JSON.parse(localStorage.getItem(k) || '[]').filter((f: any) => f.mission_id !== taskId);
        localStorage.setItem(k, JSON.stringify(kept));
      } catch { /* 忽略 */ }
      // ⚡ 立刻把「這筆新提交」加進畫面 → 任務卡馬上顯示「完成 / 已送審」,
      //    不必等下方背景 fetchData() 把所有表重撈完(那要好幾秒,就是延遲感的來源)。
      setSubmissions(prev => [{
        ...submissionData,
        proof_image_url: uploadedImg,
        mission: mission || undefined,
        profile: actingUser,
      } as any, ...prev]);

      // 樂觀更新 UI (Optimistic Update) — 對 actingUser（被檢視學員或自己）
      if (!requiresApproval) {
        const nextScore = (actingUser.score || 0) + points;
        setProfiles(prev => prev.map(p => p.id === actingUser.id ? { ...p, score: nextScore } : p));
        // 若操作對象就是登入者本人，同步 currentUser
        if (actingUser.id === currentUser.id) {
          setCurrentUser({ ...currentUser, score: nextScore });
        }

        setUserPets(prev => prev.map(up => {
          if (up.student_id === actingUser.id) {
            const nextExp = up.total_exp + points;
            const nextLv = calculateLevelFromExp(nextExp);
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

      // 連勝里程碑加分：只對「每日定課」結算。後台 claim_streak_bonus 會算連勝、
      // 達標自動加分(7天+200 / 14天+500 / 30天+1000)並防重複(同里程碑只給一次)。
      const isDailyMission = mission?.mission_type === 'daily';
      const bonusTask = isDailyMission
        // ⚠️ 補打卡改「手動」後,不再於打卡時自動用護盾(避免自動扣次數);連勝里程碑照常結算。
        ? supabase.rpc('claim_streak_bonus', { p_student_id: actingUser.id })
            .then(({ data, error }: { data: any; error: any }) => {
              if (error) { console.error('[StreakBonus] claim error:', error); return; }
              const awarded = data?.awarded as Array<{ threshold: number; bonus: number }> | undefined;
              if (awarded && awarded.length > 0) {
                const a = awarded[awarded.length - 1]; // 一次最多跨一個門檻，取最高那筆顯示
                showToast(`🔥 連勝 ${a.threshold} 天達成！額外獲得 +${a.bonus} 分獎勵！`, 'success');
                triggerConfetti();
              }
            })
            .catch((err: any) => console.error('[StreakBonus] unexpected:', err))
        : Promise.resolve();

      // 讓畫面先反應，背後慢慢重抓資料 (不阻擋 async return)
      bonusTask.finally(() => fetchData().catch(console.error));

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
    const actingUser = (viewAsUserId ? profiles.find(p => p.id === viewAsUserId) : null) || currentUser;

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

    const { error: regErr } = await supabase.from('course_attendance').insert({
      course_id: courseId,
      student_id: actingUser.id,
      status: 'registered',
      attended_at: null
    });
    if (regErr) {
      console.error('課程報名失敗:', regErr);
      showToast('報名沒有成功,請稍後再試或重新登入 🙏', 'error');
      return;
    }
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

    const { error: noteErr } = existing
      ? await supabase
          .from('student_notes')
          .update({ note: noteText, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
      : await supabase.from('student_notes').insert({
          student_id: studentId,
          captain_id: currentUser.id,
          note: noteText,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    if (noteErr) {
      console.error('儲存備註失敗:', noteErr);
      showToast('備註沒有存成功,請稍後再試 🙏', 'error');
      return;
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

      const oldApproved = sub.status === 'approved';
      const oldShared = oldApproved && !!sub.share_to_witness && sub.mission_id !== 'task-custom-post';
      const newApproved = status === 'approved';
      const newShared = newApproved && !!shareToWitness && sub.mission_id !== 'task-custom-post';

      let witnessDiff = 0;
      if (newShared && !oldShared) {
        witnessDiff = 200;
      } else if (oldShared && !newShared) {
        const prevLog = scoreLogs.find(l => l.submission_id === submissionId && l.reason === '入選見證牆獎勵');
        witnessDiff = prevLog ? -prevLog.amount : -200;
      }

      const totalDiff = scoreDiff + witnessDiff;

      setSubmissions(prev => prev.map(s => s.id === submissionId ? {
        ...s,
        status,
        score_awarded: status === 'approved' ? (sub.score_awarded || points) : 0,
        share_to_witness: status === 'approved' ? !!shareToWitness : false,
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString()
      } : s));

      if (totalDiff !== 0) {
        setProfiles(prev => prev.map(p => {
          if (p.id === sub.student_id) {
            const nextScore = p.score + totalDiff;
            if (currentUser && p.id === currentUser.id) {
              setCurrentUser(prevUser => prevUser ? { ...prevUser, score: nextScore } : null);
            }
            return { ...p, score: nextScore };
          }
          return p;
        }));

        setUserPets(prev => prev.map(up => {
          if (up.student_id === sub.student_id) {
            const nextExp = up.total_exp + totalDiff;
            const nextLv = calculateLevelFromExp(nextExp);
            return { ...up, total_exp: nextExp, level: nextLv, updated_at: new Date().toISOString() };
          }
          return up;
        }));

        const newLogs: ScoreLog[] = [];
        if (scoreDiff !== 0) {
          newLogs.push({
            id: `mock-log-${Date.now()}-1`,
            student_id: sub.student_id,
            amount: scoreDiff,
            reason: scoreDiff > 0 ? `完成任務: ${title}` : `取消已核准任務: ${title}`,
            submission_id: submissionId,
            created_by: currentUser.id,
            created_at: new Date().toISOString(),
            profile: profiles.find(p => p.id === sub.student_id)
          });
        }
        if (witnessDiff !== 0) {
          newLogs.push({
            id: `mock-log-${Date.now()}-2`,
            student_id: sub.student_id,
            amount: witnessDiff,
            reason: witnessDiff > 0 ? `入選見證牆獎勵` : `取消入選見證牆獎勵`,
            submission_id: submissionId,
            created_by: currentUser.id,
            created_at: new Date().toISOString(),
            profile: profiles.find(p => p.id === sub.student_id)
          });
        }
        if (newLogs.length > 0) {
          setScoreLogs(prev => [...newLogs, ...prev]);
        }
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
    // ⚠️ 必須檢查 error:Supabase 失敗回 {error} 不 throw,否則下面樂觀加分會「假成功」。
    const { error: reviewErr } = await supabase
      .from('submissions')
      .update(updatePayload)
      .eq('id', submissionId);
    if (reviewErr) {
      console.error('審核更新失敗:', reviewErr);
      showToast('審核沒有成功,請確認網路連線或重新登入後再試 🙏', 'error');
      return;
    }

    // ⚡ 樂觀更新本地狀態，取代「每審一筆就 fetchData() 全撈」——
    //    大隊長全撈資料量大，每筆重載會明顯變慢。改為直接在畫面套用結果。
    //    真正的分數由資料庫觸發器負責；這裡只是同步畫面，與觸發器邏輯一致。
    if (sub) {
      setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, ...updatePayload } : s));
      const nonCustom = sub.mission_id !== 'task-custom-post';
      // 待審→通過：加分（基礎分 + 上見證牆 200）；已核准→退回：扣回；其餘 0
      const bonus =
        (sub.status !== 'approved' && status === 'approved')
          ? points + ((shareToWitness && nonCustom) ? 200 : 0)
          : (sub.status === 'approved' && status !== 'approved')
            ? -((sub.score_awarded || 0) + ((sub.share_to_witness && nonCustom) ? 200 : 0))
            : 0;
      if (bonus !== 0) {
        setProfiles(prev => prev.map(p => {
          if (p.id === sub.student_id) {
            const nextScore = p.score + bonus;
            if (currentUser && p.id === currentUser.id) setCurrentUser(u => u ? { ...u, score: nextScore } : null);
            return { ...p, score: nextScore };
          }
          return p;
        }));
        setUserPets(prev => prev.map(up => up.student_id === sub.student_id
          ? { ...up, total_exp: up.total_exp + bonus, level: calculateLevelFromExp(up.total_exp + bonus), updated_at: new Date().toISOString() }
          : up));
      }
    }
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
            const nextLv = calculateLevelFromExp(nextExp);
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
            const nextLv = calculateLevelFromExp(nextExp);
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
            const nextLv = calculateLevelFromExp(nextExp);
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

  const handleHideWitness = async (submissionId: string) => {
    if (gmMode) {
      const sub = submissions.find(s => s.id === submissionId);
      if (sub && sub.status === 'approved' && sub.share_to_witness && sub.mission_id !== 'task-custom-post') {
        const prevLog = scoreLogs.find(l => l.submission_id === submissionId && l.reason === '入選見證牆獎勵');
        const deductAmt = prevLog ? prevLog.amount : 200;

        // Deduct EXP
        setProfiles(prev => prev.map(p => {
          if (p.id === sub.student_id) {
            const nextScore = p.score - deductAmt;
            if (currentUser && p.id === currentUser.id) {
              setCurrentUser(prevUser => prevUser ? { ...prevUser, score: nextScore } : null);
            }
            return { ...p, score: nextScore };
          }
          return p;
        }));

        setUserPets(prev => prev.map(up => {
          if (up.student_id === sub.student_id) {
            const nextExp = up.total_exp - deductAmt;
            const nextLv = calculateLevelFromExp(nextExp);
            return { ...up, total_exp: nextExp, level: nextLv, updated_at: new Date().toISOString() };
          }
          return up;
        }));

        const newLog: ScoreLog = {
          id: `mock-log-${Date.now()}`,
          student_id: sub.student_id,
          amount: -deductAmt,
          reason: '取消入選見證牆獎勵',
          submission_id: submissionId,
          created_by: currentUser?.id || 'admin',
          created_at: new Date().toISOString(),
          profile: profiles.find(p => p.id === sub.student_id)
        };
        setScoreLogs(prev => [newLog, ...prev]);
      }

      setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, share_to_witness: false } : s));
      return;
    }

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
  const handleDeleteWitness = async (submissionId: string) => {
    if (gmMode) {
      const sub = submissions.find(s => s.id === submissionId);
      if (!sub) return;
      const isSocialPost = sub.mission_id === 'task-custom-post';

      if (isSocialPost) {
        // 純分享貼文：與任務無關 → 整筆刪除。
        setSubmissions(prev => prev.filter(s => s.id !== submissionId));
      } else {
        // 任務打卡：只刪「照片」釋放空間，保留任務完成與經驗（不刪資料列、不碰分數）。
        // 但因為 share_to_witness 變 false，所以如果是 approved 且本來是 true，則要扣回 300
        if (sub.status === 'approved' && sub.share_to_witness && sub.mission_id !== 'task-custom-post') {
          const prevLog = scoreLogs.find(l => l.submission_id === submissionId && l.reason === '入選見證牆獎勵');
          const deductAmt = prevLog ? prevLog.amount : 200;

          // Deduct EXP
          setProfiles(prev => prev.map(p => {
            if (p.id === sub.student_id) {
              const nextScore = p.score - deductAmt;
              if (currentUser && p.id === currentUser.id) {
                setCurrentUser(prevUser => prevUser ? { ...prevUser, score: nextScore } : null);
              }
              return { ...p, score: nextScore };
            }
            return p;
          }));

          setUserPets(prev => prev.map(up => {
            if (up.student_id === sub.student_id) {
              const nextExp = up.total_exp - deductAmt;
              const nextLv = calculateLevelFromExp(nextExp);
              return { ...up, total_exp: nextExp, level: nextLv, updated_at: new Date().toISOString() };
            }
            return up;
          }));

          const newLog: ScoreLog = {
            id: `mock-log-${Date.now()}`,
            student_id: sub.student_id,
            amount: -deductAmt,
            reason: '取消入選見證牆獎勵',
            submission_id: submissionId,
            created_by: currentUser?.id || 'admin',
            created_at: new Date().toISOString(),
            profile: profiles.find(p => p.id === sub.student_id)
          };
          setScoreLogs(prev => [newLog, ...prev]);
        }

        setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, proof_image_url: null, share_to_witness: false } : s));
      }
      return;
    }

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
        level: calculateLevelFromExp(exp),
        pet_line: lineKey,
        current_stage_index: Math.min(2, maxStage), // 第一次進化：蛋(1) → 第 2 階
        has_pending_evolution: false,
        evolved_at: new Date().toISOString()
      });
    }
    await fetchData();
    triggerConfetti();
    showToast('神獸進化成功！恭喜您獲得全新形態！🎉', 'success');
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
        level: calculateLevelFromExp(exp),
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

  return {
    handleCheckIn, handleRegisterCourse, handleSaveNote, handleReviewSubmission,
    handleToggleCell, handleHideWitness, handleDeleteWitness,
    handleEvolvePet, handleSelectEvolutionLine, handleMarkAttendance,
  };
}

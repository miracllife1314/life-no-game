'use client';

// 「資料表 state」集中管理:原本散在 app/page.tsx 的 25 個資料表 useState,
// 與 fetchData 內的 applyTables(AllTables → 畫面 state)純搬移到這裡,行為完全不變。
// applyTables 原本定義在 fetchData 閉包內,引用了 loadedProfile / currentUser / setUserEnrollments,
// 搬出後改由呼叫端以 extra 參數傳入(activeProfile = loadedProfile || currentUser),確保行為一致。

import React, { useState, useCallback } from 'react';
import { computeJoinedData } from '@/services/joinData';
import { authHeaders } from '@/lib/authToken';
import {
  Profile, Team, Task, Submission, ScoreLog,
  Course, CourseAttendance, Achievement, UserAchievement,
  Announcement, StudentNote,
  Pet, UserPet, Card, Deck, DeckCard, UserDeck, Batch, MissionTemplate, BatchMissionTemplate, Mission, PetLine, PetStage, CaptainCandidate, SquadRoleDef
} from '@/types';

export function useTables() {
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

  // 把「AllTables → 畫面 state」抽成函式，供 SWR 兩次呼叫(先快取、後最新)。行為與原本完全一致。
  const applyTables = useCallback((t: any, extra: {
    activeProfile: Profile | null;
    setUserEnrollments: React.Dispatch<React.SetStateAction<Profile[]>>;
  }) => {
    const { activeProfile, setUserEnrollments } = extra;
    const {
      batchesList, templatesList, rulesList, profilesList, teamsList, tasksList,
      subsList, coursesList, attendanceList, achsList, userAchsList, annsList,
      notesList, scoreLogsList, petsList, userPetsList, cardsList, decksList,
      deckCardsList, userDecksList, missionsList, petLinesList, petStagesList,
      candidatesList, squadRolesList,
    } = t;

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

      if (activeProfile) {
        // 前端比對（退路）：profile_id 或 phone 任一相符。
        // ⚠️ batch① 後非管理員讀的視圖無 phone、且各期 profile_id/角色不一定相同，
        //    前端常湊不齊 → 優先改用伺服器權威查詢（用自己的 id 反查手機再撈各期）。
        const clientEnrolls = mappedProfiles.filter((p: any) =>
          (activeProfile.profile_id && p.profile_id && p.profile_id === activeProfile.profile_id) ||
          (activeProfile.phone && p.phone && p.phone === activeProfile.phone) ||
          (!activeProfile.profile_id && !activeProfile.phone && p.name === activeProfile.name)
        );
        // 先用前端比對結果（即時顯示），再用伺服器權威結果覆蓋（回來才更新）。
        setUserEnrollments(clientEnrolls);
        authHeaders({ 'Content-Type': 'application/json' }).then((h) =>
          fetch('/api/auth/my-enrollments', {
            method: 'POST',
            headers: h,
            body: JSON.stringify({ id: activeProfile.id }),
          }))
          .then((res: Response | null) => (res && res.ok ? res.json() : null))
          .then((j: any) => {
            if (j && Array.isArray(j.enrollments) && j.enrollments.length > 0) {
              setUserEnrollments(j.enrollments);
            }
          })
          .catch(() => { /* API 失敗則保留前端比對結果 */ });
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

    // ---- 在 JS 端補上巢狀關聯（抽到 services/joinData.ts，行為不變）----
    const {
      joinedMissions, joinedSubs, joinedAttendance, joinedUserAchs, joinedNotes,
      joinedRules, joinedDeckCards, joinedUserDecks, joinedUserPets, joinedCandidates,
    } = computeJoinedData({
      profArr: mappedProfiles, finalMissions,
      batchesList, templatesList, subsList, attendanceList, coursesList, userAchsList,
      achsList, notesList, rulesList, deckCardsList, cardsList, userDecksList, decksList,
      userPetsList, petStagesList, candidatesList,
    });

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
    // 只在「有資料」時覆蓋:大隊長走延後載入(回空陣列),不可用空陣列把已載入的歷程蓋掉。
    if (scoreLogsList && scoreLogsList.length > 0) setScoreLogs(scoreLogsList);
    if (petsList) setPets(petsList);
    if (cardsList) setCards(cardsList);
    if (decksList) setDecks(decksList);
    if (petLinesList) setPetLines(petLinesList);
    if (petStagesList) setPetStages(petStagesList);
    if (candidatesList) setCaptainCandidates(candidatesList);
    if (squadRolesList) setSquadRoles(squadRolesList);

    setCaptainCandidates(joinedCandidates);
  }, []);

  return {
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
  };
}

// =====================================================================
// 集中管理 Supabase 讀取查詢（P0：分流讀取，避免一次撈 25 張全表）
//
// 策略：
//  - 大隊長(admin)：維持「全撈」（後台需要全部資料）。
//  - 學員/隊長：只撈「自己這一期」需要的資料：
//      * 大表(submissions / score_logs / user_pets / user_achievements /
//        course_attendance / student_notes) 用 `student_id in 本期學員` 過濾。
//      * missions / tasks / announcements 加 batch_id。
//      * profiles 仍全撈（排行榜神人榜需要跨期）。
//      * 6 張純後台表(batch_mission_templates / cards / decks / deck_cards /
//        user_decks / captain_candidates) 直接跳過（回空陣列）。
//
// 回傳的欄位名稱與 page.tsx 既有的 *List 變數一致，呼叫端可直接解構。
// =====================================================================

import { supabase } from '@/lib/supabase';

const EMPTY = { data: [] as any[] };
const d = (res: any) => res?.data ?? [];

export interface AllTables {
  batchesList: any[]; templatesList: any[]; rulesList: any[]; profilesList: any[];
  teamsList: any[]; tasksList: any[]; subsList: any[]; coursesList: any[];
  attendanceList: any[]; achsList: any[]; userAchsList: any[]; annsList: any[];
  notesList: any[]; scoreLogsList: any[]; petsList: any[]; userPetsList: any[];
  cardsList: any[]; decksList: any[]; deckCardsList: any[]; userDecksList: any[];
  missionsList: any[]; petLinesList: any[]; petStagesList: any[];
  candidatesList: any[]; squadRolesList: any[];
}

// 大隊長 / 無期數情境：全撈（維持原行為）
async function fetchFull(): Promise<AllTables> {
  const [
    batches, templates, rules, profiles, teams, tasks, subs, courses, attendance,
    achs, userAchs, anns, notes, scoreLogs, pets, userPets, cards, decks,
    deckCards, userDecks, missions, petLines, petStages, candidates, squadRoles,
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
    // score_logs 僅用於「顯示歷史」（不參與計分，分數真相在 profiles.score）→ 只撈最近 5000 筆，
    // 避免大量學員時撈回十萬筆拖慢載入與 JS 拼接。時間倒序取最近。
    supabase.from('score_logs').select('*').order('created_at', { ascending: false }).limit(5000),
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
  return {
    batchesList: d(batches), templatesList: d(templates), rulesList: d(rules), profilesList: d(profiles),
    teamsList: d(teams), tasksList: d(tasks), subsList: d(subs), coursesList: d(courses),
    attendanceList: d(attendance), achsList: d(achs), userAchsList: d(userAchs), annsList: d(anns),
    notesList: d(notes), scoreLogsList: d(scoreLogs), petsList: d(pets), userPetsList: d(userPets),
    cardsList: d(cards), decksList: d(decks), deckCardsList: d(deckCards), userDecksList: d(userDecks),
    missionsList: d(missions), petLinesList: d(petLines), petStagesList: d(petStages),
    candidatesList: d(candidates), squadRolesList: d(squadRoles),
  };
}

// 學員 / 隊長情境：只撈自己這一期需要的資料
async function fetchScoped(batchId: string): Promise<AllTables> {
  // 第一批：參考表 + 全體 profiles（排行榜需要）+ 本期任務/公告
  const [
    batches, teams, profiles, pets, petLines, petStages, achs, templates, squadRoles,
    missions, tasks, courses, anns,
  ] = await Promise.all([
    supabase.from('batches').select('*'),
    supabase.from('teams').select('*'),
    supabase.from('profiles').select('*'),                                   // 全撈：神人榜/姓名
    supabase.from('pets').select('*'),
    supabase.from('pet_lines').select('*'),
    supabase.from('pet_stages').select('*'),
    supabase.from('achievements').select('*'),
    supabase.from('mission_templates').select('*'),                          // 小，進化線會用
    supabase.from('squad_roles').select('*').order('created_at', { ascending: true }),
    supabase.from('missions').select('*').eq('batch_id', batchId),           // 本期任務
    supabase.from('tasks').select('*'),                                      // 極少(1-3)
    supabase.from('courses').select('*'),                                    // 小(公開+本期)
    supabase.from('announcements').select('*'),                              // 小
  ]);

  // 本期學員 id（給大表 in-list 過濾用）
  const batchStudentIds: string[] = (d(profiles) as any[])
    .filter((p) => p.batch_id === batchId)
    .map((p) => p.id);
  const hasIds = batchStudentIds.length > 0;

  // 第二批：大表，只撈本期學員的，以及所有入選見證牆的提交
  const [subsCurrentBatch, subsWitness, scoreLogs, userPets, userAchs, attendance, notes] = await Promise.all([
    hasIds ? supabase.from('submissions').select('*').in('student_id', batchStudentIds) : EMPTY,
    supabase.from('submissions').select('*').eq('status', 'approved').or('share_to_witness.eq.true,mission_id.eq.task-custom-post'),
    hasIds ? supabase.from('score_logs').select('*').in('student_id', batchStudentIds) : EMPTY,
    hasIds ? supabase.from('user_pets').select('*').in('student_id', batchStudentIds) : EMPTY,
    hasIds ? supabase.from('user_achievements').select('*').in('student_id', batchStudentIds) : EMPTY,
    hasIds ? supabase.from('course_attendance').select('*').in('student_id', batchStudentIds) : EMPTY,
    hasIds ? supabase.from('student_notes').select('*').in('student_id', batchStudentIds) : EMPTY,
  ]);

  // 合併並去重 submissions
  const mergedSubsMap = new Map<string, any>();
  d(subsCurrentBatch).forEach((s: any) => mergedSubsMap.set(s.id, s));
  d(subsWitness).forEach((s: any) => mergedSubsMap.set(s.id, s));
  const subsList = Array.from(mergedSubsMap.values());

  return {
    batchesList: d(batches), teamsList: d(teams), profilesList: d(profiles),
    petsList: d(pets), petLinesList: d(petLines), petStagesList: d(petStages),
    achsList: d(achs), templatesList: d(templates), squadRolesList: d(squadRoles),
    missionsList: d(missions), tasksList: d(tasks), coursesList: d(courses), annsList: d(anns),
    subsList, scoreLogsList: d(scoreLogs), userPetsList: d(userPets),
    userAchsList: d(userAchs), attendanceList: d(attendance), notesList: d(notes),
    // 純後台表：學員/隊長不需要 → 跳過
    rulesList: [], cardsList: [], decksList: [], deckCardsList: [], userDecksList: [], candidatesList: [],
  };
}

export async function fetchAllTables(opts: { batchId?: string | null; isAdmin?: boolean }): Promise<AllTables> {
  const useScoped = !opts.isAdmin && !!opts.batchId;
  return useScoped ? fetchScoped(opts.batchId as string) : fetchFull();
}

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
    subsImg, subsPending,
  ] = await Promise.all([
    supabase.from('batches').select('*'),
    supabase.from('mission_templates').select('*'),
    supabase.from('batch_mission_templates').select('*'),
    supabase.from('profiles').select('*'),
    supabase.from('teams').select('*'),
    supabase.from('tasks').select('*'),
    // ⚡ 不撈 proof_image_url（可能含 base64 整張圖、極肥，曾測到 ~10MB）；圖片另在下方只補「要顯示」的列。
    // ⚠️ submissions 已破 1000 筆;PostgREST 預設只回「最舊的 1000 筆」→ 會把最新的待審整批截掉,
    //    造成「學員提交了、後台卻沒有可審核任務」。改為『最新優先 + 拉高上限』,並在下方另撈「所有待審」保證不漏。
    supabase.from('submissions')
      .select('id,mission_id,task_id,student_id,proof_text,proof_link,status,score_awarded,reviewed_by,reviewed_at,share_to_witness,created_at')
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase.from('courses').select('*'),
    supabase.from('course_attendance').select('*'),
    supabase.from('achievements').select('*'),
    supabase.from('user_achievements').select('*'),
    supabase.from('announcements').select('*'),
    supabase.from('student_notes').select('*'),
    // score_logs 僅用於「顯示歷史」（不參與計分，分數真相在 profiles.score）。
    // ⚡ 大隊長登入「不載」score_logs（它是最慢的查詢之一，1200筆+排序）；
    //    改為切到「歷程 / 神隊管理」分頁時才載一次（見 app/page.tsx 的 loadScoreLogs）。
    Promise.resolve(EMPTY),
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
    // proof_image_url 另撈,排除 base64 肥圖(data:開頭，曾把 DB 撐到 10MB);
    // 正常 URL 圖很小(全部才 ~40KB)。⚡ 併進這個 Promise.all 一起並行,
    // 避免變成「撈完 25 表後再多等一次圖片」的序列等待(原本白白多花 ~0.8s)。
    supabase.from('submissions')
      .select('id,proof_image_url')
      .not('proof_image_url', 'is', null)
      .not('proof_image_url', 'like', 'data:%'),
    // ⚠️ 單獨撈「所有待審核」(不受上面 3000 上限/排序影響)→ 審核佇列永遠不漏一筆。
    supabase.from('submissions')
      .select('id,mission_id,task_id,student_id,proof_text,proof_link,status,score_awarded,reviewed_by,reviewed_at,share_to_witness,created_at')
      .eq('status', 'pending'),
  ]);

  // base64 那少數幾筆不載圖(避免肥)，可日後搬到 Storage 修復。畫面其餘列圖正常顯示。
  const imgMap = new Map((d(subsImg) as any[]).map((r: any) => [r.id, r.proof_image_url]));
  // 合併「最新提交」+「所有待審」並去重(待審絕不漏),再補回圖片。
  const mergedSubs = new Map<string, any>();
  (d(subs) as any[]).forEach((s: any) => mergedSubs.set(s.id, s));
  (d(subsPending) as any[]).forEach((s: any) => mergedSubs.set(s.id, s));
  const subsList = Array.from(mergedSubs.values()).map((s: any) => ({ ...s, proof_image_url: imgMap.get(s.id) ?? null }));

  return {
    batchesList: d(batches), templatesList: d(templates), rulesList: d(rules), profilesList: d(profiles),
    teamsList: d(teams), tasksList: d(tasks), subsList, coursesList: d(courses),
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
    supabase.from('v_public_profiles').select('*'),                          // 全撈：神人榜/姓名（無手機敏感欄位）
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

  // ⚠️ 不撈 proof_image_url（可能含 base64 整張圖、極肥；那 11 筆會讓學員一次下載 ~10MB、手機轉很久）。
  //    圖片另在下方只補「非 base64 的 URL 圖」（很小）。與大隊長 fetchFull 同一套做法。
  const SUB_COLS = 'id,mission_id,task_id,student_id,proof_text,proof_link,status,score_awarded,reviewed_by,reviewed_at,share_to_witness,created_at';
  // 第二批：大表，只撈本期學員的，以及所有入選見證牆的提交
  const [subsCurrentBatch, subsWitness, subsImgBatch, subsImgWitness, scoreLogs, userPets, userAchs, attendance, notes] = await Promise.all([
    // 最新優先 + 拉高上限:避免某期提交多時被 PostgREST 預設 1000 筆截掉最新待審(隊長也審核)。
    hasIds ? supabase.from('submissions').select(SUB_COLS).in('student_id', batchStudentIds).order('created_at', { ascending: false }).limit(5000) : EMPTY,
    supabase.from('submissions')
      .select(SUB_COLS)
      .eq('status', 'approved')
      .or('share_to_witness.eq.true,mission_id.eq.task-custom-post')
      .order('created_at', { ascending: false })
      .limit(300),
    // proof_image_url 另撈、排除 base64 肥圖(只載正常 URL 圖,很小)
    hasIds ? supabase.from('submissions').select('id,proof_image_url').in('student_id', batchStudentIds).not('proof_image_url', 'is', null).not('proof_image_url', 'like', 'data:%') : EMPTY,
    supabase.from('submissions').select('id,proof_image_url').eq('status', 'approved').or('share_to_witness.eq.true,mission_id.eq.task-custom-post').not('proof_image_url', 'is', null).not('proof_image_url', 'like', 'data:%').limit(300),
    hasIds ? supabase.from('score_logs').select('*').in('student_id', batchStudentIds) : EMPTY,
    hasIds ? supabase.from('user_pets').select('*').in('student_id', batchStudentIds) : EMPTY,
    hasIds ? supabase.from('user_achievements').select('*').in('student_id', batchStudentIds) : EMPTY,
    hasIds ? supabase.from('course_attendance').select('*').in('student_id', batchStudentIds) : EMPTY,
    hasIds ? supabase.from('student_notes').select('*').in('student_id', batchStudentIds) : EMPTY,
  ]);

  // 合併並去重 submissions,並補回（非 base64 的）圖片。
  const imgMap = new Map<string, any>();
  (d(subsImgBatch) as any[]).forEach((r: any) => imgMap.set(r.id, r.proof_image_url));
  (d(subsImgWitness) as any[]).forEach((r: any) => imgMap.set(r.id, r.proof_image_url));
  const mergedSubsMap = new Map<string, any>();
  d(subsCurrentBatch).forEach((s: any) => mergedSubsMap.set(s.id, { ...s, proof_image_url: imgMap.get(s.id) ?? null }));
  d(subsWitness).forEach((s: any) => mergedSubsMap.set(s.id, { ...s, proof_image_url: imgMap.get(s.id) ?? null }));
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

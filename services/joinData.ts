// =====================================================================
// 在 JS 端補上「巢狀關聯」（PostgREST 不會自動 embed）。
// 純資料轉換、零副作用——從 app/page.tsx 的 fetchData 抽出，行為完全不變。
// =====================================================================
import { roleLabel } from '@/lib/helpers';

export interface JoinInputs {
  profArr: any[];
  finalMissions: any[];
  batchesList?: any[]; templatesList?: any[]; subsList?: any[]; attendanceList?: any[];
  coursesList?: any[]; userAchsList?: any[]; achsList?: any[]; notesList?: any[];
  rulesList?: any[]; deckCardsList?: any[]; cardsList?: any[]; userDecksList?: any[];
  decksList?: any[]; userPetsList?: any[]; petStagesList?: any[]; candidatesList?: any[];
}

export function computeJoinedData(a: JoinInputs) {
  const {
    profArr, finalMissions, batchesList, templatesList, subsList, attendanceList,
    coursesList, userAchsList, achsList, notesList, rulesList, deckCardsList, cardsList,
    userDecksList, decksList, userPetsList, petStagesList, candidatesList,
  } = a;

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
        created_at: stage.created_at,
      } : null,
      profile: profArr.find((p: any) => p.id === up.student_id),
    };
  };

  const joinedMissions = finalMissions.map((m: any) => ({
    ...m,
    batch: batchesList?.find((b: any) => b.id === m.batch_id),
    template: templatesList?.find((t: any) => t.id === m.template_id),
  }));
  const joinedSubs = (subsList || []).map((sub: any) => ({
    ...sub,
    mission: joinedMissions.find((m: any) => m.id === sub.mission_id),
    profile: profArr.find((p: any) => p.id === sub.student_id),
  }));
  const joinedAttendance = (attendanceList || []).map((att: any) => ({
    ...att,
    course: coursesList?.find((c: any) => c.id === att.course_id),
    profile: profArr.find((p: any) => p.id === att.student_id),
  }));
  const joinedUserAchs = (userAchsList || []).map((ua: any) => ({
    ...ua,
    achievement: achsList?.find((a2: any) => a2.id === ua.achievement_id),
  }));
  const joinedNotes = (notesList || []).map((sn: any) => ({
    ...sn,
    student: profArr.find((p: any) => p.id === sn.student_id),
  }));
  const joinedRules = (rulesList || []).map((bmt: any) => ({
    ...bmt,
    batch: batchesList?.find((b: any) => b.id === bmt.batch_id),
    template: templatesList?.find((t: any) => t.id === bmt.template_id),
  }));
  const joinedDeckCards = (deckCardsList || []).map((dc: any) => ({
    ...dc,
    card: cardsList?.find((c: any) => c.id === dc.card_id),
  }));
  const joinedUserDecks = (userDecksList || []).map((ud: any) => ({
    ...ud,
    deck: decksList?.find((d: any) => d.id === ud.deck_id),
  }));
  const joinedUserPets = (userPetsList || []).map(attachUserPet);

  // 小隊長候選：依 profile_id 帶出姓名/手機/曾參與期數/曾擔任角色
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

  return {
    joinedMissions, joinedSubs, joinedAttendance, joinedUserAchs, joinedNotes,
    joinedRules, joinedDeckCards, joinedUserDecks, joinedUserPets, joinedCandidates,
  };
}

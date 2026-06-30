// =====================================================================
// 後台雜項 CRUD：任務 / 候選人 / 任務範本 / 刪任務 / 手動調分 /
//   寵物·卡牌·牌組 —— 從 app/page.tsx 抽出，行為完全不變。
// =====================================================================
import { supabase } from '@/lib/supabase';
import { Task, MissionTemplate, Pet, Card, PetStage, PetLine, UserPet, Profile } from '@/types';

interface Deps {
  currentUser: Profile | null;
  setIsSyncing: (v: boolean) => void;
  fetchData: () => Promise<any>;
  userPets: UserPet[];
}

export function useAdminMisc({ currentUser, setIsSyncing, fetchData, userPets }: Deps) {
  // ---- 任務 ----
  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'created_by'>) => {
    if (!currentUser) return;
    const { error } = await supabase.from('tasks').insert({
      id: crypto.randomUUID(),
      ...taskData,
      created_by: currentUser.id,
      created_at: new Date().toISOString()
    });
    if (error) { console.error(error); alert('建立任務失敗：' + error.message); return; }
    await fetchData();
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) { console.error(error); alert('刪除任務失敗：' + error.message); return; }
    await fetchData();
  };

  // 編輯大會修行任務(tasks):只更新傳入的欄位,成功才刷新。回傳是否成功。
  const handleUpdateTask = async (taskId: string, updates: Partial<Task>): Promise<boolean> => {
    const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
    if (error) { console.error(error); alert('更新任務失敗：' + error.message); return false; }
    await fetchData();
    return true;
  };

  // ---- 小隊長候選人 ----
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

  // ---- 任務範本 ----
  const handleCreateMissionTemplate = async (templateData: Omit<MissionTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase.from('mission_templates').insert({
      id: crypto.randomUUID(),
      ...templateData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    if (error) { console.error(error); alert('建立任務範本失敗：' + error.message); return; }
    await fetchData();
    return data?.[0] || (Array.isArray(data) ? data[0] : data);
  };

  const handleUpdateMissionTemplate = async (templateId: string, templateData: Partial<MissionTemplate>) => {
    const { error } = await supabase
      .from('mission_templates')
      .update({
        ...templateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId);
    if (error) { console.error(error); alert('更新任務範本失敗：' + error.message); return; }
    // 同步「既有任務本體(missions)」的審核權限,避免後台改了範本、舊任務卻沒跟著變,
    // 造成「後台寫管理員審核、小隊長卻審得了」之類的不一致。
    // 只同步 review_type(審核權限);分數 points 等不自動回改,以免影響進行中任務的計分。
    if (templateData.review_type) {
      const { error: e2 } = await supabase
        .from('missions')
        .update({ review_type: templateData.review_type })
        .eq('template_id', templateId);
      if (e2) { console.error(e2); alert('同步任務審核權限失敗：' + e2.message); return; }
    }
    await fetchData();
  };

  const handleDeleteMissionTemplate = async (templateId: string) => {
    const { error: e1 } = await supabase.from('batch_mission_templates').delete().eq('template_id', templateId);
    if (e1) { console.error(e1); alert('刪除任務範本規則失敗：' + e1.message); return; }
    const { error: e2 } = await supabase.from('mission_templates').delete().eq('id', templateId);
    if (e2) { console.error(e2); alert('刪除任務範本失敗：' + e2.message); return; }
    await fetchData();
  };

  // ---- 刪任務 / 手動調分 ----
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

  // 編輯已產生的期數任務(missions):可改標題/描述/分數/發布·截止時間/狀態。
  // 只更新傳入欄位,成功才刷新;失敗跳提示不假成功。回傳是否成功。
  const handleUpdateMission = async (missionId: string, updates: Record<string, any>): Promise<boolean> => {
    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('missions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', missionId);
      if (error) throw new Error(error.message);
      await fetchData();
      return true;
    } catch (err: any) {
      console.error('更新任務失敗:', err);
      alert('更新任務失敗：' + (err?.message || '請稍後再試'));
      return false;
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

  // ---- 寵物 / 卡牌 / 牌組 ----
  const handleCreatePet = async (petData: Omit<Pet, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('pets').insert(petData);
    if (error) { console.error(error); alert('建立神獸失敗：' + error.message); return; }
    await fetchData();
  };

  const handleCreateCard = async (cardData: Omit<Card, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('cards').insert(cardData);
    if (error) { console.error(error); alert('建立卡牌失敗：' + error.message); return; }
    await fetchData();
  };

  const handleCreateDeck = async (name: string, isTemplate: boolean, cardIds: { cardId: string; count: number }[]) => {
    const deckId = 'deck-' + Math.random().toString(36).substring(2, 11);
    const { error: e1 } = await supabase.from('decks').insert({
      id: deckId,
      name,
      created_by: currentUser?.id || 'admin1',
      is_template: isTemplate
    });
    if (e1) { console.error(e1); alert('建立牌組失敗：' + e1.message); return; }

    const deckCardsToInsert = cardIds.map(c => ({
      deck_id: deckId,
      card_id: c.cardId,
      count: c.count
    }));
    const { error: e2 } = await supabase.from('deck_cards').insert(deckCardsToInsert);
    if (e2) { console.error(e2); alert('建立牌組卡牌失敗：' + e2.message); return; }
    await fetchData();
  };

  const handleAwardPetSkin = async (studentId: string, petId: string, skinName: string) => {
    const userPetRecord = userPets.find(up => up.student_id === studentId && up.pet_id === petId);
    if (userPetRecord) {
      const { error } = await supabase.from('user_pets').update({ current_skin: skinName }).eq('id', userPetRecord.id);
      if (error) { console.error(error); alert('授予神獸造型失敗：' + error.message); return; }
      await fetchData();
    }
  };

  const handleLevelUpPet = async (userPetId: string) => {
    const record = userPets.find(up => up.id === userPetId);
    if (record) {
      const { error } = await supabase.from('user_pets').update({ pet_level: (record.pet_level ?? 1) + 1 }).eq('id', userPetId);
      if (error) { console.error(error); alert('神獸升級失敗：' + error.message); return; }
      await fetchData();
    }
  };

  const handleUpdatePetStage = async (stageId: string, updatedFields: Partial<PetStage>) => {
    const { error } = await supabase.from('pet_stages').update(updatedFields).eq('id', stageId);
    if (error) { console.error(error); alert('更新神獸階段失敗：' + error.message); return; }
    await fetchData();
  };

  const handleUpdatePetLine = async (lineId: string, updatedFields: Partial<PetLine>) => {
    const { error } = await supabase.from('pet_lines').update(updatedFields).eq('id', lineId);
    if (error) { console.error(error); alert('更新神獸系列失敗：' + error.message); return; }
    await fetchData();
  };

  return {
    handleCreateTask, handleDeleteTask, handleUpdateTask,
    handleAddCaptainCandidate, handleUpdateCaptainCandidate, handleDeleteCaptainCandidate,
    handleCreateMissionTemplate, handleUpdateMissionTemplate, handleDeleteMissionTemplate,
    handleDeleteMission, handleUpdateMission, handleManualAdjustScore,
    handleCreatePet, handleCreateCard, handleCreateDeck,
    handleAwardPetSkin, handleLevelUpPet, handleUpdatePetStage, handleUpdatePetLine,
  };
}

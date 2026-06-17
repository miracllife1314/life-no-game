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

  return {
    handleCreateTask, handleDeleteTask,
    handleAddCaptainCandidate, handleUpdateCaptainCandidate, handleDeleteCaptainCandidate,
    handleCreateMissionTemplate, handleUpdateMissionTemplate, handleDeleteMissionTemplate,
    handleDeleteMission, handleManualAdjustScore,
    handleCreatePet, handleCreateCard, handleCreateDeck,
    handleAwardPetSkin, handleLevelUpPet, handleUpdatePetStage, handleUpdatePetLine,
  };
}

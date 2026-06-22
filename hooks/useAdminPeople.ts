// =====================================================================
// 後台人事管理：學員/帳號 / 隊伍設定 / 指派 / 期數(批次) CRUD
//   —— 從 app/page.tsx 抽出，行為完全不變。
// =====================================================================
import { supabase } from '@/lib/supabase';
import { getChineseNumber } from '@/lib/helpers';
import { Profile, Team, Batch, UserRole } from '@/types';

interface Deps {
  setIsSyncing: (v: boolean) => void;
  fetchData: () => Promise<any>;
  teams: Team[];
  profiles: Profile[];
  gmMode: boolean;
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  currentTeam: Team | null;
  setCurrentTeam: React.Dispatch<React.SetStateAction<Team | null>>;
}

export function useAdminPeople({ setIsSyncing, fetchData, teams, profiles, gmMode, setTeams, currentTeam, setCurrentTeam }: Deps) {
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
      // ⚠️ 不允許直接寫 score 絕對值:會覆蓋並發加分、不同步隊伍/神獸、且不留紀錄。
      //    所有分數變動一律走 adjust_score(差額制,原子安全且會記 score_logs)。
      const allowedUpdates = [
        'name', 'phone', 'role', 'team_id', 'batch_id',
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

  // 🧩 統一的小隊長報名建立(小隊卡片 / 快速指派 共用):
  //    確保某人(profile_id)在某期有「唯一一筆」captain 報名並綁到該隊。
  //    一律以「資料庫即時查詢」判斷,不靠可能過時的前端 state → 冪等,重複呼叫也不會產生重複帳號。
  const ensureCaptainEnrollment = async (
    teamId: string,
    capProfileId: string,
    batchId: string | null,
    directorId?: string | null
  ) => {
    if (!batchId) return;
    // 人的識別 = profile_id(可能為空,此時等於 id)。比對一律涵蓋 profile_id 或 id,
    // 與 app 端 (p.profile_id || p.id) 的判定一致,避免 profile_id 欄位為空時漏判。
    const idOr = `profile_id.eq.${capProfileId},id.eq.${capProfileId}`;
    const { data: rows } = await supabase
      .from('profiles')
      .select('id')
      .eq('batch_id', batchId)
      .or(idOr);

    const update: any = { role: 'captain', team_id: teamId };
    if (directorId !== undefined) update.director_id = directorId;

    if (rows && rows.length > 0) {
      // 該期已有此人(可能不只一筆)→ 全部沿用更新成此隊小隊長,絕不新建
      await supabase.from('profiles').update(update).in('id', rows.map((r: any) => r.id));
    } else {
      // 該期完全沒有此人 → 取同一人(其他期)的姓名/電話,新增唯一一筆隊長報名
      const { data: anyRows } = await supabase
        .from('profiles')
        .select('name, phone')
        .or(idOr)
        .limit(1);
      const anyProfile: any = anyRows?.[0];
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
          director_id: directorId ?? null,
          score: 0,
          status: 'active',
          created_at: new Date().toISOString()
        });
      }
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

      // 指派小隊長時：確保該隊長在「這個梯次」有唯一一筆 captain 報名(沿用現有、絕不重建),支援跨期。
      // 否則只設了 teams.captain_id，本人沒有該期報名 → 登入後看不到也管不了這一隊。
      if ('captain_id' in settings && settings.captain_id) {
        const team = teams.find(t => t.id === teamId);
        await ensureCaptainEnrollment(teamId, settings.captain_id, team?.batch_id || null, (settings as any).director_id);
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

      // 與小隊卡片完全同一條路徑:確保唯一一筆隊長報名(沿用現有、不重建)+ 設 role=captain + 綁大隊長
      await ensureCaptainEnrollment(teamId, captainProfileId, batchId, directorId);

      await fetchData();
      alert('⚡ 小隊長指派與大隊長綁定設定成功！');
    } catch (err: any) {
      console.error(err);
      alert(err.message || '指派小隊長失敗');
    } finally {
      setIsSyncing(false);
    }
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

  return {
    handleAddProfile, handleUpdateProfile, handleDeleteProfile, handleHardDeleteProfile,
    handleUpdateTeamSettings, handleAssignTeam, handleQuickAssignCaptain,
    handleCreateBatch, handleUpdateBatch, handleDeleteBatch,
  };
}

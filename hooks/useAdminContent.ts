// =====================================================================
// 後台內容 CRUD：公告 / 課程 / 成就 —— 從 app/page.tsx 抽出，行為完全不變。
// =====================================================================
import { supabase, isRealSupabase, uploadProofImage } from '@/lib/supabase';
import { Announcement, Course, Achievement, UserAchievement, Profile } from '@/types';

interface Deps {
  currentUser: Profile | null;
  setIsSyncing: (v: boolean) => void;
  fetchData: () => Promise<any>;
  setAchievements: React.Dispatch<React.SetStateAction<Achievement[]>>;
  setUserAchievements: React.Dispatch<React.SetStateAction<UserAchievement[]>>;
}

export function useAdminContent({ currentUser, setIsSyncing, fetchData, setAchievements, setUserAchievements }: Deps) {
  // ---- 公告 ----
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

  // ---- 課程 ----
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

  // ---- 成就 ----
  const handleCreateAchievement = async (
    title: string, 
    description: string, 
    value: number, 
    iconUrl?: string | null,
    conditionType?: 'total_score' | 'consecutive_checkins' | 'mission_count' | 'witness_post_count' | 'pet_stage',
    targetMissionId?: string | null
  ) => {
    // 若 icon 是上傳的 base64 圖片，先上傳 Storage 換 URL；若是 lucide 圖示名稱則原樣保留
    const uploadedIcon = await uploadProofImage(iconUrl);
    await supabase.from('achievements').insert({
      title,
      description: description || null,
      icon_url: uploadedIcon || 'Flame',
      condition_type: conditionType || 'total_score',
      condition_value: value,
      target_mission_id: targetMissionId || null
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

  return {
    handleCreateAnnouncement, handleUpdateAnnouncement, handleDeleteAnnouncement,
    handleCreateCourse, handleUpdateCourse, handleDeleteCourse,
    handleCreateAchievement, handleUpdateAchievement, handleDeleteAchievement,
  };
}

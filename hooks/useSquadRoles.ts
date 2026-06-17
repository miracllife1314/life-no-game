// =====================================================================
// 小隊職責（squad_roles）CRUD —— 從 app/page.tsx 抽出，行為完全不變。
// =====================================================================
import { supabase } from '@/lib/supabase';
import { SquadRoleDef } from '@/types';

interface Deps {
  setIsSyncing: (v: boolean) => void;
  fetchData: () => Promise<any>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function useSquadRoles({ setIsSyncing, fetchData, showToast }: Deps) {
  const handleCreateSquadRole = async (data: Omit<SquadRoleDef, 'id' | 'created_at'>) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('squad_roles').insert([data]);
      if (error) throw error;
      await fetchData();
      showToast('成功新增小隊職責', 'success');
    } catch (err: any) {
      console.error('Error creating squad role:', err);
      showToast(err.message || '新增失敗', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateSquadRole = async (id: string, updates: Partial<SquadRoleDef>) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('squad_roles').update(updates).eq('id', id);
      if (error) throw error;
      await fetchData();
      showToast('成功更新小隊職責', 'success');
    } catch (err: any) {
      console.error('Error updating squad role:', err);
      showToast(err.message || '更新失敗', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteSquadRole = async (id: string) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('squad_roles').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
      showToast('成功刪除小隊職責', 'success');
    } catch (err: any) {
      console.error('Error deleting squad role:', err);
      showToast(err.message || '刪除失敗', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return { handleCreateSquadRole, handleUpdateSquadRole, handleDeleteSquadRole };
}

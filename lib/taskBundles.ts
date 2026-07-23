// =====================================================================
// 臨時任務「套組」—— 後台把常用的一組加分任務(如課後課加分包)先組好、存起來,
// 之後每次活動只要選套組 + 設共同時間 + 選期數,就能一鍵把整組發布成限時任務。
//
// 儲存:與攻略同一套 —— 存在 DB 的 app_config 表(key='task_bundles'),
//   同步 getter 讀記憶體快取,App/後台開啟時 loadBundlesFromDB() 補水;
//   localStorage 僅當離線鏡像。詳見 [[lib/guideConfig.ts]] 同款做法。
//   ⚠️ nlp_task_bundles 這個 localStorage key 是內部代號,不可改名。
// =====================================================================
import { realSupabase } from '@/lib/supabase';
import type { TaskType } from '@/types';

// 套組裡的單一任務(只存「內容」)
export interface TaskBundleItem {
  id: string;
  name: string;
  description?: string;
  score: number;
  requires_approval: boolean;   // 需審核(通常課後課出席=免審,心得分享=需審)
}

export interface TaskBundle {
  id: string;
  name: string;
  items: TaskBundleItem[];
  // 記住的發布預設值(下次開啟自動帶入,只需改日期):
  days?: number;                // 持續幾天(預設 1)
  type?: TaskType;              // 發布成哪種任務(預設 limited 限時)
}

const DB_CONFIG_KEY = 'task_bundles';
const LS_MIRROR_KEY = 'nlp_task_bundles';

let cachedBundles: TaskBundle[] | null = null;

function readLocalMirror(): TaskBundle[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(LS_MIRROR_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to read task bundles mirror:', e);
  }
  return null;
}

function writeLocalMirror(bundles: TaskBundle[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_MIRROR_KEY, JSON.stringify(bundles));
  } catch (e) {
    console.error('Failed to write task bundles mirror:', e);
  }
}

export function getAllBundles(): TaskBundle[] {
  if (cachedBundles) return cachedBundles;
  const mirror = readLocalMirror();
  if (mirror && Array.isArray(mirror)) return mirror;
  return [];
}

// 從 DB 補水(後台開啟臨時任務區時呼叫)。成功則更新快取+鏡像並回傳;失敗沿用 fallback。
export async function loadBundlesFromDB(): Promise<TaskBundle[]> {
  if (!realSupabase) return getAllBundles();
  try {
    const { data, error } = await realSupabase
      .from('app_config')
      .select('value')
      .eq('key', DB_CONFIG_KEY)
      .maybeSingle();
    if (error) {
      console.error('Failed to load task bundles from DB:', error.message);
      return getAllBundles();
    }
    const value = data?.value;
    if (Array.isArray(value)) {
      cachedBundles = value as TaskBundle[];
      writeLocalMirror(cachedBundles);
      return cachedBundles;
    }
    // DB 尚無此設定 → 視為空清單(不報錯)
    cachedBundles = [];
    return cachedBundles;
  } catch (e) {
    console.error('Failed to load task bundles from DB:', e);
  }
  return getAllBundles();
}

// 寫回 DB(僅後台管理員,RLS 由 is_admin() 把關)。先更新快取+鏡像再 upsert,回傳 { error }。
export async function saveBundlesToDB(
  bundles: TaskBundle[],
): Promise<{ error: string | null }> {
  cachedBundles = bundles;
  writeLocalMirror(bundles);
  if (!realSupabase) return { error: null };
  try {
    const { error } = await realSupabase
      .from('app_config')
      .upsert(
        { key: DB_CONFIG_KEY, value: bundles, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );
    return { error: error ? error.message : null };
  } catch (e: any) {
    return { error: String(e?.message || e) };
  }
}

import { BRAND } from '@/lib/brand';
import { realSupabase } from '@/lib/supabase';

export interface GuideOffsetItem {
  id: string;
  title: string;
  points: number;
  days: number;
  highlight?: boolean;
  desc?: string;
}

export interface GuideVersionConfig {
  seriousSpeed: string;
  seriousBullets: string[];
  activeSpeed: string;
  activeBullets: string[];
  offsets: GuideOffsetItem[];
}

export interface GuideDefinition {
  key: string;
  name: string;
  config: GuideVersionConfig;
}

export const DEFAULT_BEGINNER_GUIDE: GuideVersionConfig = {
  seriousSpeed: '300 EXP/天',
  seriousBullets: [
    '每日定課：每日五感恩/肯定/VAK讚美打卡 ➔ +50 ~ +150 EXP/天',
    '每週任務：完成每週主題實作與小組演練 ➔ +500 ~ +1000 EXP/週'
  ],
  activeSpeed: '700 EXP/天',
  activeBullets: [
    '全數打卡：每日定課 + 每週任務全通（主題任務/小組通話）➔ 平均 +350+ EXP/天',
    '高分加碼：分享寫得好被選到上傳到見證牆額外 +200 EXP (需寫得好、照片清晰)、締結產品 (3000元以上)、填寫限時問卷等'
  ],
  offsets: [
    { id: 'b-o1', title: '每週主題任務', points: 500, days: 1.5 },
    { id: 'b-o2', title: '邀約 NLP 入門課', points: 500, days: 1.5 },
    { id: 'b-o3', title: '推薦初階', points: 1500, days: 4.2, highlight: true, desc: '讓破殼修行一鍵飛越！' },
    { id: 'b-o4', title: BRAND.retrainTitle, points: 1000, days: 2.8 },
    { id: 'b-o5', title: '入選見證牆', points: 200, days: 0.6, desc: '(需寫得好、照片清晰)' }
  ]
};

export const DEFAULT_ADVANCED_GUIDE: GuideVersionConfig = {
  seriousSpeed: '300 EXP/天',
  seriousBullets: [
    '每日定課：雙定課打卡（五感恩＋肯定伴侶）➔ +100 EXP/天',
    '每週實作：每週完成心錨/卓越圈等演練 ➔ +500 ~ +1000 EXP/週'
  ],
  activeSpeed: '700 EXP/天',
  activeBullets: [
    '全數打卡：每日定課 + 每週任務全通（影片/心錨/卓越圈）➔ 平均 +350+ EXP/天',
    '高分加碼：分享寫得好被選到上傳到見證牆額外 +200 EXP (需寫得好、照片清晰)、完成次感元個案 3次、推薦初階等'
  ],
  offsets: [
    { id: 'a-o1', title: '每週實作任務', points: 500, days: 1.5 },
    { id: 'a-o2', title: '邀約 NLP 入門課', points: 500, days: 1.5 },
    { id: 'a-o3', title: '推薦初階', points: 1500, days: 4.2, highlight: true, desc: '讓破殼修行一鍵飛越！' },
    { id: 'a-o4', title: '完成次感元個案 3次', points: 1000, days: 2.8 },
    { id: 'a-o5', title: '入選見證牆', points: 200, days: 0.6, desc: '(需寫得好、照片清晰)' }
  ]
};

const DEFAULT_GUIDES: GuideDefinition[] = [
  { key: 'beginner', name: '🟢 初階日常', config: DEFAULT_BEGINNER_GUIDE },
  { key: 'advanced', name: '🔥 進階修煉', config: DEFAULT_ADVANCED_GUIDE }
];

// ⚠️ 攻略清單已搬進 DB(app_config, key='guide_list')。
//    大隊長在後台編輯 → 寫進 DB → 全體學員都看得到(原本只存編輯者自己的 localStorage,
//    學員永遠只看得到預設值)。詳見 docs/schema_fixes_34_app_config_guides.sql。
//
// 讀取策略:同步 getAllGuides() 讀「記憶體快取 cachedGuides」;
//    App 啟動時呼叫 loadGuidesFromDB() 從 DB 補水(hydrate)並更新快取。
//    localStorage 只當「離線鏡像/首屏 fallback」,不再是唯一真相來源。
//    ⚠️ nlp_guide_list 這個 localStorage key 是內部代號,不可改名。
const DB_CONFIG_KEY = 'guide_list';
const LS_MIRROR_KEY = 'nlp_guide_list';

let cachedGuides: GuideDefinition[] | null = null;

function readLocalMirror(): GuideDefinition[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(LS_MIRROR_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to read guide mirror:', e);
  }
  return null;
}

function writeLocalMirror(guides: GuideDefinition[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_MIRROR_KEY, JSON.stringify(guides));
  } catch (e) {
    console.error('Failed to write guide mirror:', e);
  }
}

export function getAllGuides(): GuideDefinition[] {
  if (cachedGuides) return cachedGuides;
  const mirror = readLocalMirror();
  if (mirror && Array.isArray(mirror) && mirror.length > 0) return mirror;
  return DEFAULT_GUIDES;
}

// 從 DB 補水:App 啟動 / 後台開啟攻略頁時呼叫。成功則更新快取+鏡像並回傳最新清單;
// 失敗(離線/無 Supabase)則沿用 getAllGuides() 的 fallback。
export async function loadGuidesFromDB(): Promise<GuideDefinition[]> {
  if (!realSupabase) return getAllGuides();
  try {
    const { data, error } = await realSupabase
      .from('app_config')
      .select('value')
      .eq('key', DB_CONFIG_KEY)
      .maybeSingle();
    if (error) {
      console.error('Failed to load guides from DB:', error.message);
      return getAllGuides();
    }
    const value = data?.value;
    if (Array.isArray(value) && value.length > 0) {
      cachedGuides = value as GuideDefinition[];
      writeLocalMirror(cachedGuides);
      return cachedGuides;
    }
  } catch (e) {
    console.error('Failed to load guides from DB:', e);
  }
  return getAllGuides();
}

// 寫回 DB(僅後台管理員,RLS 由 is_admin() 把關)。先更新快取+鏡像(即時反映),再 upsert。
// 回傳 { error } 讓呼叫端能提示成功/失敗(依鐵律:寫入 DB 一律檢查 error)。
export async function saveGuidesToDB(
  guides: GuideDefinition[],
): Promise<{ error: string | null }> {
  cachedGuides = guides;
  writeLocalMirror(guides);
  if (!realSupabase) return { error: null };
  try {
    const { error } = await realSupabase
      .from('app_config')
      .upsert(
        { key: DB_CONFIG_KEY, value: guides, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );
    return { error: error ? error.message : null };
  } catch (e: any) {
    return { error: String(e?.message || e) };
  }
}

// 舊介面(僅寫 localStorage 鏡像)。保留給尚未改用 DB 的呼叫端;新程式請用 saveGuidesToDB。
export function saveAllGuides(guides: GuideDefinition[]): void {
  cachedGuides = guides;
  writeLocalMirror(guides);
}

export function loadGuideConfig(key: string): GuideVersionConfig {
  const all = getAllGuides();
  const found = all.find(g => g.key === key);
  if (found) {
    return found.config;
  }
  // Fallbacks for original configs
  if (key === 'beginner') return DEFAULT_BEGINNER_GUIDE;
  if (key === 'advanced') return DEFAULT_ADVANCED_GUIDE;
  return DEFAULT_BEGINNER_GUIDE;
}

export function getGuideConfigForBatch(batchName: string | undefined): GuideVersionConfig {
  if (!batchName) return loadGuideConfig('beginner');
  
  const all = getAllGuides();
  const lowerBatch = batchName.toLowerCase();
  
  // 1. Try to find a guide where its name (minus formatting) or key is in the batchName
  const matched = all.find(g => {
    // strip common emoji prefixes like 🟢 or 🔥 or 💎
    const cleanName = g.name.replace(/^[^\w\s\u4e00-\u9fa5]+/, '').trim();
    if (cleanName && lowerBatch.includes(cleanName.toLowerCase())) return true;
    if (g.key && lowerBatch.includes(g.key.toLowerCase())) return true;
    return false;
  });

  if (matched) {
    return matched.config;
  }

  // 2. Fallbacks to standard matching
  if (lowerBatch.includes('進階') || lowerBatch.includes('高階') || lowerBatch.includes('班長班')) {
    return loadGuideConfig('advanced');
  }
  
  return loadGuideConfig('beginner');
}

export function getGuideName(key: string): string {
  const all = getAllGuides();
  const found = all.find(g => g.key === key);
  return found ? found.name : (key === 'advanced' ? '🔥 進階修煉' : '🟢 初階日常');
}

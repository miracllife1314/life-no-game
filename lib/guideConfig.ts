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
    '每日五感恩：堅持每日感恩打卡 ➔ +100 EXP/天',
    '每週實作打卡：每週完成 1~2 項實作 ➔ +500 ~ +1000 EXP/週'
  ],
  activeSpeed: '700 EXP/天',
  activeBullets: [
    '全數打卡：每日定課 + 每週任務全通（主題任務/小組通話）➔ 平均 +314 EXP/天',
    '高分加碼：分享寫得好被選到上傳到見證牆額外 +200 EXP (需寫得好、照片清晰)、締結產品 (3000元以上)、填寫限時問卷等'
  ],
  offsets: [
    { id: 'b-o1', title: '每週主題任務', points: 500, days: 1.5 },
    { id: 'b-o2', title: '邀約入門體驗課', points: 500, days: 1.5 },
    { id: 'b-o3', title: '推薦報名初階課', points: 1500, days: 4.2, highlight: true, desc: '讓破殼修行一鍵飛越！' },
    { id: 'b-o4', title: '報名 NLP 複訓', points: 1000, days: 2.8 },
    { id: 'b-o5', title: '入選見證牆', points: 200, days: 0.6, desc: '(需寫得好、照片清晰)' }
  ]
};

export const DEFAULT_ADVANCED_GUIDE: GuideVersionConfig = {
  seriousSpeed: '300 EXP/天',
  seriousBullets: [
    '每日感恩與肯定：堅持每日雙定課打卡 ➔ +100 EXP/天',
    '每週實作打卡：每週完成 1~2 項實作 ➔ +500 ~ +1000 EXP/週'
  ],
  activeSpeed: '700 EXP/天',
  activeBullets: [
    '全數打卡：每日定課 + 每週任務全通（影片/心錨/卓越圈）➔ 平均 +314 EXP/天',
    '高分加碼：分享寫得好被選到上傳到見證牆額外 +200 EXP (需寫得好、照片清晰)、完成次感元個案、填寫限時问卷等'
  ],
  offsets: [
    { id: 'a-o1', title: '每週實作任務', points: 500, days: 1.5 },
    { id: 'a-o2', title: '邀約入門體驗課', points: 500, days: 1.5 },
    { id: 'a-o3', title: '推薦報名初階課', points: 1500, days: 4.2, highlight: true, desc: '讓破殼修行一鍵飛越！' },
    { id: 'a-o4', title: '次感元個案 3 次', points: 1000, days: 2.8 },
    { id: 'a-o5', title: '入選見證牆', points: 200, days: 0.6, desc: '(需寫得好、照片清晰)' }
  ]
};

const DEFAULT_GUIDES: GuideDefinition[] = [
  { key: 'beginner', name: '🟢 初階日常', config: DEFAULT_BEGINNER_GUIDE },
  { key: 'advanced', name: '🔥 進階修煉', config: DEFAULT_ADVANCED_GUIDE }
];

export function getAllGuides(): GuideDefinition[] {
  if (typeof window === 'undefined') {
    return DEFAULT_GUIDES;
  }
  try {
    const key = 'nlp_guide_list';
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load guide list:', e);
  }
  return DEFAULT_GUIDES;
}

export function saveAllGuides(guides: GuideDefinition[]): void {
  if (typeof window === 'undefined') return;
  try {
    const key = 'nlp_guide_list';
    localStorage.setItem(key, JSON.stringify(guides));
  } catch (e) {
    console.error('Failed to save guide list:', e);
  }
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

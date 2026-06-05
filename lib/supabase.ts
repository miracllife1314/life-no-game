import { createClient } from '@supabase/supabase-js';
import { 
  Profile, Team, Task, Submission, ScoreLog, 
  Course, CourseAttendance, Achievement, UserAchievement, 
  Announcement, StudentNote,
  Pet, UserPet, Card, Deck, DeckCard, UserDeck,
  Batch, MissionTemplate, BatchMissionTemplate, Mission
} from '@/types';

// Detect if Supabase URL and Key are provided and valid
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const isRealSupabase = supabaseUrl && supabaseUrl !== 'your-supabase-url' && supabaseKey;

// Base real supabase client
export const realSupabase = isRealSupabase ? createClient(supabaseUrl, supabaseKey) : null;

// ==========================================
// LOCAL PERSISTENCE STORAGE ENGINE (LOCAL DB)
// ==========================================

const SEED_DATA = {
  teams: [
    { 
      id: 'team1', 
      name: 'NLP初階50期第一隊', 
      captain_id: 'captain-yuxi', 
      total_score: 40500, 
      batch_id: 'batch-50',
      invite_code: 'nlp1',
      invite_enabled: true,
      max_members: 10,
      created_at: new Date('2026-04-16T08:00:00Z').toISOString() 
    }
  ] as Team[],

  profiles: [
    { id: 'admin1', name: '林大統', role: 'admin', team_id: null, batch_id: null, score: 15000, created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'captain-yuxi', name: '沈又希', role: 'captain', team_id: 'team1', batch_id: 'batch-47', score: 6950, created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-yuting', name: '林玉庭', role: 'student', team_id: 'team1', batch_id: 'batch-47', score: 4400, created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-zhenyang', name: '陳振揚', role: 'student', team_id: 'team1', batch_id: 'batch-47', score: 2900, created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-yiru', name: '蕭意儒', role: 'student', team_id: 'team1', batch_id: 'batch-47', score: 2600, created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-haocheng', name: '曾浩程', role: 'student', team_id: 'team1', batch_id: 'batch-47', score: 2550, created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-qunyi', name: '鄭群譯', role: 'student', team_id: 'team1', batch_id: 'batch-47', score: 2500, created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-yahan', name: '蕭雅韓', role: 'student', team_id: 'team1', batch_id: 'batch-47', score: 2150, created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-zongxuan', name: '蔡宗玹', role: 'student', team_id: 'team1', batch_id: 'batch-47', score: 1600, created_at: new Date('2026-04-16T08:00:00Z').toISOString() }
  ] as Profile[],

  tasks: [] as Task[],

  submissions: [] as Submission[],

  score_logs: [
    { id: 'log-team-class', student_id: 'captain-yuxi', amount: 14850, reason: '小組上課兩天得分 (加至小隊總分)', submission_id: null, created_by: 'admin1', created_at: new Date('2026-04-17T17:00:00Z').toISOString() },
    { id: 'log-yuxi-init', student_id: 'captain-yuxi', amount: 6950, reason: '開訓以來個人定課與加分累計', submission_id: null, created_by: 'admin1', created_at: new Date('2026-04-18T00:00:00Z').toISOString() },
    { id: 'log-yuting-init', student_id: 'student-yuting', amount: 4400, reason: '開訓以來個人定課與加分累計', submission_id: null, created_by: 'admin1', created_at: new Date('2026-04-18T00:00:00Z').toISOString() },
    { id: 'log-zhenyang-init', student_id: 'student-zhenyang', amount: 2900, reason: '開訓以來個人定課與加分累計', submission_id: null, created_by: 'admin1', created_at: new Date('2026-04-18T00:00:00Z').toISOString() },
    { id: 'log-yiru-init', student_id: 'student-yiru', amount: 2600, reason: '開訓以來個人定課與加分累計', submission_id: null, created_by: 'admin1', created_at: new Date('2026-04-18T00:00:00Z').toISOString() },
    { id: 'log-haocheng-init', student_id: 'student-haocheng', amount: 2550, reason: '開訓以來個人定課與加分累計', submission_id: null, created_by: 'admin1', created_at: new Date('2026-04-18T00:00:00Z').toISOString() },
    { id: 'log-qunyi-init', student_id: 'student-qunyi', amount: 2500, reason: '開訓以來個人定課與加分累計', submission_id: null, created_by: 'admin1', created_at: new Date('2026-04-18T00:00:00Z').toISOString() },
    { id: 'log-yahan-init', student_id: 'student-yahan', amount: 2150, reason: '開訓以來個人定課與加分累計', submission_id: null, created_by: 'admin1', created_at: new Date('2026-04-18T00:00:00Z').toISOString() },
    { id: 'log-zongxuan-init', student_id: 'student-zongxuan', amount: 1600, reason: '開訓以來個人定課與加分累計', submission_id: null, created_by: 'admin1', created_at: new Date('2026-04-18T00:00:00Z').toISOString() },
    { id: 'log-admin-init', student_id: 'admin1', amount: 15000, reason: '系統管理者修為儲備', submission_id: null, created_by: 'admin1', created_at: new Date('2026-04-16T08:00:00Z').toISOString() }
  ] as ScoreLog[],

  courses: [
    { 
      id: 'course-47', 
      name: '第47期 NLP台中場 初階班', 
      description: 'NLP 人性溝通術初階核心課程（4月16日至4月17日），包含感官系統呼應、卓越心錨與親和感建立等實戰演練。', 
      class_date: '2026-04-16', 
      register_url: 'https://example.com/register-nlp-47',
      created_at: new Date('2026-04-16T08:00:00Z').toISOString() 
    }
  ] as Course[],

  course_attendance: [
    { id: 'att-yuxi', course_id: 'course-47', student_id: 'captain-yuxi', status: 'attended', attended_at: new Date('2026-04-16T09:00:00Z').toISOString(), created_at: new Date('2026-04-16T08:30:00Z').toISOString() },
    { id: 'att-yuting', course_id: 'course-47', student_id: 'student-yuting', status: 'attended', attended_at: new Date('2026-04-16T09:02:00Z').toISOString(), created_at: new Date('2026-04-16T08:30:00Z').toISOString() },
    { id: 'att-zhenyang', course_id: 'course-47', student_id: 'student-zhenyang', status: 'attended', attended_at: new Date('2026-04-16T08:58:00Z').toISOString(), created_at: new Date('2026-04-16T08:30:00Z').toISOString() },
    { id: 'att-yiru', course_id: 'course-47', student_id: 'student-yiru', status: 'attended', attended_at: new Date('2026-04-16T08:55:00Z').toISOString(), created_at: new Date('2026-04-16T08:30:00Z').toISOString() },
    { id: 'att-haocheng', course_id: 'course-47', student_id: 'student-haocheng', status: 'attended', attended_at: new Date('2026-04-16T09:05:00Z').toISOString(), created_at: new Date('2026-04-16T08:30:00Z').toISOString() },
    { id: 'att-qunyi', course_id: 'course-47', student_id: 'student-qunyi', status: 'attended', attended_at: new Date('2026-04-16T09:01:00Z').toISOString(), created_at: new Date('2026-04-16T08:30:00Z').toISOString() },
    { id: 'att-yahan', course_id: 'course-47', student_id: 'student-yahan', status: 'attended', attended_at: new Date('2026-04-16T08:59:00Z').toISOString(), created_at: new Date('2026-04-16T08:30:00Z').toISOString() },
    { id: 'att-zongxuan', course_id: 'course-47', student_id: 'student-zongxuan', status: 'attended', attended_at: new Date('2026-04-16T09:03:00Z').toISOString(), created_at: new Date('2026-04-16T08:30:00Z').toISOString() }
  ] as CourseAttendance[],

  achievements: [
    { id: 'ach1', title: 'NLP 初行者', description: '修行分數突破 1,000 分，踏出溝通大師的第一步。', icon_url: 'Flame', condition_type: 'total_score', condition_value: 1000, created_at: new Date().toISOString() },
    { id: 'ach2', title: '心智密碼解鎖者', description: '修行分數突破 2,500 分，深度解鎖大腦思考迴路。', icon_url: 'Sparkles', condition_type: 'total_score', condition_value: 2500, created_at: new Date().toISOString() },
    { id: 'ach3', title: '卓越溝通大師', description: '修行分數突破 5,000 分，達到極佳的親和感建立境界。', icon_url: 'Trophy', condition_type: 'total_score', condition_value: 5000, created_at: new Date().toISOString() }
  ] as Achievement[],

  user_achievements: [
    { id: 'ua-yuxi-1', student_id: 'captain-yuxi', achievement_id: 'ach1', unlocked_at: new Date('2026-04-18T12:00:00Z').toISOString() },
    { id: 'ua-yuxi-2', student_id: 'captain-yuxi', achievement_id: 'ach2', unlocked_at: new Date('2026-04-25T12:00:00Z').toISOString() },
    { id: 'ua-yuxi-3', student_id: 'captain-yuxi', achievement_id: 'ach3', unlocked_at: new Date('2026-05-02T12:00:00Z').toISOString() },
    { id: 'ua-yuting-1', student_id: 'student-yuting', achievement_id: 'ach1', unlocked_at: new Date('2026-04-18T12:00:00Z').toISOString() },
    { id: 'ua-yuting-2', student_id: 'student-yuting', achievement_id: 'ach2', unlocked_at: new Date('2026-04-25T12:00:00Z').toISOString() },
    { id: 'ua-zhenyang-1', student_id: 'student-zhenyang', achievement_id: 'ach1', unlocked_at: new Date('2026-04-18T12:00:00Z').toISOString() },
    { id: 'ua-zhenyang-2', student_id: 'student-zhenyang', achievement_id: 'ach2', unlocked_at: new Date('2026-05-09T12:00:00Z').toISOString() },
    { id: 'ua-yiru-1', student_id: 'student-yiru', achievement_id: 'ach1', unlocked_at: new Date('2026-04-18T12:00:00Z').toISOString() },
    { id: 'ua-yiru-2', student_id: 'student-yiru', achievement_id: 'ach2', unlocked_at: new Date('2026-05-02T12:00:00Z').toISOString() },
    { id: 'ua-haocheng-1', student_id: 'student-haocheng', achievement_id: 'ach1', unlocked_at: new Date('2026-04-18T12:00:00Z').toISOString() },
    { id: 'ua-haocheng-2', student_id: 'student-haocheng', achievement_id: 'ach2', unlocked_at: new Date('2026-05-09T12:00:00Z').toISOString() },
    { id: 'ua-qunyi-1', student_id: 'student-qunyi', achievement_id: 'ach1', unlocked_at: new Date('2026-04-18T12:00:00Z').toISOString() },
    { id: 'ua-qunyi-2', student_id: 'student-qunyi', achievement_id: 'ach2', unlocked_at: new Date('2026-05-02T12:00:00Z').toISOString() },
    { id: 'ua-yahan-1', student_id: 'student-yahan', achievement_id: 'ach1', unlocked_at: new Date('2026-04-18T12:00:00Z').toISOString() },
    { id: 'ua-zongxuan-1', student_id: 'student-zongxuan', achievement_id: 'ach1', unlocked_at: new Date('2026-04-18T12:00:00Z').toISOString() }
  ] as UserAchievement[],

  announcements: [
    { id: 'ann-welcome', title: '📢 歡迎來到第47期NLP台中場初階班計分系統！', content: '各位修行者好，本系統提供完整的每日定課簽到、每週主線任務以及特殊限時加分功能。您可以透過持續修行解鎖高階成就徽章，爭奪修為榜榜首！請使用您在試算表上的中文姓名直接登入，預設小隊長為：沈又希，學員為林玉庭、陳振揚等組員。', created_by: 'admin1', created_at: new Date('2026-04-16T08:00:00Z').toISOString() }
  ] as Announcement[],

  student_notes: [
    { id: 'note-yuting', student_id: 'student-yuting', captain_id: 'captain-yuxi', note: '玉庭在寫五感恩定課非常自律且深入，與組員互動良好，本期表現優良。', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ] as StudentNote[],

  pets: [
    {
      id: 'pet-dragon-egg',
      name: '修行小龍蛋',
      description: '一顆蘊含 NLP 溝通能量的神秘小龍蛋，每天完成定課能為牠提供孵化能量。',
      image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=300',
      evolution_image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=300',
      unlock_score_threshold: 0,
      created_at: new Date('2026-04-16T08:00:00Z').toISOString()
    },
    {
      id: 'pet-spiritual-cat',
      name: '卓越靜心靈貓',
      description: '擁有洞察人心的雙眼，能幫助修行者在對話中快速建立親和感。',
      image_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=300',
      evolution_image_url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=300',
      unlock_score_threshold: 3000,
      created_at: new Date('2026-04-16T08:00:00Z').toISOString()
    }
  ] as Pet[],

  user_pets: [
    {
      id: 'upet-yuting-1',
      student_id: 'student-yuting',
      pet_id: 'pet-dragon-egg',
      pet_level: 3,
      current_skin: 'default',
      unlocked_at: new Date('2026-04-16T08:30:00Z').toISOString()
    },
    {
      id: 'upet-yuxi-1',
      student_id: 'captain-yuxi',
      pet_id: 'pet-spiritual-cat',
      pet_level: 5,
      current_skin: 'default',
      unlocked_at: new Date('2026-04-17T09:00:00Z').toISOString()
    }
  ] as UserPet[],

  cards: [
    {
      id: 'card-rapport',
      title: '親和感心靈卡',
      description: '每天定課修行分數加成 10%。',
      element_type: 'water',
      rarity: 'SR',
      image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=300',
      created_at: new Date('2026-04-16T08:00:00Z').toISOString()
    },
    {
      id: 'card-anchor',
      title: '卓越心錨卡',
      description: '手動調分加成 15%。',
      element_type: 'fire',
      rarity: 'SSR',
      image_url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&q=80&w=300',
      created_at: new Date('2026-04-16T08:00:00Z').toISOString()
    }
  ] as Card[],

  decks: [
    {
      id: 'deck-init',
      name: '新手啟程套牌',
      created_by: 'admin1',
      is_template: true,
      created_at: new Date('2026-04-16T08:00:00Z').toISOString()
    }
  ] as Deck[],

  deck_cards: [
    {
      id: 'dc-1',
      deck_id: 'deck-init',
      card_id: 'card-rapport',
      count: 1
    },
    {
      id: 'dc-2',
      deck_id: 'deck-init',
      card_id: 'card-anchor',
      count: 1
    }
  ] as DeckCard[],

  user_decks: [
    {
      id: 'ud-yuting-1',
      student_id: 'student-yuting',
      deck_id: 'deck-init',
      is_active: true,
      created_at: new Date('2026-04-16T08:30:00Z').toISOString()
    }
  ] as UserDeck[],

  batches: [
    {
      id: 'batch-47',
      name: 'NLP台中47期',
      start_date: '2026-04-16T00:00:00Z',
      end_date: '2026-06-30T23:59:59Z',
      status: 'ended',
      created_at: new Date('2026-04-16T08:00:00Z').toISOString(),
      updated_at: new Date('2026-04-16T08:00:00Z').toISOString()
    },
    {
      id: 'batch-50',
      name: 'NLP初階50期',
      start_date: '2026-06-01T00:00:00Z',
      end_date: '2026-06-30T23:59:59Z',
      status: 'active',
      created_at: new Date('2026-06-01T08:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T08:00:00Z').toISOString()
    },
    {
      id: 'batch-51',
      name: 'NLP初階51期',
      start_date: '2026-07-01T00:00:00Z',
      end_date: '2026-07-31T23:59:59Z',
      status: 'draft',
      created_at: new Date('2026-06-01T08:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T08:00:00Z').toISOString()
    }
  ] as Batch[],

  mission_templates: [] as MissionTemplate[],

  batch_mission_templates: [] as BatchMissionTemplate[],

  missions: [] as Mission[]
};

// Initialize localStorage if not present
const getLocalStorageData = (): typeof SEED_DATA => {
  if (typeof window === 'undefined') return SEED_DATA;
  
  const stored = localStorage.getItem('nlp_game_db');
  if (!stored) {
    localStorage.setItem('nlp_game_db', JSON.stringify(SEED_DATA));
    // Set default user session as student-yuting if not present
    if (!localStorage.getItem('nlp_session')) {
      localStorage.setItem('nlp_session', JSON.stringify(SEED_DATA.profiles.find(p => p.id === 'student-yuting')));
    }
    return SEED_DATA;
  }
  
  const parsed = JSON.parse(stored);
  // Auto-upgrade schema if new keys are missing
  let upgraded = false;
  const newKeys = ['pets', 'user_pets', 'cards', 'decks', 'deck_cards', 'user_decks', 'batches', 'mission_templates', 'batch_mission_templates', 'missions'];
  newKeys.forEach(key => {
    if (!parsed[key]) {
      parsed[key] = (SEED_DATA as any)[key] || [];
      upgraded = true;
    }
  });
  if ((parsed as any).cohorts) {
    delete (parsed as any).cohorts;
    upgraded = true;
  }
  if (parsed.profiles) {
    parsed.profiles.forEach((p: any) => {
      if (p.batch_id === undefined) {
        if (p.cohort_id) {
          p.batch_id = p.cohort_id.replace('cohort-', 'batch-');
        } else {
          p.batch_id = p.role === 'admin' ? null : 'batch-50';
        }
        upgraded = true;
      }
      if (p.cohort_id !== undefined) {
        delete p.cohort_id;
        upgraded = true;
      }
    });
  }
  if (parsed.teams) {
    parsed.teams.forEach((t: any) => {
      // 1. Recover standard name if t.name was overwritten by custom naming previously
      if (t.name === 'NLP台中場 第01組' || t.name === 'NLP台中場 第 01組') {
        t.name = 'NLP初階50期第一隊';
        upgraded = true;
      }

      const isDefaultFormat = t.name.startsWith('NLP') && t.name.includes('第') && (t.name.includes('隊') || t.name.includes('組'));
      if (!isDefaultFormat && t.batch_id) {
        if (!t.custom_name) {
          t.custom_name = t.name;
        }

        const batch = parsed.batches?.find((b: any) => b.id === t.batch_id);
        if (batch) {
          const prefix = (batch.name.includes('NLP') || batch.name.includes('ＮＬＰ')) ? batch.name : `NLP初階${batch.name}`;
          
          let teamNum = 1;
          if (t.invite_code === 'nlp1') {
            teamNum = 1;
          } else if (t.invite_code && t.invite_code.includes('-')) {
            const parts = t.invite_code.split('-');
            const lastPart = parts[parts.length - 1];
            const parsedNum = parseInt(lastPart, 10);
            if (!isNaN(parsedNum)) {
              teamNum = parsedNum;
            }
          } else {
            const batchTeams = parsed.teams.filter((bt: any) => bt.batch_id === t.batch_id);
            const idx = batchTeams.findIndex((bt: any) => bt.id === t.id);
            if (idx !== -1) {
              teamNum = idx + 1;
            }
          }
          const chMap = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
          const chNum = chMap[teamNum] || String(teamNum);
          t.name = `${prefix}第${chNum}隊`;
          upgraded = true;
        }
      }
      if (t.invite_code === undefined) {
        t.batch_id = t.batch_id || 'batch-50';
        t.invite_code = t.id === 'team1' ? 'nlp1' : 'invite-' + t.id;
        t.invite_enabled = t.invite_enabled !== undefined ? t.invite_enabled : true;
        t.max_members = t.max_members || 10;
        upgraded = true;
      }
    });
  }
  if (parsed.courses) {
    parsed.courses.forEach((c: any) => {
      if (!c.register_url) {
        c.register_url = 'https://example.com/register-nlp';
        upgraded = true;
      }
    });
  }
  if (parsed.tasks) {
    parsed.tasks.forEach((t: any) => {
      if (t.batch_id === undefined) {
        if (t.cohort_id) {
          t.batch_id = t.cohort_id.replace('cohort-', 'batch-');
        } else {
          t.batch_id = null;
        }
        upgraded = true;
      }
      if (t.cohort_id !== undefined) {
        delete t.cohort_id;
        upgraded = true;
      }
    });
    const defaultTaskIds = [
      'task-daily-gratitude', 'task-daily-deal-3000', 'task-weekly-session', 
      'task-weekly-sharing', 'task-weekly-media-sharing', 'task-temp-video-sharing', 
      'task-temp-invite-nlp', 'task-temp-deal-nlp', 'task-temp-deal-energy', 
      'task-temp-retrain', 'task-temp-personal-limit', 'task-temp-session-extra'
    ];
    const filteredTasks = parsed.tasks.filter((t: any) => !defaultTaskIds.includes(t.id));
    if (filteredTasks.length !== parsed.tasks.length) {
      parsed.tasks = filteredTasks;
      upgraded = true;
    }
  }
  if (parsed.mission_templates) {
    const defaultTemplateIds = ['temp-daily-gratitude', 'temp-weekly-sharing'];
    const filteredTemplates = parsed.mission_templates.filter((t: any) => !defaultTemplateIds.includes(t.id));
    if (filteredTemplates.length !== parsed.mission_templates.length) {
      parsed.mission_templates = filteredTemplates;
      upgraded = true;
    }
  }
  if (upgraded) {
    localStorage.setItem('nlp_game_db', JSON.stringify(parsed));
  }
  return parsed;
};

const saveLocalStorageData = (data: typeof SEED_DATA) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nlp_game_db', JSON.stringify(data));
  }
};

// ==========================================
// FLUENT MOCK SUPABASE CLIENT IMPLEMENTATION
// ==========================================

class SupabaseQueryBuilder {
  private tableName: string;
  private filters: Array<(item: any) => boolean> = [];
  private limitCount: number | null = null;
  private sortCol: string | null = null;
  private sortAsc = true;
  private action: 'select' | 'delete' | 'update' | 'insert' | 'upsert' = 'select';
  private updateValues: any = null;
  private insertValues: any = null;
  private upsertValues: any = null;
  private isSingle = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields?: string) {
    this.action = 'select';
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((item) => item[column] === value);
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push((item) => values.includes(item[column]));
    return this;
  }

  order(column: string, { ascending = true } = {}) {
    this.sortCol = column;
    this.sortAsc = ascending;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  update(values: any) {
    this.action = 'update';
    this.updateValues = values;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  insert(values: any | any[]) {
    this.action = 'insert';
    this.insertValues = values;
    return this;
  }

  upsert(values: any | any[]) {
    this.action = 'upsert';
    this.upsertValues = values;
    return this;
  }

  // Execute Async Action via standard Promise then() resolution
  async then(resolve: (value: any) => void) {
    const db = getLocalStorageData();

    if (this.action === 'select') {
      let data = (db as any)[this.tableName] || [];
      
      // Apply filters
      for (const filter of this.filters) {
        data = data.filter(filter);
      }

      // Apply Sorting
      if (this.sortCol) {
        const col = this.sortCol;
        const asc = this.sortAsc;
        data = [...data].sort((a, b) => {
          if (a[col] === null || a[col] === undefined) return 1;
          if (b[col] === null || b[col] === undefined) return -1;
          if (a[col] < b[col]) return asc ? -1 : 1;
          if (a[col] > b[col]) return asc ? 1 : -1;
          return 0;
        });
      }

      // Apply Limit
      if (this.limitCount !== null) {
        data = data.slice(0, this.limitCount);
      }

      const clonedData = JSON.parse(JSON.stringify(data));
      
      // Auto join relations
      if (this.tableName === 'submissions') {
        clonedData.forEach((sub: any) => {
          sub.mission = db.missions?.find(m => m.id === sub.mission_id);
          sub.profile = db.profiles.find(p => p.id === sub.student_id);
        });
      } else if (this.tableName === 'course_attendance') {
        clonedData.forEach((att: any) => {
          att.course = db.courses.find(c => c.id === att.course_id);
          att.profile = db.profiles.find(p => p.id === att.student_id);
        });
      } else if (this.tableName === 'user_achievements') {
        clonedData.forEach((uach: any) => {
          uach.achievement = db.achievements.find(a => a.id === uach.achievement_id);
        });
      } else if (this.tableName === 'student_notes') {
        clonedData.forEach((sn: any) => {
          sn.student = db.profiles.find(p => p.id === sn.student_id);
        });
      } else if (this.tableName === 'user_pets') {
        clonedData.forEach((up: any) => {
          up.pet = db.pets?.find(p => p.id === up.pet_id);
          up.profile = db.profiles.find(prof => prof.id === up.student_id);
        });
      } else if (this.tableName === 'deck_cards') {
        clonedData.forEach((dc: any) => {
          dc.card = db.cards?.find(c => c.id === dc.card_id);
        });
      } else if (this.tableName === 'user_decks') {
        clonedData.forEach((ud: any) => {
          ud.deck = db.decks?.find(d => d.id === ud.deck_id);
        });
      } else if (this.tableName === 'batch_mission_templates') {
        clonedData.forEach((bmt: any) => {
          bmt.batch = db.batches?.find(b => b.id === bmt.batch_id);
          bmt.template = db.mission_templates?.find(t => t.id === bmt.template_id);
        });
      } else if (this.tableName === 'missions') {
        clonedData.forEach((m: any) => {
          m.batch = db.batches?.find(b => b.id === m.batch_id);
          m.template = db.mission_templates?.find(t => t.id === m.template_id);
        });
      }

      if (this.isSingle) {
        resolve({ data: clonedData[0] || null, error: null });
      } else {
        resolve({ data: clonedData, error: null });
      }

    } else if (this.action === 'delete') {
      let data = (db as any)[this.tableName] || [];
      const remaining: any[] = [];
      const deleted: any[] = [];
      
      data.forEach((item: any) => {
        let matches = true;
        for (const filter of this.filters) {
          if (!filter(item)) {
            matches = false;
            break;
          }
        }
        if (matches) {
          deleted.push(item);
        } else {
          remaining.push(item);
        }
      });

      (db as any)[this.tableName] = remaining;

      if (this.tableName === 'submissions') {
        deleted.forEach(sub => {
          if (sub.status === 'approved') {
            const task = db.tasks?.find(t => t.id === sub.mission_id);
            const mission = !task ? db.missions?.find(m => m.id === sub.mission_id) : null;
            if (task) {
              adjustScoreLocal(sub.student_id, -sub.score_awarded, `取消已核准任務: ${task.name}`, 'admin1', sub.id, db);
            } else if (mission) {
              adjustScoreLocal(sub.student_id, -sub.score_awarded, `取消已核准任務: ${mission.title}`, 'admin1', sub.id, db);
            }
          }
        });
      }

      saveLocalStorageData(db);
      resolve({ data: deleted, error: null });

    } else if (this.action === 'update') {
      let data = (db as any)[this.tableName] || [];
      let updatedRows: any[] = [];
      
      data.forEach((item: any, idx: number) => {
        let matches = true;
        for (const filter of this.filters) {
          if (!filter(item)) {
            matches = false;
            break;
          }
        }

        if (matches) {
          const oldItem = { ...item };
          const newItem = { ...item, ...this.updateValues };
          
          if (this.tableName === 'submissions') {
            if (oldItem.status !== 'approved' && newItem.status === 'approved') {
              const task = db.tasks?.find(t => t.id === newItem.mission_id);
              const mission = !task ? db.missions?.find(m => m.id === newItem.mission_id) : null;
              if (task) {
                newItem.score_awarded = task.score;
                adjustScoreLocal(newItem.student_id, task.score, `完成任務: ${task.name}`, 'admin1', newItem.id, db);
              } else if (mission) {
                newItem.score_awarded = mission.points;
                adjustScoreLocal(newItem.student_id, mission.points, `完成任務: ${mission.title}`, 'admin1', newItem.id, db);
              }
            } else if (oldItem.status === 'approved' && newItem.status !== 'approved') {
              const task = db.tasks?.find(t => t.id === newItem.mission_id);
              const mission = !task ? db.missions?.find(m => m.id === newItem.mission_id) : null;
              if (task) {
                adjustScoreLocal(newItem.student_id, -oldItem.score_awarded, `取消已核准任務: ${task.name}`, 'admin1', newItem.id, db);
                newItem.score_awarded = 0;
              } else if (mission) {
                adjustScoreLocal(newItem.student_id, -oldItem.score_awarded, `取消已核准任務: ${mission.title}`, 'admin1', newItem.id, db);
                newItem.score_awarded = 0;
              }
            }
          }

          data[idx] = newItem;
          updatedRows.push(newItem);
        }
      });

      saveLocalStorageData(db);
      resolve({ data: updatedRows, error: null });

    } else if (this.action === 'insert') {
      const rows = Array.isArray(this.insertValues) ? this.insertValues : [this.insertValues];
      
      rows.forEach(row => {
        if (!row.id) row.id = Math.random().toString(36).substring(2, 11);
        if (!row.created_at) row.created_at = new Date().toISOString();
        
        if (this.tableName === 'submissions' && row.status === undefined) {
          row.status = 'pending';
          row.score_awarded = 0;
        }
        
        if (!(db as any)[this.tableName]) {
          (db as any)[this.tableName] = [];
        }
        (db as any)[this.tableName].push(row);
        
        if (this.tableName === 'submissions' && row.status === 'approved') {
          const task = db.tasks?.find(t => t.id === row.mission_id);
          const mission = !task ? db.missions?.find(m => m.id === row.mission_id) : null;
          if (task) {
            row.score_awarded = task.score;
            adjustScoreLocal(row.student_id, task.score, `完成任務: ${task.name}`, 'admin1', row.id, db);
          } else if (mission) {
            row.score_awarded = mission.points;
            adjustScoreLocal(row.student_id, mission.points, `完成任務: ${mission.title}`, 'admin1', row.id, db);
          }
        }
      });

      saveLocalStorageData(db);
      resolve({ data: rows, error: null });

    } else if (this.action === 'upsert') {
      const rows = Array.isArray(this.upsertValues) ? this.upsertValues : [this.upsertValues];
      let data = (db as any)[this.tableName] || [];

      rows.forEach(row => {
        const existingIndex = data.findIndex((item: any) => item.id === row.id);
        if (existingIndex > -1) {
          data[existingIndex] = { ...data[existingIndex], ...row };
        } else {
          if (!row.id) row.id = Math.random().toString(36).substring(2, 11);
          if (!row.created_at) row.created_at = new Date().toISOString();
          data.push(row);
        }
      });

      (db as any)[this.tableName] = data;
      saveLocalStorageData(db);
      resolve({ data: rows, error: null });
    }
  }
}

// Local helper to adjust score and update team/logs
const adjustScoreLocal = (studentId: string, amount: number, reason: string, createdBy: string | null, submissionId: string | null = null, db: typeof SEED_DATA) => {
  // Update Profile
  const profile = db.profiles.find(p => p.id === studentId);
  if (profile) {
    profile.score = Math.max(0, profile.score + amount);
    
    // Update Team score
    if (profile.team_id) {
      const team = db.teams.find(t => t.id === profile.team_id);
      if (team) {
        team.total_score = Math.max(0, team.total_score + amount);
      }
    }

    // Add Score Log
    db.score_logs.push({
      id: Math.random().toString(36).substring(2, 11),
      student_id: studentId,
      amount: amount,
      reason: reason,
      submission_id: submissionId,
      created_by: createdBy,
      created_at: new Date().toISOString()
    });

    // Check Achievements auto-unlock trigger
    db.achievements.forEach(ach => {
      if (ach.condition_type === 'total_score' && profile.score >= ach.condition_value) {
        const alreadyHas = db.user_achievements.some(ua => ua.student_id === studentId && ua.achievement_id === ach.id);
        if (!alreadyHas) {
          db.user_achievements.push({
            id: 'uach-' + Math.random().toString(36).substring(2, 11),
            student_id: studentId,
            achievement_id: ach.id,
            unlocked_at: new Date().toISOString()
          });
        }
      }
    });

    // Check Pets auto-unlock trigger
    if (db.pets) {
      db.pets.forEach(pet => {
        if (profile.score >= pet.unlock_score_threshold) {
          const alreadyHas = db.user_pets.some(up => up.student_id === studentId && up.pet_id === pet.id);
          if (!alreadyHas) {
            db.user_pets.push({
              id: 'upet-' + Math.random().toString(36).substring(2, 11),
              student_id: studentId,
              pet_id: pet.id,
              pet_level: 1,
              current_skin: 'default',
              unlocked_at: new Date().toISOString()
            });
          }
        }
      });
    }
  }
};

// Simulated RPC calls
const mockRpc = async (funcName: string, args: any) => {
  const db = getLocalStorageData();
  
  if (funcName === 'adjust_score') {
    const { p_student_id, p_amount, p_reason, p_created_by } = args;
    adjustScoreLocal(p_student_id, p_amount, p_reason, p_created_by, null, db);
    saveLocalStorageData(db);
    return { data: null, error: null };
  }
  
  return { data: null, error: `Function ${funcName} not supported in mock RPC` };
};

// Simulated auth functions
const mockAuth = {
  async signUp({ email, password, options }: any) {
    const db = getLocalStorageData();
    const name = options?.data?.name || email.split('@')[0];
    const role = options?.data?.role || 'student';
    const phone = options?.data?.phone || '';
    const batch_id = options?.data?.batch_id || null;
    const team_id = options?.data?.team_id || null;
    const captain_id = options?.data?.captain_id || null;
    
    // Check if user already exists (by name or phone+batch)
    const exists = db.profiles.some(p => p.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      return { data: null, error: { message: '姓名或使用者已存在' } };
    }
    
    if (phone && batch_id) {
      const duplicatePhone = db.profiles.some(p => p.phone === phone && p.batch_id === batch_id);
      if (duplicatePhone) {
        return { data: null, error: { message: '此手機號碼在同一個期數中已重複註冊' } };
      }
    }

    const newUser: Profile = {
      id: 'usr-' + Math.random().toString(36).substring(2, 11),
      name,
      role,
      team_id,
      batch_id,
      phone,
      captain_id,
      score: 0,
      created_at: new Date().toISOString()
    };

    db.profiles.push(newUser);
    saveLocalStorageData(db);
    
    const session = { user: { id: newUser.id, email, user_metadata: { name, role } } };
    if (typeof window !== 'undefined') {
      localStorage.setItem('nlp_session', JSON.stringify(newUser));
    }
    
    return { data: session, error: null };
  },

  async signInWithPassword({ email, password }: any) {
    const db = getLocalStorageData();
    // Simulate lookup: we check if there is a profile matching the email prefix or the text
    const loginName = email.split('@')[0];
    const profile = db.profiles.find(p => 
      p.phone === loginName || 
      p.name.toLowerCase() === loginName.toLowerCase() || 
      p.id === loginName
    );
    
    if (!profile) {
      return { data: null, error: { message: '找不到此帳號，請確認電話號碼或名稱是否正確。' } };
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('nlp_session', JSON.stringify(profile));
    }
    
    const session = { user: { id: profile.id, email, user_metadata: { name: profile.name, role: profile.role } } };
    return { data: session, error: null };
  },

  async signOut() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nlp_session');
    }
    return { error: null };
  },

  async getUser() {
    if (typeof window === 'undefined') return { data: { user: null }, error: null };
    const session = localStorage.getItem('nlp_session');
    if (!session) return { data: { user: null }, error: null };
    
    const profile = JSON.parse(session) as Profile;
    // Re-verify against DB to get latest scores
    const db = getLocalStorageData();
    const latestProfile = db.profiles.find(p => p.id === profile.id) || profile;
    
    const user = {
      id: latestProfile.id,
      email: `${latestProfile.id}@nlpgame.local`,
      user_metadata: {
        name: latestProfile.name,
        role: latestProfile.role
      }
    };
    return { data: { user }, error: null };
  },

  onAuthStateChange(callback: any) {
    // Just simple callback setup
    return { data: { subscription: { unsubscribe() {} } } };
  }
};

// ==========================================
// EXPORT UNIFIED SUPABASE CLIENT
// ==========================================

export const supabase = isRealSupabase ? (realSupabase as any) : {
  from(tableName: string) {
    return new SupabaseQueryBuilder(tableName);
  },
  rpc(funcName: string, args: any) {
    return mockRpc(funcName, args);
  },
  auth: mockAuth,
  storage: {
    from(bucketName: string) {
      return {
        async upload(filePath: string, file: File) {
          // Mock Storage Upload: return dummy URL
          const dummyUrl = URL.createObjectURL(file);
          return { data: { path: filePath, publicUrl: dummyUrl }, error: null };
        },
        getPublicUrl(filePath: string) {
          // Return unsplash as placeholder for uploaded items
          return { data: { publicUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=600' } };
        }
      };
    }
  }
};

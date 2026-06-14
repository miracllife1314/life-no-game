import { createClient } from '@supabase/supabase-js';
import { 
  Profile, Team, Task, Submission, ScoreLog, 
  Course, CourseAttendance, Achievement, UserAchievement, 
  Announcement, StudentNote,
  Pet, UserPet, PetLine, PetStage, PetEvolutionLog, Card, Deck, DeckCard, UserDeck,
  Batch, MissionTemplate, BatchMissionTemplate, Mission, CaptainCandidate
} from '@/types';

// Detect if Supabase URL and Key are provided and valid
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const isRealSupabase = !!(supabaseUrl && supabaseUrl !== 'your-supabase-url' && supabaseKey);

// Base real supabase client
export const realSupabase = isRealSupabase ? createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  }
}) : null;

// ==========================================
// 證明圖片上傳：把 base64 data-URL 上傳到 proof-images bucket，回傳公開 URL。
// - 本地模式或非 data-URL：原樣返回（保留 base64）
// - 上傳失敗：fallback 回原本 base64，確保打卡不會因此失敗
// ==========================================
export async function uploadProofImage(
  input: string | null | undefined
): Promise<string | null> {
  if (!input) return null;
  if (!isRealSupabase || !realSupabase || !input.startsWith('data:')) return input;
  try {
    const res = await fetch(input);
    const blob = await res.blob();
    const ext = (blob.type.split('/')[1] || 'webp').replace('+xml', '');
    const path = `proof-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const { error } = await realSupabase.storage
      .from('proof-images')
      .upload(path, blob, { contentType: blob.type || 'image/webp', upsert: true });
    if (error) {
      console.error('[uploadProofImage] upload failed, fallback to base64:', error);
      return input;
    }
    const { data } = realSupabase.storage.from('proof-images').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error('[uploadProofImage] error, fallback to base64:', e);
    return input;
  }
}

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
    { id: 'admin1', name: '林大統', phone: '0911111111', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'admin-dingyang', name: '劉定洋', phone: '0922222222', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'admin-panchan', name: '張品嬋', phone: '0933333333', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'captain-yuxi', name: '沈又希', phone: '0944444444', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-yuting', name: '林玉庭', phone: '0955555555', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-zhenyang', name: '陳振揚', phone: '0966666666', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-yiru', name: '蕭意儒', phone: '0977777777', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-haocheng', name: '曾浩程', phone: '0988888888', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-qunyi', name: '鄭群譯', phone: '0999999999', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-yahan', name: '蕭雅韓', phone: '0900000000', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-zongxuan', name: '蔡宗玹', phone: '0912345678', created_at: new Date('2026-04-16T08:00:00Z').toISOString() }
  ] as any[],

  user_batches: [
    { id: 'admin1', profile_id: 'admin1', batch_id: null, team_id: null, role: 'admin', score: 15000, status: 'active', division_name: '大統大隊', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'admin-dingyang', profile_id: 'admin-dingyang', batch_id: null, team_id: null, role: 'admin', score: 20000, status: 'active', division_name: '定洋大隊', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'admin-panchan', profile_id: 'admin-panchan', batch_id: null, team_id: null, role: 'admin', score: 20000, status: 'active', division_name: '定洋大隊', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'captain-yuxi', profile_id: 'captain-yuxi', batch_id: 'batch-47', team_id: 'team1', role: 'captain', score: 6950, status: 'ended', director_id: 'admin-dingyang', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-yuting', profile_id: 'student-yuting', batch_id: 'batch-47', team_id: 'team1', role: 'student', score: 4400, status: 'ended', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-zhenyang', profile_id: 'student-zhenyang', batch_id: 'batch-47', team_id: 'team1', role: 'student', score: 2900, status: 'ended', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-yiru', profile_id: 'student-yiru', batch_id: 'batch-47', team_id: 'team1', role: 'student', score: 2600, status: 'ended', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-haocheng', profile_id: 'student-haocheng', batch_id: 'batch-47', team_id: 'team1', role: 'student', score: 2550, status: 'ended', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-qunyi', profile_id: 'student-qunyi', batch_id: 'batch-47', team_id: 'team1', role: 'student', score: 2500, status: 'ended', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-yahan', profile_id: 'student-yahan', batch_id: 'batch-47', team_id: 'team1', role: 'student', score: 2150, status: 'ended', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'student-zongxuan', profile_id: 'student-zongxuan', batch_id: 'batch-47', team_id: 'team1', role: 'student', score: 1600, status: 'ended', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },

    { id: 'yuting-50', profile_id: 'student-yuting', batch_id: 'batch-50', team_id: 'team1', role: 'student', score: 2000, status: 'active', created_at: new Date('2026-06-01T08:00:00Z').toISOString() },
    { id: 'zhenyang-50', profile_id: 'student-zhenyang', batch_id: 'batch-50', team_id: 'team1', role: 'student', score: 1500, status: 'active', created_at: new Date('2026-06-01T08:00:00Z').toISOString() }
  ] as any[],

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
    { id: 'ann-welcome', title: '📢 歡迎來到第47期NLP台中場初階班計分系統！', content: '各位修行者好，本系統提供完整的每日定課簽到、每週主線任務以及特殊限時加分功能。您可以透過持續修行解鎖高階成就徽章，爭奪排行榜榜首！請使用您在試算表上的中文姓名直接登入，預設小隊長為：沈又希，學員為林玉庭、陳振揚等組員。', created_by: 'admin1', created_at: new Date('2026-04-16T08:00:00Z').toISOString() }
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
      pet_line: null,
      current_stage_index: 1,
      total_exp: 4400,
      level: 8,
      first_reached_lv5_at: new Date('2026-06-03T12:00:00Z').toISOString(),
      evolution_eligible_at: new Date('2026-06-03T12:00:00Z').toISOString(),
      evolved_at: null,
      has_pending_evolution: true,
      created_at: new Date('2026-06-01T08:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T08:00:00Z').toISOString()
    },
    {
      id: 'upet-yuxi-1',
      student_id: 'captain-yuxi',
      pet_line: null,
      current_stage_index: 1,
      total_exp: 6950,
      level: 13,
      first_reached_lv5_at: new Date('2026-06-02T10:00:00Z').toISOString(),
      evolution_eligible_at: new Date('2026-06-02T10:00:00Z').toISOString(),
      evolved_at: null,
      has_pending_evolution: true,
      created_at: new Date('2026-06-01T08:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T08:00:00Z').toISOString()
    }
  ] as UserPet[],

  pet_lines: [
    {
      id: 'pl-dragon',
      line_key: 'dragon',
      name: '影響力龍系',
      description: '代表極具感染力與說服力的語言能量。適合快速突破、感召他人的修行者。',
      core_traits: '感召力、說服力、能量感',
      is_active: true,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792807.png',
      unlock_level: 5,
      task_template_id: 'temp-evolve-dragon',
      sort_order: 1,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'pl-lion',
      line_key: 'lion',
      name: '行動力獅系',
      description: '代表無畏的執行力與目標導向能量。適合迅速將知識轉化為實戰成果的修行者。',
      core_traits: '執行力、勇氣、突破力',
      is_active: true,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792811.png',
      unlock_level: 5,
      task_template_id: 'temp-evolve-lion',
      sort_order: 2,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'pl-fox',
      line_key: 'fox',
      name: '親和力狐系',
      description: '代表溫暖和諧的同理與連結能量。適合建立深厚信任與感官呼應的修行者。',
      core_traits: '親和感、感官呼應、人際連結',
      is_active: true,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792817.png',
      unlock_level: 5,
      task_template_id: 'temp-evolve-fox',
      sort_order: 3,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'pl-spirit',
      line_key: 'spirit',
      name: '穩定靈獸系',
      description: '代表沉穩的自我覺察與深層同理能量。適合提供穩定支持與自我對話的修行者。',
      core_traits: '自我覺察、穩定度、同理心',
      is_active: true,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792823.png',
      unlock_level: 5,
      task_template_id: 'temp-evolve-spirit',
      sort_order: 4,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    }
  ] as PetLine[],

  pet_stages: [
    {
      id: 'ps-egg',
      line_key: null,
      stage_index: 1,
      stage_name: '混沌之卵',
      min_level: 0,
      max_level: 4,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792770.png',
      animation_type: 'animate-pulse',
      glow_color: '#A855F7',
      description: '蘊含著無限可能的混沌之卵，靜靜等待能量積累以尋找其未來的進化方向。',
      evolution_text: '當修行達到 Level 5 (3500 EXP) 時，混沌之卵將會破殼誕生出你專屬的 NLP 守護神獸！',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    // === 影響力龍系 ===
    {
      id: 'ps-dragon-2',
      line_key: 'dragon',
      stage_index: 2,
      stage_name: '幼龍',
      min_level: 5,
      max_level: 9,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792807.png',
      animation_type: 'animate-bounce',
      glow_color: '#EF4444',
      description: '龍系幼獸，呼吸吐納間皆是自信與感召力，能給予修行者強大的語言影響力與感召能量。',
      evolution_text: '達到 LV.10 可進化為飛龍。',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'ps-dragon-3',
      line_key: 'dragon',
      stage_index: 3,
      stage_name: '飛龍',
      min_level: 10,
      max_level: 14,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792777.png',
      animation_type: 'animate-pulse',
      glow_color: '#F97316',
      description: '龍系成長體，周身烈火漸盛，象徵著在溝通對話中如火純青的語意框架與影響能量。',
      evolution_text: '達到 LV.15 可進化為幻龍。',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'ps-dragon-4',
      line_key: 'dragon',
      stage_index: 4,
      stage_name: '幻龍',
      min_level: 15,
      max_level: 19,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792823.png',
      animation_type: 'animate-breath',
      glow_color: '#DC2626',
      description: '龍系成熟體，具備幻化莫測的思維框架與影響力，能引導與同理任何限制性信念。',
      evolution_text: '達到 LV.20 可進化為聖龍。',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'ps-dragon-5',
      line_key: 'dragon',
      stage_index: 5,
      stage_name: '聖龍',
      min_level: 20,
      max_level: 24,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792773.png',
      animation_type: 'animate-wiggle',
      glow_color: '#EC4899',
      description: '龍系聖獸，散發著溫暖神聖的感召力量，協助修行者將溝通化為深刻的生命啟發。',
      evolution_text: '達到 LV.25 可進化為終極創世龍。',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'ps-dragon-6',
      line_key: 'dragon',
      stage_index: 6,
      stage_name: '創世龍',
      min_level: 25,
      max_level: 999,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792834.png',
      animation_type: 'animate-float',
      glow_color: '#8B5CF6',
      description: '龍系創世神獸，掌控心靈溝通地圖的本源力量，舉手投足間引領眾人走向卓越。',
      evolution_text: '已達最高進化階段！',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    // === 行動力獅系 ===
    {
      id: 'ps-lion-2',
      line_key: 'lion',
      stage_index: 2,
      stage_name: '小戰獅',
      min_level: 5,
      max_level: 9,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792813.png',
      animation_type: 'animate-pulse',
      glow_color: '#F59E0B',
      description: '獅系幼獸，步伐矯健，雙眼中透露出無畏的執行力，能引領修行者迅速將目標轉化為具體行動。',
      evolution_text: '達到 LV.10 可進化為戰鬃獅。',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'ps-lion-3',
      line_key: 'lion',
      stage_index: 3,
      stage_name: '戰鬃獅',
      min_level: 10,
      max_level: 14,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792779.png',
      animation_type: 'animate-bounce',
      glow_color: '#EAB308',
      description: '獅系成長體，鬃毛如風暴般飛揚，步伐穩健沉重，代表著修行者不屈不撓的目標執行力量。',
      evolution_text: '達到 LV.15 可進化為狂獅王。',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'ps-lion-4',
      line_key: 'lion',
      stage_index: 4,
      stage_name: '狂獅王',
      min_level: 15,
      max_level: 19,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792831.png',
      animation_type: 'animate-wiggle',
      glow_color: '#D97706',
      description: '獅系成熟體，王者風範霸氣展現，無所畏懼，能帶領團隊掃除一切修行障礙，具備極致的實踐能量。',
      evolution_text: '達到 LV.20 可進化為王者戰獅。',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'ps-lion-5',
      line_key: 'lion',
      stage_index: 5,
      stage_name: '王者戰獅',
      min_level: 20,
      max_level: 24,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792784.png',
      animation_type: 'animate-pulse',
      glow_color: '#10B981',
      description: '獅系聖獸，象徵卓越執行力與堅毅行動力的化身，帶給團隊無可抵擋的突破能量。',
      evolution_text: '達到 LV.25 可進化為聖獅皇。',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'ps-lion-6',
      line_key: 'lion',
      stage_index: 6,
      stage_name: '聖獅皇',
      min_level: 25,
      max_level: 999,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792842.png',
      animation_type: 'animate-breath',
      glow_color: '#3B82F6',
      description: '獅系終極至尊皇者，所向披靡，象徵徹底的自我突破與至高無上的行動實踐境界。',
      evolution_text: '已達到行動力獅系的最高階段！',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    // === 親和力狐系 ===
    {
      id: 'ps-fox-2',
      line_key: 'fox',
      stage_index: 2,
      stage_name: '小靈狐',
      min_level: 5,
      max_level: 9,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792825.png',
      animation_type: 'animate-pulse',
      glow_color: '#EC4899',
      description: '狐系幼獸，靈動而富有智慧，親和力拉滿，能敏銳感知人際間的微妙情緒起伏，賦予修行者和諧共鳴的對話技巧。',
      evolution_text: '達到 LV.10 可進化為靈狐。',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'ps-fox-3',
      line_key: 'fox',
      stage_index: 3,
      stage_name: '靈狐',
      min_level: 10,
      max_level: 14,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792782.png',
      animation_type: 'animate-float',
      glow_color: '#D946EF',
      description: '狐系成長體，尾泛流光，能巧妙進入對方的感官系統，幫助修行者建立更深層的親和感與信任。',
      evolution_text: '達到 LV.15 可進化為月影仙狐。',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'ps-fox-4',
      line_key: 'fox',
      stage_index: 4,
      stage_name: '月影仙狐',
      min_level: 15,
      max_level: 19,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792837.png',
      animation_type: 'animate-breath',
      glow_color: '#8B5CF6',
      description: '狐系成熟體，九尾舒展、流光溢彩，能隨心所欲解鎖任何人際密碼，具備極致的和諧連結與親和力。',
      evolution_text: '達到 LV.20 可進化為九尾仙狐。',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'ps-fox-5',
      line_key: 'fox',
      stage_index: 5,
      stage_name: '九尾仙狐',
      min_level: 20,
      max_level: 24,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792789.png',
      animation_type: 'animate-pulse',
      glow_color: '#06B6D4',
      description: '狐系聖狐仙獸，善用同理與和諧共振磁場，使修行者自然散發令人信賴的親和光環。',
      evolution_text: '達到 LV.25 可進化為天狐聖獸。',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'ps-fox-6',
      line_key: 'fox',
      stage_index: 6,
      stage_name: '天狐聖獸',
      min_level: 25,
      max_level: 999,
      image_url: 'https://cdn-icons-png.flaticon.com/512/1792/1792848.png',
      animation_type: 'animate-float',
      glow_color: '#F472B6',
      description: '狐系終極始祖天狐，通曉萬物情緒與人心共鳴，達到完美溝通和諧的心靈大圓滿之境。',
      evolution_text: '已達到親和力狐系的最高階段！',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    // === 穩定靈獸系 ===
    {
      id: 'ps-spirit-2',
      line_key: 'spirit',
      stage_index: 2,
      stage_name: '小靈獸',
      min_level: 5,
      max_level: 9,
      image_url: 'https://cdn-icons-png.flaticon.com/512/3069/3069172.png',
      animation_type: 'animate-pulse',
      glow_color: '#3B82F6',
      description: '水系靈獸幼體，沉靜如海，散發著寧靜與包容心靈的和諧光芒，賦予修行者穩定的支持與極致的同理能量。',
      evolution_text: '達到 LV.10 可進化為覺醒靈獸。',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'ps-spirit-3',
      line_key: 'spirit',
      stage_index: 3,
      stage_name: '覺醒靈獸',
      min_level: 10,
      max_level: 14,
      image_url: 'https://cdn-icons-png.flaticon.com/512/3069/3069186.png',
      animation_type: 'animate-float',
      glow_color: '#06B6D4',
      description: '水系成長體，凝聚深海露華，周圍流淌著無形的同理波紋，為修行者帶來安撫心靈的穩定磁場。',
      evolution_text: '達到 LV.15 可進化為穩定靈獸。',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'ps-spirit-4',
      line_key: 'spirit',
      stage_index: 4,
      stage_name: '穩定靈獸',
      min_level: 15,
      max_level: 19,
      image_url: 'https://cdn-icons-png.flaticon.com/512/3069/3069224.png',
      animation_type: 'animate-breath',
      glow_color: '#0D9488',
      description: '水系成熟體之終極型態，深邃包容、如水至柔，擁有強大而穩定的自我覺察與深層同理場域。',
      evolution_text: '達到 LV.20 可進化為厚積聖獸。',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'ps-spirit-5',
      line_key: 'spirit',
      stage_index: 5,
      stage_name: '厚積聖獸',
      min_level: 20,
      max_level: 24,
      image_url: 'https://cdn-icons-png.flaticon.com/512/3069/3069190.png',
      animation_type: 'animate-pulse',
      glow_color: '#6366F1',
      description: '水系聖獸，大器晚成、靜水流深，散發深邃和諧的氣場，帶給心靈無與倫比的安寧與力量。',
      evolution_text: '達到 LV.25 可進化為自然神獸。',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'ps-spirit-6',
      line_key: 'spirit',
      stage_index: 6,
      stage_name: '自然神獸',
      min_level: 25,
      max_level: 999,
      image_url: 'https://cdn-icons-png.flaticon.com/512/3069/3069230.png',
      animation_type: 'animate-float',
      glow_color: '#10B981',
      description: '水系終極自然化身神獸，與萬物自然融為一體，達到極致的同理支持與全然包容境界。',
      evolution_text: '已達到穩定靈獸系的最高階段！',
      is_active: true,
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    }
  ] as PetStage[],

  pet_evolution_logs: [] as PetEvolutionLog[],

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
      rankings_visible: false,
      created_at: new Date('2026-04-16T08:00:00Z').toISOString(),
      updated_at: new Date('2026-04-16T08:00:00Z').toISOString()
    },
    {
      id: 'batch-50',
      name: 'NLP初階50期',
      start_date: '2026-06-01T00:00:00Z',
      end_date: '2026-06-30T23:59:59Z',
      status: 'active',
      rankings_visible: false,
      created_at: new Date('2026-06-01T08:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T08:00:00Z').toISOString()
    },
    {
      id: 'batch-51',
      name: 'NLP初階51期',
      start_date: '2026-07-01T00:00:00Z',
      end_date: '2026-07-31T23:59:59Z',
      status: 'draft',
      rankings_visible: false,
      created_at: new Date('2026-06-01T08:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T08:00:00Z').toISOString()
    }
  ] as Batch[],

  mission_templates: [
    {
      id: 'temp-evolve-dragon',
      title: '影響力龍系進化任務：發表一次 NLP 主題感召分享',
      description: '在小組或社群中發表一次關於 NLP 溝通框架或人性的感召演說或心得分享，展現你的語言感染力。',
      mission_type: 'special',
      points: 500,
      review_type: 'leader',
      is_active: true,
      category: '神獸進化',
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'temp-evolve-lion',
      title: '行動力獅系進化任務：完成一次日常 NLP 溝通實戰',
      description: '將所學的 NLP 語言模式實際應用在工作或生活對話中，並記錄下對方的具體反饋與自己的覺察。',
      mission_type: 'special',
      points: 500,
      review_type: 'leader',
      is_active: true,
      category: '神獸進化',
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'temp-evolve-fox',
      title: '親和力狐系進化任務：建立一段深度的親和感共鳴對話',
      description: '運用「感官呼應與引導」技巧，與一位夥伴進行至少 15 分鐘的深度傾聽與親和感建立對話。',
      mission_type: 'special',
      points: 500,
      review_type: 'leader',
      is_active: true,
      category: '神獸進化',
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    },
    {
      id: 'temp-evolve-spirit',
      title: '穩定靈獸系進化任務：撰寫一篇深層自我覺察心錨筆記',
      description: '安靜獨處 10 分鐘，記錄近期的一項情緒起伏，運用 NLP 心錨或重塑技巧進行自我對話與心境轉化。',
      mission_type: 'special',
      points: 500,
      review_type: 'leader',
      is_active: true,
      category: '神獸進化',
      created_at: new Date('2026-06-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-06-01T00:00:00Z').toISOString()
    }
  ] as MissionTemplate[],

  batch_mission_templates: [] as BatchMissionTemplate[],

  missions: [] as Mission[],

  captain_candidates: [
    { id: 'cand-yuxi', profile_id: 'captain-yuxi', status: 'eligible', created_at: new Date('2026-04-16T08:00:00Z').toISOString() },
    { id: 'cand-yuting', profile_id: 'student-yuting', status: 'eligible', created_at: new Date('2026-04-16T08:00:00Z').toISOString() }
  ] as CaptainCandidate[]
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
  let upgraded = false;
  const newKeys = ['pets', 'user_pets', 'cards', 'decks', 'deck_cards', 'user_decks', 'batches', 'mission_templates', 'batch_mission_templates', 'missions', 'pet_lines', 'pet_stages', 'pet_evolution_logs', 'user_batches', 'captain_candidates'];
  newKeys.forEach(key => {
    if (!parsed[key]) {
      parsed[key] = (SEED_DATA as any)[key] || [];
      upgraded = true;
    }
  });

  if (!parsed.user_batches || parsed.user_batches.length === 0) {
    parsed.user_batches = [];
    if (parsed.profiles) {
      const migratedProfiles: any[] = [];
      parsed.profiles.forEach((p: any) => {
        if (p.role !== undefined || p.score !== undefined || p.batch_id !== undefined) {
          parsed.user_batches.push({
            id: p.id,
            profile_id: p.id,
            batch_id: p.batch_id !== undefined ? p.batch_id : (p.role === 'admin' ? null : 'batch-50'),
            team_id: p.team_id || null,
            role: p.role || 'student',
            score: p.score !== undefined ? p.score : 0,
            status: p.status || 'active',
            captain_id: p.captain_id || null,
            division_name: p.division_name || null,
            director_id: p.director_id || null,
            created_at: p.created_at || new Date().toISOString()
          });
          
          migratedProfiles.push({
            id: p.id,
            name: p.name,
            phone: p.phone || '',
            created_at: p.created_at || new Date().toISOString()
          });
        } else {
          migratedProfiles.push(p);
        }
      });
      parsed.profiles = migratedProfiles;
      
      const hasYuting50 = parsed.user_batches.some((ub: any) => ub.profile_id === 'student-yuting' && ub.batch_id === 'batch-50');
      if (!hasYuting50 && parsed.profiles.some((p: any) => p.id === 'student-yuting')) {
        parsed.user_batches.push({
          id: 'yuting-50',
          profile_id: 'student-yuting',
          batch_id: 'batch-50',
          team_id: 'team1',
          role: 'student',
          score: 2000,
          status: 'active',
          created_at: new Date('2026-06-01T08:00:00Z').toISOString()
        });
      }
      
      if (typeof window !== 'undefined') {
        const sessionStr = localStorage.getItem('nlp_session');
        if (sessionStr) {
          try {
            const sessionUser = JSON.parse(sessionStr);
            const enrollment = parsed.user_batches.find((ub: any) => ub.profile_id === sessionUser.id && ub.status === 'active') || 
                               parsed.user_batches.find((ub: any) => ub.profile_id === sessionUser.id);
            const prof = parsed.profiles.find((pr: any) => pr.id === sessionUser.id);
            if (enrollment && prof) {
              const upgradedSession = {
                ...prof,
                id: enrollment.id,
                profile_id: prof.id,
                batch_id: enrollment.batch_id,
                team_id: enrollment.team_id,
                role: enrollment.role,
                score: enrollment.score,
                status: enrollment.status,
                captain_id: enrollment.captain_id,
                division_name: enrollment.division_name,
                director_id: enrollment.director_id
              };
              localStorage.setItem('nlp_session', JSON.stringify(upgradedSession));
            }
          } catch (e) {
            console.warn('Failed to upgrade nlp_session:', e);
          }
        }
      }
    } else {
      parsed.user_batches = SEED_DATA.user_batches;
    }
    upgraded = true;
  }

  if (!parsed.pet_lines || parsed.pet_lines.length === 0 || parsed.pet_lines.some((l: any) => l.unlock_level === undefined)) {
    parsed.pet_lines = SEED_DATA.pet_lines;
    upgraded = true;
  }
  if (!parsed.mission_templates || parsed.mission_templates.length === 0 || !parsed.mission_templates.some((t: any) => t.id.startsWith('temp-evolve'))) {
    const filtered = (parsed.mission_templates || []).filter((t: any) => !t.id.startsWith('temp-evolve'));
    parsed.mission_templates = [...filtered, ...SEED_DATA.mission_templates];
    upgraded = true;
  }
  if (!parsed.pet_stages || parsed.pet_stages.length < 21) {
    parsed.pet_stages = SEED_DATA.pet_stages;
    upgraded = true;
  }

  if (parsed.user_pets && (parsed.user_pets.length === 0 || parsed.user_pets.some((up: any) => up.current_stage_index === undefined))) {
    parsed.user_pets = [];
    parsed.profiles?.forEach((p: any) => {
      if (p.role !== 'admin') {
        const total_exp = p.score || 0;
        const level = Math.floor(total_exp / 700);
        const reachedLv5 = level >= 5;
        const first_reached_lv5_at = reachedLv5 ? new Date('2026-06-03T12:00:00Z').toISOString() : null;

        parsed.user_pets.push({
          id: 'upet-' + p.id,
          student_id: p.id,
          pet_line: null,
          current_stage_index: 1,
          total_exp: total_exp,
          level: level,
          first_reached_lv5_at: first_reached_lv5_at,
          evolution_eligible_at: first_reached_lv5_at,
          evolved_at: null,
          has_pending_evolution: reachedLv5,
          selected_evolution_line: null,
          created_at: p.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    });
    upgraded = true;
  }
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
  if (parsed.profiles) {
    if (parsed.batches) {
      parsed.batches.forEach((b: any) => {
        if (b.division_name !== undefined || b.director_name !== undefined) {
          delete b.division_name;
          delete b.director_name;
          upgraded = true;
        }
      });
    }

    // Clean up all duplicate profiles for '劉定洋' and '張品嬋'
    const targetNames = ['劉定洋', '張品嬋'];
    targetNames.forEach(targetName => {
      const matches = parsed.profiles.filter((p: any) => p.name === targetName);
      if (matches.length > 1) {
        const primaryId = targetName === '劉定洋' ? 'admin-dingyang' : 'admin-panchan';
        let primary = matches.find((p: any) => p.id === primaryId);
        if (!primary) {
          primary = matches[0];
        }

        const secondaryIds: string[] = [];
        parsed.profiles = parsed.profiles.filter((p: any) => {
          if (p.name === targetName && p.id !== primary.id) {
            secondaryIds.push(p.id);
            return false;
          }
          return true;
        });

        const seenIds = new Set<string>();
        parsed.profiles = parsed.profiles.filter((p: any) => {
          if (p.id === primary.id) {
            if (seenIds.has(p.id)) {
              return false;
            }
            seenIds.add(p.id);
          }
          return true;
        });

        primary.id = primaryId;
        primary.role = 'admin';
        if (!primary.division_name) {
          primary.division_name = '定洋大隊';
        }

        const maxScore = Math.max(...matches.map((p: any) => p.score || 0));
        primary.score = maxScore;
        upgraded = true;

        if (secondaryIds.length > 0) {
          if (parsed.submissions) {
            parsed.submissions.forEach((sub: any) => {
              if (secondaryIds.includes(sub.student_id)) sub.student_id = primary.id;
              if (secondaryIds.includes(sub.reviewed_by)) sub.reviewed_by = primary.id;
            });
          }
          if (parsed.score_logs) {
            parsed.score_logs.forEach((log: any) => {
              if (secondaryIds.includes(log.student_id)) log.student_id = primary.id;
              if (secondaryIds.includes(log.created_by)) log.created_by = primary.id;
            });
          }
          if (parsed.user_pets) {
            parsed.user_pets.forEach((up: any) => {
              if (secondaryIds.includes(up.student_id)) up.student_id = primary.id;
            });
          }
          if (parsed.student_notes) {
            parsed.student_notes.forEach((note: any) => {
              if (secondaryIds.includes(note.student_id)) note.student_id = primary.id;
              if (secondaryIds.includes(note.captain_id)) note.captain_id = primary.id;
            });
          }
          parsed.profiles.forEach((p: any) => {
            if (secondaryIds.includes(p.captain_id)) p.captain_id = primary.id;
            if (secondaryIds.includes(p.director_id)) p.director_id = primary.id;
          });
          if (parsed.teams) {
            parsed.teams.forEach((t: any) => {
              if (secondaryIds.includes(t.captain_id)) t.captain_id = primary.id;
            });
          }
        }
      }
    });

    // Handle single duplicate elements by ID for all profiles
    const seenProfileIds = new Set<string>();
    const originalCount = parsed.profiles.length;
    parsed.profiles = parsed.profiles.filter((p: any) => {
      if (!p.id) return false;
      if (seenProfileIds.has(p.id)) {
        return false;
      }
      seenProfileIds.add(p.id);
      return true;
    });
    if (parsed.profiles.length !== originalCount) {
      upgraded = true;
    }

    const hasDingyang = parsed.profiles.some((p: any) => p.id === 'admin-dingyang');
    if (!hasDingyang) {
      parsed.profiles.push({
        id: 'admin-dingyang',
        name: '劉定洋',
        role: 'admin',
        team_id: null,
        batch_id: null,
        division_name: '定洋大隊',
        score: 20000,
        created_at: new Date('2026-04-16T08:00:00Z').toISOString()
      });
      upgraded = true;
    }

    const hasPanchan = parsed.profiles.some((p: any) => p.id === 'admin-panchan');
    if (!hasPanchan) {
      parsed.profiles.push({
        id: 'admin-panchan',
        name: '張品嬋',
        role: 'admin',
        team_id: null,
        batch_id: null,
        division_name: '定洋大隊',
        score: 20000,
        created_at: new Date('2026-04-16T08:00:00Z').toISOString()
      });
      upgraded = true;
    }

    const yuxi = parsed.profiles.find((p: any) => p.id === 'captain-yuxi');
    if (yuxi && !yuxi.director_id) {
      yuxi.director_id = 'admin-dingyang';
      upgraded = true;
    }
  }
  if (upgraded) {
    try {
      localStorage.setItem('nlp_game_db', JSON.stringify(parsed));
    } catch (e) {
      console.warn('Failed to upgrade local storage db schema:', e);
    }
  }
  return parsed;
};

const saveLocalStorageData = (data: typeof SEED_DATA) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('nlp_game_db', JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save to local storage (quota exceeded):', e);
    }
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

    // Dynamically construct merged profiles
    const mergedProfiles = (db.user_batches || []).map((ub: any) => {
      const p = db.profiles.find((prof: any) => prof.id === ub.profile_id);
      if (!p) return null;
      return {
        ...p,
        id: ub.id,
        profile_id: p.id,
        batch_id: ub.batch_id,
        team_id: ub.team_id,
        role: ub.role,
        score: ub.score,
        status: ub.status,
        captain_id: ub.captain_id,
        division_name: ub.division_name,
        director_id: ub.director_id
      };
    }).filter(Boolean);

    if (this.action === 'select') {
      let data = (db as any)[this.tableName] || [];
      if (this.tableName === 'profiles') {
        data = mergedProfiles;
      } else if (this.tableName === 'captain_candidates') {
        data = ((db as any).captain_candidates || []).map((cand: any) => {
          const p = db.profiles.find((prof: any) => prof.id === cand.profile_id);
          if (!p) return null;
          const enrollments = db.user_batches.filter((ub: any) => ub.profile_id === p.id);
          const past_cohorts = enrollments.map((ub: any) => {
            const b = db.batches.find((batch: any) => batch.id === ub.batch_id);
            return b ? b.name : null;
          }).filter(Boolean);
          const past_roles = Array.from(new Set(enrollments.map((ub: any) => {
            if (ub.role === 'admin') return '大隊長';
            if (ub.role === 'captain') return '小隊長';
            return '學員';
          })));
          return {
            ...cand,
            name: p.name,
            phone: p.phone || '',
            past_cohorts,
            past_roles
          };
        }).filter(Boolean);
      }
      
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
          sub.profile = mergedProfiles.find(p => p.id === sub.student_id);
        });
      } else if (this.tableName === 'course_attendance') {
        clonedData.forEach((att: any) => {
          att.course = db.courses.find(c => c.id === att.course_id);
          att.profile = mergedProfiles.find(p => p.id === att.student_id);
        });
      } else if (this.tableName === 'user_achievements') {
        clonedData.forEach((uach: any) => {
          uach.achievement = db.achievements.find(a => a.id === uach.achievement_id);
        });
      } else if (this.tableName === 'student_notes') {
        clonedData.forEach((sn: any) => {
          sn.student = mergedProfiles.find(p => p.id === sn.student_id);
        });
      } else if (this.tableName === 'user_pets') {
        clonedData.forEach((up: any) => {
          const activeStage = db.pet_stages?.find((s: any) => s.line_key === up.pet_line && s.stage_index === up.current_stage_index);
          up.stage = activeStage || null;
          up.pet = activeStage ? {
            id: activeStage.id,
            name: activeStage.stage_name,
            description: activeStage.description,
            image_url: activeStage.image_url,
            evolution_image_url: activeStage.image_url,
            unlock_score_threshold: activeStage.min_level * 700,
            created_at: activeStage.created_at
          } : null;
          up.profile = mergedProfiles.find(prof => prof.id === up.student_id);
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
      if (this.tableName === 'profiles') {
        const remaining: any[] = [];
        const deleted: any[] = [];
        db.user_batches.forEach((ub: any) => {
          const merged = mergedProfiles.find(mp => mp.id === ub.id);
          if (!merged) return;
          let matches = true;
          for (const filter of this.filters) {
            if (!filter(merged)) {
              matches = false;
              break;
            }
          }
          if (matches) {
            deleted.push(merged);
            if (ub.role === 'captain' && ub.team_id) {
              const t = db.teams.find((team: any) => team.id === ub.team_id);
              if (t && t.captain_id === ub.profile_id) {
                t.captain_id = null;
              }
            }
          } else {
            remaining.push(ub);
          }
        });
        db.user_batches = remaining;
        saveLocalStorageData(db);
        resolve({ data: deleted, error: null });
        return;
      }

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
      if (this.tableName === 'profiles') {
        let updatedRows: any[] = [];
        db.user_batches.forEach((ub: any) => {
          const p = db.profiles.find(prof => prof.id === ub.profile_id);
          if (!p) return;
          const merged = mergedProfiles.find(mp => mp.id === ub.id);
          if (!merged) return;

          let matches = true;
          for (const filter of this.filters) {
            if (!filter(merged)) {
              matches = false;
              break;
            }
          }

          if (matches) {
            if (this.updateValues.name !== undefined) p.name = this.updateValues.name;
            if (this.updateValues.phone !== undefined) p.phone = this.updateValues.phone;
            
            const oldRole = ub.role;
            const oldTeamId = ub.team_id;
            
            if (this.updateValues.batch_id !== undefined) ub.batch_id = this.updateValues.batch_id;
            if (this.updateValues.team_id !== undefined) ub.team_id = this.updateValues.team_id;
            if (this.updateValues.role !== undefined) ub.role = this.updateValues.role;
            if (this.updateValues.score !== undefined) ub.score = this.updateValues.score;
            if (this.updateValues.status !== undefined) ub.status = this.updateValues.status;
            if (this.updateValues.captain_id !== undefined) ub.captain_id = this.updateValues.captain_id;
            if (this.updateValues.division_name !== undefined) ub.division_name = this.updateValues.division_name;
            if (this.updateValues.director_id !== undefined) ub.director_id = this.updateValues.director_id;
            
            const newRole = ub.role;
            const newTeamId = ub.team_id;
            const batchId = ub.batch_id || 'batch-50';

            // Bidirectional sync for captain assignment
            if (oldRole === 'captain' && (newRole !== 'captain' || newTeamId !== oldTeamId)) {
              if (oldTeamId) {
                const t = db.teams.find((team: any) => team.id === oldTeamId);
                if (t && t.captain_id === ub.profile_id) {
                  t.captain_id = null;
                }
              }
            }
            
            if (newRole === 'captain' && newTeamId && (oldRole !== 'captain' || newTeamId !== oldTeamId)) {
              const duplicateTeam = db.teams.find((team: any) => team.batch_id === batchId && team.captain_id === ub.profile_id && team.id !== newTeamId);
              if (duplicateTeam) {
                resolve({ data: null, error: { message: '此人在此期數已擔任其他小隊的小隊長！' } });
                return;
              }
              const t = db.teams.find((team: any) => team.id === newTeamId);
              if (t) {
                t.captain_id = ub.profile_id;
              }
              db.user_batches.forEach((studentUb: any) => {
                if (studentUb.batch_id === batchId && studentUb.team_id === newTeamId && studentUb.role === 'student') {
                  studentUb.captain_id = ub.profile_id;
                }
              });
            }

            if (newRole === 'student' && newTeamId) {
              const t = db.teams.find((team: any) => team.id === newTeamId);
              ub.captain_id = t ? t.captain_id : null;
            }
            
            const newMerged = {
              ...p,
              id: ub.id,
              profile_id: p.id,
              batch_id: ub.batch_id,
              team_id: ub.team_id,
              role: ub.role,
              score: ub.score,
              status: ub.status,
              captain_id: ub.captain_id,
              division_name: ub.division_name,
              director_id: ub.director_id
            };
            updatedRows.push(newMerged);
          }
        });
        saveLocalStorageData(db);
        resolve({ data: updatedRows, error: null });
        return;
      }

      if (this.tableName === 'teams') {
        let updatedRows: any[] = [];
        let errorMsg: string | null = null;
        db.teams.forEach((item: any, idx: number) => {
          let matches = true;
          for (const filter of this.filters) {
            if (!filter(item)) {
              matches = false;
              break;
            }
          }
          if (matches) {
            const oldCaptainId = item.captain_id;
            const newCaptainId = this.updateValues.captain_id !== undefined ? this.updateValues.captain_id : oldCaptainId;
            const batchId = item.batch_id || 'batch-50';

            if (newCaptainId && newCaptainId !== oldCaptainId) {
              const alreadyCaptainOfOtherTeam = db.teams.some((t: any) => t.batch_id === batchId && t.captain_id === newCaptainId && t.id !== item.id);
              if (alreadyCaptainOfOtherTeam) {
                errorMsg = '此人在此期數已擔任其他小隊的小隊長！';
                return;
              }
            }

            const newItem = { ...item, ...this.updateValues };
            db.teams[idx] = newItem;
            updatedRows.push(newItem);

            if (newCaptainId !== oldCaptainId) {
              if (oldCaptainId) {
                const oldCapEnrollment = db.user_batches.find((ub: any) => ub.profile_id === oldCaptainId && ub.batch_id === batchId && ub.team_id === item.id);
                if (oldCapEnrollment && oldCapEnrollment.role === 'captain') {
                  oldCapEnrollment.role = 'student';
                }
              }
              if (newCaptainId) {
                let newCapEnrollment = db.user_batches.find((ub: any) => ub.profile_id === newCaptainId && ub.batch_id === batchId);
                if (newCapEnrollment) {
                  newCapEnrollment.role = 'captain';
                  newCapEnrollment.team_id = item.id;
                  newCapEnrollment.captain_id = null;
                } else {
                  db.user_batches.push({
                    id: 'ub-' + Math.random().toString(36).substring(2, 11),
                    profile_id: newCaptainId,
                    batch_id: batchId,
                    team_id: item.id,
                    role: 'captain',
                    score: 0,
                    status: 'active',
                    captain_id: null,
                    division_name: null,
                    director_id: null,
                    created_at: new Date().toISOString()
                  });
                }
                db.user_batches.forEach((ub: any) => {
                  if (ub.batch_id === batchId && ub.team_id === item.id && ub.role === 'student') {
                    ub.captain_id = newCaptainId;
                  }
                });
              } else {
                db.user_batches.forEach((ub: any) => {
                  if (ub.batch_id === batchId && ub.team_id === item.id && ub.role === 'student') {
                    ub.captain_id = null;
                  }
                });
              }
            }
          }
        });

        if (errorMsg) {
          resolve({ data: null, error: { message: errorMsg } });
          return;
        }

        saveLocalStorageData(db);
        resolve({ data: updatedRows, error: null });
        return;
      }

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
      if (this.tableName === 'profiles') {
        const rows = Array.isArray(this.insertValues) ? this.insertValues : [this.insertValues];
        const insertedEnrollments: any[] = [];
        
        rows.forEach(row => {
          let existingProfile = db.profiles.find((p: any) => 
            (row.phone && p.phone === row.phone) || 
            (row.name && p.name === row.name)
          );
          
          let profileId = existingProfile?.id;
          if (!existingProfile) {
            profileId = row.profile_id || row.id || 'usr-' + Math.random().toString(36).substring(2, 11);
            const newProfile = {
              id: profileId,
              name: row.name,
              phone: row.phone || '',
              created_at: row.created_at || new Date().toISOString()
            };
            db.profiles.push(newProfile);
            existingProfile = newProfile;
          }
          
          const enrollmentId = row.id && row.id !== profileId ? row.id : 'ub-' + Math.random().toString(36).substring(2, 11);
          const newEnrollment = {
            id: enrollmentId,
            profile_id: profileId,
            batch_id: row.batch_id || null,
            team_id: row.team_id || null,
            role: row.role || 'student',
            score: row.score !== undefined ? row.score : 0,
            status: row.status || 'active',
            captain_id: row.captain_id || null,
            division_name: row.division_name || null,
            director_id: row.director_id || null,
            created_at: row.created_at || new Date().toISOString()
          };
          
          if (newEnrollment.role === 'captain' && newEnrollment.team_id) {
            const batchId = newEnrollment.batch_id || 'batch-50';
            const duplicateTeam = db.teams.find((t: any) => t.batch_id === batchId && t.captain_id === newEnrollment.profile_id && t.id !== newEnrollment.team_id);
            if (duplicateTeam) {
              resolve({ data: null, error: { message: '此人在此期數已擔任其他小隊的小隊長！' } });
              return;
            }
            const t = db.teams.find((team: any) => team.id === newEnrollment.team_id);
            if (t) {
              t.captain_id = newEnrollment.profile_id;
            }
          } else if (newEnrollment.role === 'student' && newEnrollment.team_id) {
            const t = db.teams.find((team: any) => team.id === newEnrollment.team_id);
            newEnrollment.captain_id = t ? t.captain_id : null;
          }

          if (!db.user_batches) {
            db.user_batches = [];
          }
          db.user_batches.push(newEnrollment);
          
          insertedEnrollments.push({
            ...existingProfile,
            id: enrollmentId,
            profile_id: profileId,
            batch_id: newEnrollment.batch_id,
            team_id: newEnrollment.team_id,
            role: newEnrollment.role,
            score: newEnrollment.score,
            status: newEnrollment.status,
            captain_id: newEnrollment.captain_id,
            division_name: newEnrollment.division_name,
            director_id: newEnrollment.director_id
          });
        });
        
        saveLocalStorageData(db);
        resolve({ data: insertedEnrollments, error: null });
        return;
      }

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

// Helper to calculate evolution line based on days since batch start
const calculateEvolutionLine = (studentId: string, upetCreatedAt: string | null, db: typeof SEED_DATA): string => {
  const enrollment = db.user_batches.find(ub => ub.id === studentId);
  const batchId = enrollment?.batch_id || 'batch-50';
  const batch = db.batches?.find(b => b.id === batchId);
  
  const batchStartStr = batch?.start_date || upetCreatedAt || enrollment?.created_at || new Date().toISOString();
  
  const startOfDay = (dStr: string) => {
    const d = new Date(dStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  
  const now = new Date();
  const diffMs = startOfDay(now.toISOString()) - startOfDay(batchStartStr);
  const days = Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1);
  
  if (days <= 3) return 'dragon';
  if (days <= 5) return 'lion';
  if (days <= 7) return 'fox';
  return 'spirit';
};

export function getRequiredStageByLevel(level: number): number {
  if (level >= 25) return 6;
  if (level >= 20) return 5;
  if (level >= 15) return 4;
  if (level >= 10) return 3;
  if (level >= 5) return 2;
  return 1;
}

// Local helper to adjust score and update team/logs
const adjustScoreLocal = (studentId: string, amount: number, reason: string, createdBy: string | null, submissionId: string | null = null, db: typeof SEED_DATA) => {
  // Update User Batch Enrollment Score
  const enrollment = db.user_batches.find(ub => ub.id === studentId);
  if (enrollment) {
    enrollment.score = Math.max(0, enrollment.score + amount);
    
    // Update Team score
    if (enrollment.team_id) {
      const team = db.teams.find(t => t.id === enrollment.team_id);
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
      if (ach.condition_type === 'total_score' && enrollment.score >= ach.condition_value) {
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

    // Update UserPet total_exp, level and eligibility
    if ((db as any).user_pets) {
      let upet = (db as any).user_pets.find((up: any) => up.student_id === studentId);
      const total_exp = enrollment.score || 0;
      const level = Math.floor(total_exp / 700);
      const reachedLv5 = level >= 5;
      const nowStr = new Date().toISOString();
      
      if (!upet) {
        upet = {
          id: 'upet-' + studentId,
          student_id: studentId,
          pet_line: null,
          current_stage_index: 1,
          total_exp: total_exp,
          level: level,
          first_reached_lv5_at: null,
          evolution_eligible_at: null,
          evolved_at: null,
          has_pending_evolution: false,
          created_at: nowStr,
          updated_at: nowStr
        };
        
        if (reachedLv5) {
          upet.has_pending_evolution = true;
          upet.first_reached_lv5_at = nowStr;
          upet.evolution_eligible_at = nowStr;
        }
        
        (db as any).user_pets.push(upet);
      } else {
        upet.total_exp = total_exp;
        upet.level = level;
        
        const shouldTriggerEvolution = reachedLv5 && upet.current_stage_index === 1 && !upet.has_pending_evolution && upet.pet_line === null;
        if (shouldTriggerEvolution) {
          upet.has_pending_evolution = true;
          upet.first_reached_lv5_at = nowStr;
          upet.evolution_eligible_at = nowStr;
        }
        
        // Sync stage index based on level (only if already evolved past stage 1)
        if (upet.pet_line !== null && upet.current_stage_index > 1) {
          const requiredStage = getRequiredStageByLevel(level);
          if (requiredStage > upet.current_stage_index && !upet.has_pending_evolution) {
            upet.has_pending_evolution = true;
            upet.evolution_eligible_at = nowStr;
          }
        }
        
        upet.updated_at = nowStr;
      }
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
    
    // Check if profile already exists by name or phone
    let p = db.profiles.find((prof: any) => 
      prof.name.toLowerCase() === name.toLowerCase() || 
      (phone && prof.phone === phone)
    );
    
    if (p) {
      // Check if they are already enrolled in this batch
      const alreadyEnrolled = db.user_batches.some((ub: any) => ub.profile_id === p.id && ub.batch_id === batch_id);
      if (alreadyEnrolled) {
        return { data: null, error: { message: '此學員在此期數中已存在' } };
      }
    } else {
      // Create new profile
      p = {
        id: 'usr-' + Math.random().toString(36).substring(2, 11),
        name,
        phone,
        created_at: new Date().toISOString()
      };
      db.profiles.push(p);
    }
    
    // Create new enrollment
    const enrollment = {
      id: 'ub-' + Math.random().toString(36).substring(2, 11),
      profile_id: p.id,
      batch_id,
      team_id,
      role,
      score: 0,
      status: 'active',
      captain_id,
      division_name: null,
      director_id: null,
      created_at: new Date().toISOString()
    };
    db.user_batches.push(enrollment);
    
    saveLocalStorageData(db);
    
    const profile = {
      ...p,
      id: enrollment.id,
      profile_id: p.id,
      batch_id: enrollment.batch_id,
      team_id: enrollment.team_id,
      role: enrollment.role,
      score: enrollment.score,
      status: enrollment.status,
      captain_id: enrollment.captain_id,
      division_name: enrollment.division_name,
      director_id: enrollment.director_id
    };
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('nlp_session', JSON.stringify(profile));
    }
    
    const session = { user: { id: profile.id, email, user_metadata: { name, role } } };
    return { data: session, error: null };
  },

  async signInWithPassword({ email, password }: any) {
    const db = getLocalStorageData();
    const loginName = email.split('@')[0];
    
    // Find profile
    const p = db.profiles.find((prof: any) => 
      prof.phone === loginName || 
      prof.name.toLowerCase() === loginName.toLowerCase() || 
      prof.id === loginName
    );
    
    if (!p) {
      return { data: null, error: { message: '找不到此帳號，請確認電話號碼或名稱是否正確。' } };
    }
    
    // Find enrollments
    const enrollments = db.user_batches.filter((ub: any) => ub.profile_id === p.id);
    if (enrollments.length === 0) {
      return { data: null, error: { message: '此帳號尚未加入任何期數。' } };
    }
    
    // Find active enrollment, else take first
    let activeEnrollment = enrollments.find((ub: any) => ub.status === 'active');
    if (!activeEnrollment) {
      activeEnrollment = enrollments[0];
    }
    
    const profile = {
      ...p,
      id: activeEnrollment.id,
      profile_id: p.id,
      batch_id: activeEnrollment.batch_id,
      team_id: activeEnrollment.team_id,
      role: activeEnrollment.role,
      score: activeEnrollment.score,
      status: activeEnrollment.status,
      captain_id: activeEnrollment.captain_id,
      division_name: activeEnrollment.division_name,
      director_id: activeEnrollment.director_id
    };

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
    const db = getLocalStorageData();
    const enrollment = db.user_batches?.find(ub => ub.id === profile.id);
    let latestProfile = profile;
    if (enrollment) {
      const p = db.profiles.find(prof => prof.id === enrollment.profile_id);
      if (p) {
        latestProfile = {
          ...p,
          id: enrollment.id,
          profile_id: p.id,
          batch_id: enrollment.batch_id,
          team_id: enrollment.team_id,
          role: enrollment.role,
          score: enrollment.score,
          status: enrollment.status,
          captain_id: enrollment.captain_id,
          division_name: enrollment.division_name,
          director_id: enrollment.director_id
        };
      }
    }
    
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
    return { data: { subscription: { unsubscribe() {} } } };
  }
};

// ==========================
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

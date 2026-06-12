export type UserRole = 'admin' | 'captain' | 'student';

export interface Profile {
  id: string;
  name: string;
  role: UserRole;
  team_id: string | null;
  batch_id?: string | null;
  score: number;
  active_pet_id?: string | null;
  phone?: string;
  captain_id?: string | null;
  division_name?: string | null;
  director_id?: string | null;
  created_at: string;
  profile_id?: string;
  status?: 'active' | 'ended' | 'inactive';
  squad_role?: string | null;
}


export interface Team {
  id: string;
  name: string;
  custom_name?: string | null;
  captain_id: string | null;
  total_score: number;
  batch_id?: string | null;
  invite_code?: string;
  invite_enabled?: boolean;
  max_members?: number;
  created_at: string;
}

export type TaskType = 'daily' | 'weekly' | 'temporary' | 'limited';
export type TaskTargetType = 'all' | 'team' | 'individual';

export interface Task {
  id: string;
  name: string;
  description: string;
  type: TaskType;
  score: number;
  requires_approval: boolean;
  requires_proof: boolean;
  publish_time: string;
  start_time: string;
  end_time: string;
  target_type: TaskTargetType;
  target_team_id: string | null;
  target_user_id: string | null;
  batch_id?: string | null;
  category?: string;
  created_by: string | null;
  created_at: string;
  max_completions?: number;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Submission {
  id: string;
  mission_id: string;
  student_id: string;
  proof_text: string | null;
  proof_image_url: string | null;
  proof_link: string | null;
  status: SubmissionStatus;
  score_awarded: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  share_to_witness?: boolean;
  created_at: string;
  // Joined fields
  mission?: Mission;
  profile?: Profile;
}

export interface ScoreLog {
  id: string;
  student_id: string;
  amount: number;
  reason: string;
  submission_id: string | null;
  created_by: string | null;
  created_at: string;
  // Joined fields
  profile?: Profile;
}

export interface Course {
  id: string;
  name: string;
  description: string | null;
  class_date: string;
  batch_id?: string | null;
  register_url?: string | null;
  created_at: string;
}

export interface CourseAttendance {
  id: string;
  course_id: string;
  student_id: string;
  status: 'registered' | 'attended';
  attended_at: string | null;
  created_at: string;
  // Joined fields
  course?: Course;
  profile?: Profile;
}

export interface Achievement {
  id: string;
  title: string;
  description: string | null;
  icon_url: string | null;
  condition_type: 'total_score';
  condition_value: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  student_id: string;
  achievement_id: string;
  unlocked_at: string;
  // Joined fields
  achievement?: Achievement;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_by: string | null;
  batch_id?: string | null;
  created_at: string;
}

export interface StudentNote {
  id: string;
  student_id: string;
  captain_id: string;
  note: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  student?: Profile;
}

// Gamification Models
export interface Pet {
  id: string;
  name: string;
  description: string;
  image_url: string;
  evolution_image_url: string;
  unlock_score_threshold: number;
  created_at: string;
}

export interface UserPet {
  id: string;
  student_id: string;
  pet_id?: string;
  pet_level?: number;
  current_skin?: string;
  unlocked_at?: string;
  // New evolutionary fields
  pet_line: string | null;
  current_stage_index: number;
  total_exp: number;
  level: number;
  first_reached_lv5_at: string | null;
  evolution_eligible_at: string | null;
  evolved_at: string | null;
  has_pending_evolution: boolean;
  selected_evolution_line?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  pet?: Pet;
  profile?: Profile;
  stage?: PetStage | null;
}

export interface PetLine {
  id: string;
  line_key: string;
  name: string;
  description: string;
  core_traits: string;
  is_active: boolean;
  image_url?: string;
  unlock_level?: number;
  task_template_id?: string | null;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export interface PetStage {
  id: string;
  line_key: string | null;
  stage_index: number;
  stage_name: string;
  min_level: number;
  max_level: number;
  image_url: string;
  animation_type: string;
  glow_color: string;
  description: string;
  evolution_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PetEvolutionLog {
  id: string;
  student_id: string;
  from_stage_index: number;
  to_stage_index: number;
  from_stage_name: string;
  to_stage_name: string;
  pet_line: string;
  level: number;
  total_exp: number;
  days_to_reach_level: number;
  created_at: string;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  element_type: 'water' | 'fire' | 'wind' | 'earth';
  rarity: 'N' | 'R' | 'SR' | 'SSR';
  image_url: string;
  created_at: string;
}

export interface Deck {
  id: string;
  name: string;
  created_by: string | null;
  is_template: boolean;
  created_at: string;
}

export interface DeckCard {
  id: string;
  deck_id: string;
  card_id: string;
  count: number;
  // Joined fields
  card?: Card;
}

export interface UserDeck {
  id: string;
  student_id: string;
  deck_id: string;
  is_active: boolean;
  created_at: string;
  // Joined fields
  deck?: Deck;
  profile?: Profile;
}

// ==========================================
// BATCH MISSION SYSTEM TYPES
// ==========================================

export interface Batch {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'ended'; // 草稿 / 進行中 / 已結束
  rankings_visible?: boolean;
  created_at: string;
  updated_at: string;
}

export interface MissionTemplate {
  id: string;
  title: string;
  description: string;
  mission_type: 'daily' | 'weekly' | 'special' | 'limited';
  points: number;
  review_type: 'auto' | 'leader' | 'admin';
  is_active: boolean;
  category?: string;
  created_at: string;
  updated_at: string;
  max_completions?: number;
}

export interface BatchMissionTemplate {
  id: string;
  batch_id: string;
  template_id: string;
  week_offset: number | null;
  day_offset: number | null; // limited 任務使用，代表梯次第幾天發布
  duration_days: number | null; // limited 任務使用，維持幾天
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  batch?: Batch;
  template?: MissionTemplate;
}

export interface Mission {
  id: string;
  batch_id: string;
  template_id: string;
  title: string;
  description: string;
  mission_type: 'daily' | 'weekly' | 'special' | 'limited';
  points: number;
  publish_at: string;
  deadline_at: string;
  status: 'draft' | 'active' | 'scheduled' | 'published' | 'ended';
  review_type: 'auto' | 'leader' | 'admin';
  category?: string;
  created_at: string;
  updated_at: string;
  max_completions?: number;
  // Joined fields
  batch?: Batch;
  template?: MissionTemplate;
}

export interface CaptainCandidate {
  id: string;
  profile_id: string;
  status: 'eligible' | 'paused' | 'disabled';
  created_at: string;
  // Joined fields
  name?: string;
  phone?: string;
  past_cohorts?: string[];
  past_roles?: string[];
}


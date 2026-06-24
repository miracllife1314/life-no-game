import { createClient } from '@supabase/supabase-js';
import { 
  Profile, Team, Task, Submission, ScoreLog, 
  Course, CourseAttendance, Achievement, UserAchievement, 
  Announcement, StudentNote,
  Pet, UserPet, PetLine, PetStage, PetEvolutionLog, Card, Deck, DeckCard, UserDeck,
  Batch, MissionTemplate, BatchMissionTemplate, Mission, CaptainCandidate
} from '@/types';

// 連線優先序：只要有設 _LOCAL（測試庫）就用它，否則用正式庫變數。
// → 本機 dev 與 Vercel「Preview」都設 _LOCAL，會連測試庫；
// → 正式「Production」不設 _LOCAL，自動 fallback 到正式庫。
// ⚠️ 切勿在 Production 環境設定 _LOCAL 變數，否則正式站會連到測試庫！
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isRealSupabase = !!(supabaseUrl && supabaseUrl !== 'your-supabase-url' && supabaseKey);

console.log(`📡 [Supabase Client Init] Environment: ${process.env.NODE_ENV || 'unknown'}, Target URL: ${supabaseUrl}`);

// Base real supabase client
export const realSupabase = isRealSupabase ? createClient(supabaseUrl, supabaseKey, {
  auth: {
    // 階段0：改用後端核發的真實 session → 需保存並自動續期，
    // 這樣登入後的查詢才會帶上 JWT（auth.uid() 才有值，未來 RLS 才判得了）。
    autoRefreshToken: true,
    persistSession: true,
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

  // 上傳到 Storage（失敗會重試一次）。
  // ⚠️ 一律不退回 base64：以前失敗會把整張圖（base64）塞進 DB，造成資料表暴肥、登入變慢。
  //    改為兩次都失敗就回 null（此筆沒圖、文字證明仍保留），DB 永遠不會再被圖片撐肥。
  const tryUpload = async (): Promise<string> => {
    const res = await fetch(input as string);
    const blob = await res.blob();
    const ext = (blob.type.split('/')[1] || 'webp').replace('+xml', '');
    const path = `proof-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const { error } = await realSupabase!.storage
      .from('proof-images')
      .upload(path, blob, { contentType: blob.type || 'image/webp', upsert: true });
    if (error) throw error;
    return realSupabase!.storage.from('proof-images').getPublicUrl(path).data.publicUrl;
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await tryUpload();
    } catch (e) {
      console.error(`[uploadProofImage] 上傳失敗（第 ${attempt} 次）：`, e);
    }
  }
  console.error('[uploadProofImage] 多次上傳失敗，放棄存圖（不退回 base64，避免撐肥 DB）');
  return null;
}

export function getRequiredStageByLevel(level: number): number {
  if (level >= 25) return 6;
  if (level >= 20) return 5;
  if (level >= 15) return 4;
  if (level >= 10) return 3;
  if (level >= 5) return 2;
  return 1;
}

// ==========================================
// EXPORT UNIFIED SUPABASE CLIENT
// 直接使用真實 Supabase client（離線 demo/mock 已移除——測試庫與正式庫皆有真連線）。
// 若未設環境變數（isRealSupabase=false），supabase 會是 null，啟動時即明確報錯而非跑假資料。
// ==========================================
export const supabase = realSupabase as any;

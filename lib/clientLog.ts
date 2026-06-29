// =====================================================================
// 簡易監控:把前端「失敗/變慢」事件 fire-and-forget 寫進 client_logs。
//   —— 目的:像「上傳失敗 / 載入很慢」這種,系統主動記下,大隊長後台看得到,
//      不用等學員回報。對應 docs/schema_fixes_24_client_logs.sql。
//
// 設計原則:
//   - 永不擋使用者:任何錯誤都吞掉(監控失敗不能影響打卡/登入)。
//   - 無敏感資料:只記事件類型、原因、姓名、時間。
//   - 若 client_logs 表還沒建(SQL 未跑),insert 會失敗 → 一樣靜默,不報錯。
// =====================================================================
import { isRealSupabase, realSupabase } from '@/lib/supabase';

export type ClientLogType = 'upload_fail' | 'submit_fail' | 'slow_load';

export function logEvent(type: ClientLogType, detail?: string, userName?: string): void {
  try {
    if (!isRealSupabase || !realSupabase) return;
    // 不 await:背景送出,不阻塞 UI;失敗也不拋。
    realSupabase
      .from('client_logs')
      .insert({
        type,
        detail: detail ? String(detail).slice(0, 300) : null,
        user_name: userName ? String(userName).slice(0, 60) : null,
      })
      .then(() => {}, () => {});   // 吞掉任何錯誤(含表不存在)
  } catch {
    /* 監控絕不影響主流程 */
  }
}

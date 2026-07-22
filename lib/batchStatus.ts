// =====================================================================
// 「這一期結束了沒」的唯一判斷來源。
//
// ⚠️ 為什麼要集中:期數有兩個資訊會打架 —— 資料庫的 status 欄位、以及 end_date。
//    以前各畫面各自判斷,結果同一期在後台列表顯示「已結束」、下拉選單卻還是「進行中」。
//    一律改呼叫這裡,全站才會一致;以後新畫面也不必再各自寫一套。
//
// 規則(優先序):
//   1. 後台手動設 'ended'  → 結束(可提早收期)
//   2. 'draft'            → 草稿(尚未開始,不算結束)
//   3. 其餘看日期          → 過了 end_date 當天 23:59:59 才算結束
//      (用 parseTaipeiEnd:只有日期的 end_date 視為當天深夜,結束日「當天」仍算進行中)
// =====================================================================
import { parseTaipeiEnd } from '@/lib/time';

export type EffectiveBatchStatus = 'draft' | 'active' | 'ended';

type BatchLike = {
  status?: 'draft' | 'active' | 'ended' | string | null;
  end_date?: string | null;
} | null | undefined;

export function isBatchEnded(batch: BatchLike): boolean {
  if (!batch) return false;
  if (batch.status === 'ended') return true;
  if (batch.status === 'draft') return false;
  if (!batch.end_date) return false;
  return parseTaipeiEnd(batch.end_date).getTime() < Date.now();
}

// 給畫面用:實際該顯示的狀態(草稿 / 進行中 / 已結束)
export function getEffectiveBatchStatus(batch: BatchLike): EffectiveBatchStatus {
  if (!batch) return 'active';
  if (batch.status === 'draft') return 'draft';
  return isBatchEnded(batch) ? 'ended' : 'active';
}

export function batchStatusLabel(status: EffectiveBatchStatus): string {
  return status === 'active' ? '進行中' : status === 'draft' ? '草稿' : '已結束';
}

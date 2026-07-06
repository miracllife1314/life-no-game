// =====================================================================
// 品牌設定(白牌化):同一份程式碼服務多個品牌,靠環境變數切換。
//
//   NEXT_PUBLIC_BRAND 未設定(或其他值) → NLP(預設,確保既有 NLP 正式站不受影響)
//   NEXT_PUBLIC_BRAND=ascension        → 揚升體系
//
// 部署方式:兩個 Vercel 專案指向同一個 repo,各設自己的 BRAND 與 Supabase 變數。
//
// ⚠️ 這裡只放「顯示文字」。內部代號(localStorage 的 nlp_* key、@nlp.local
//    登入信箱網域)絕對不可跟著品牌走,否則切品牌會把所有使用者登出/無法登入。
// ⚠️ NLP 這組字串必須與改版前完全一致(逐字),別「順手潤飾」,以免正式站文案默默改變。
// =====================================================================

export type BrandKey = 'nlp' | 'ascension';

interface BrandConfig {
  key: BrandKey;
  /** 系統全名:分頁標題、頁尾版權 */
  systemName: string;
  /** SEO / OpenGraph 描述 */
  systemDesc: string;
  /** 登入頁大標,也是進化契約文案的品牌前綴 */
  brandLine: string;
  /** 短品牌名(組字串用,如「◯◯台中50期」) */
  shortName: string;
  /** 新班次自動命名前綴(如「◯◯初階50期第一隊」) */
  batchPrefix: string;
  /** 神獸卡底部英文小標 */
  engBadge: string;
  // --- 神獸系統文案(整句,因中英文空格規則不同,不用組字串) ---
  petEvolveSuccessBadge: string;
  petTraitLabel: string;
  petContractLine: string;
  petEnergyLine: string;
  petLevelUpLine: string;
  petCompanionLine: string;      // 「陪伴你的◯◯修行」
  petCompanionLineFormal: string; // 「陪伴您的◯◯修行」
  petNextStageLine: string;
  petEvolveHint: string;
  petHatchLabel: string;
  // --- 後台/隊長 ---
  chainTitle: string;            // 接龍訊息標題(不含【】)
  retrainTitle: string;          // 攻略「報名複訓」任務名
  courseBasicName: string;       // 課程模板:基礎課名稱
  courseBasicDesc: string;
  petTaskExamplePlaceholder: string;
  petLineDescPlaceholder: string;
}

const NLP: BrandConfig = {
  key: 'nlp',
  systemName: 'NLP 人性溝通術評分系統',
  systemDesc: 'NLP人性溝通術評分系統 - 每日修行打卡、挑戰任務與經驗排行榜',
  brandLine: 'NLP 人性溝通術',
  shortName: 'NLP',
  batchPrefix: 'NLP初階',
  engBadge: 'NLP CULTIVATION',
  petEvolveSuccessBadge: 'NLP 守護神獸進化成功',
  petTraitLabel: 'NLP 特質屬性',
  petContractLine: '「NLP 人性溝通術・神獸守護進化契約已突破」',
  petEnergyLine: '「NLP 修行能量正在突破極限...」',
  petLevelUpLine: '恭喜，您的 NLP 守護神獸獲得了新的力量！',
  petCompanionLine: '解鎖專屬的守護神獸，陪伴你的 NLP 修行。',
  petCompanionLineFormal: '解鎖專屬的守護神獸，陪伴您的 NLP 修行。',
  petNextStageLine: '強大的神獸伴隨你繼續突破 NLP 修行。',
  petEvolveHint: '你的神獸感應到你強大的 NLP 修行經驗，即將突破極限，進化至更高形態！',
  petHatchLabel: '孵化狀態與NLP經驗屬性',
  chainTitle: 'NLP 定課與修行任務接龍',
  retrainTitle: '報名 NLP 複訓',
  courseBasicName: '📖 基礎人性溝通術',
  courseBasicDesc: '學習基礎人性溝通概念，奠定良好的修行基礎。',
  petTaskExamplePlaceholder: '例如：發表一次 NLP 主題感召分享',
  petLineDescPlaceholder: '輸入對應神獸進化方向的成長背景與NLP溝通術流派介紹...',
};

const ASCENSION: BrandConfig = {
  key: 'ascension',
  systemName: '揚升體系',
  systemDesc: '揚升體系 - 每日修行打卡、挑戰任務與經驗排行榜',
  brandLine: '揚升體系',
  shortName: '揚升',
  batchPrefix: '揚升初階',
  engBadge: 'ASCENSION CULTIVATION',
  petEvolveSuccessBadge: '揚升守護神獸進化成功',
  petTraitLabel: '揚升特質屬性',
  petContractLine: '「揚升體系・神獸守護進化契約已突破」',
  petEnergyLine: '「揚升修行能量正在突破極限...」',
  petLevelUpLine: '恭喜，您的揚升守護神獸獲得了新的力量！',
  petCompanionLine: '解鎖專屬的守護神獸，陪伴你的揚升修行。',
  petCompanionLineFormal: '解鎖專屬的守護神獸，陪伴您的揚升修行。',
  petNextStageLine: '強大的神獸伴隨你繼續突破揚升修行。',
  petEvolveHint: '你的神獸感應到你強大的揚升修行經驗，即將突破極限，進化至更高形態！',
  petHatchLabel: '孵化狀態與揚升經驗屬性',
  chainTitle: '揚升定課與修行任務接龍',
  retrainTitle: '報名揚升複訓',
  courseBasicName: '📖 基礎傳愛連結力',
  courseBasicDesc: '學習基礎傳愛連結概念，奠定良好的修行基礎。',
  petTaskExamplePlaceholder: '例如：發表一次揚升主題感召分享',
  petLineDescPlaceholder: '輸入對應神獸進化方向的成長背景與傳愛連結力流派介紹...',
};

export const BRAND: BrandConfig =
  process.env.NEXT_PUBLIC_BRAND === 'ascension' ? ASCENSION : NLP;

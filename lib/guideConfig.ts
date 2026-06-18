import { TabKey } from '@/components/Layout/Navigation';

export interface GuideItem {
  id: string;
  title: string;
  scoreLabel: string;
  description: string;
  recommendation: string; // 給學員的修煉建議
  actionText: string;
  actionTab?: TabKey;
}

// 🟢 初階日常攻略配置
export const BEGINNER_GUIDES: GuideItem[] = [
  {
    id: 'b-daily-gratitude',
    title: '每日五感恩',
    scoreLabel: '每日穩拿 100 EXP',
    description: '在小群分享今日最值得感恩的 5 件人事物。',
    recommendation: '💡 【習慣養成起手式】：這是最核心的每日定課。建議每天清晨或睡前固定花 5 分鐘打卡，連續 7 天不中斷將是穩定破殼的關鍵基石！',
    actionText: '🎯 去做定課',
    actionTab: 'daily'
  },
  {
    id: 'b-deal-product',
    title: '締結產品 (3,000元以上)',
    scoreLabel: '每日最高 +300 EXP',
    description: '當日成功銷售或締結 3000 元以上之產品/服務並上傳證明。',
    recommendation: '💡 【日常實戰加分神技】：在工作或生活中實際運用 NLP 溝通術引導成交，上傳合約或對話截圖即可獲得超高分，極速縮短修行天數！',
    actionText: '🔥 上傳成交證明',
    actionTab: 'daily'
  },
  {
    id: 'b-weekly-themes',
    title: '每週主題實作任務',
    scoreLabel: '每週穩拿 500 EXP (折抵 1.5 天)',
    description: '第一週好奇與讚美、第二週建立親和與探索、第三週引導對話、第四週成交與締結。',
    recommendation: '💡 【階段突破關鍵】：每週主題任務是吸收 NLP 心法的核心，完成一項就直接折抵 1.5 天！跟著課程進度將方法運用在身邊人身上並寫下感受即可。',
    actionText: '⚡ 挑戰每週任務',
    actionTab: 'daily'
  },
  {
    id: 'b-weekly-share',
    title: '每週演練心得與小組通話',
    scoreLabel: '每週最多 +1000 EXP (折抵 2.8 天)',
    description: '將演練心得分享至大群並標記社群，或參與每週小組通話分享收穫。',
    recommendation: '💡 【共學共創加成】：透過小組通話與隊友交流，並把心得發到大群或 IG 自媒體標記 @定洋。邊建立個人品牌邊狂拿高分！',
    actionText: '✍️ 去寫見證分享',
    actionTab: 'witness'
  },
  {
    id: 'b-invite-course',
    title: '邀約 NLP 入門體驗課',
    scoreLabel: '每邀一人 +500 EXP (無限累計)',
    description: '成功邀約新朋友參與 NLP 入門體驗課，上傳對話截圖證明。',
    recommendation: '💡 【修行一鍵加速】：分享 NLP 的價值給身邊需要的人，每成功邀約一人就能折抵 1.5 天，此任務可重複挑戰（上限 99 次）！',
    actionText: '👥 查看課程資訊',
    actionTab: 'course'
  },
  {
    id: 'b-deal-class',
    title: '推薦成交 NLP 初階/能量學',
    scoreLabel: '每次成交 +1500 EXP (直接折抵 4.2 天！)',
    description: '成功推薦並成交 NLP 初階或能量學課程，上傳繳費確認單或憑證。',
    recommendation: '💡 【終極破殼神仙功】：推薦朋友報名初階或能量學課程，幫助他人改變生命軌跡的同時，獲得 1,500 EXP 的爆發性經驗值，直接飛越修行天數！',
    actionText: '🎓 推薦報名課程',
    actionTab: 'course'
  },
  {
    id: 'b-pet-egg',
    title: '混沌之卵神獸進化',
    scoreLabel: '升級解鎖被動加成',
    description: '經驗值每達 700 分即可升級，5 級後將解鎖神獸進化。',
    recommendation: '💡 【神獸養成指南】：越早升級神獸，越能獲得專屬的被動分數加成。達到 5 級時記得前去選擇你的元素流派（水、火、風、地）進行進化！',
    actionText: '🥚 查看我的神獸',
    actionTab: 'achievements'
  }
];

// 🔥 進階修煉心法配置
export const ADVANCED_GUIDES: GuideItem[] = [
  {
    id: 'a-daily-double',
    title: '雙定課：五感恩 + 肯定伴侶/父母',
    scoreLabel: '每日穩拿 100 EXP',
    description: '每日進行五感恩打卡，並每天肯定伴侶（單身者對父母）打卡。',
    recommendation: '💡 【深度潛意識植入】：從感謝外在到聚焦於身邊最親近的人，這是建立深層和諧關係的修煉，每天雙打卡穩紮穩打建立大師氣場。',
    actionText: '🎯 去做定課',
    actionTab: 'daily'
  },
  {
    id: 'a-weekly-video',
    title: '前提假設自媒體影片分享',
    scoreLabel: '每週 +500 EXP (折抵 1.5 天)',
    description: '每週覺察一件事對應 NLP 前提假設，拍影片分享上傳自媒體並標記 @定洋 IG。',
    recommendation: '💡 【大師級影響力】：將 NLP 內化並透過影片形式輸出分享。不僅能拿到 500 EXP，更是將學習轉化為公眾宣傳、建立個人影響力的最高階實踐！',
    actionText: '🔥 上傳影片心得',
    actionTab: 'daily'
  },
  {
    id: 'a-weekly-practice',
    title: '心錨練習與卓越圈練習',
    scoreLabel: '每週最高 +1000 EXP (折抵 2.8 天)',
    description: '按時完成進階的心錨練習、卓越圈練習等深度潛意識調整技術。',
    recommendation: '💡 【狀態調控天花板】：掌握隨時進入巅峰狀態的「卓越圈」與「心錨觸發」。按步驟演練並提交隊長審核即可獲得大筆經驗！',
    actionText: '⚡ 挑戰進階任務',
    actionTab: 'daily'
  },
  {
    id: 'a-case-study',
    title: '完成次感元個案 3 次',
    scoreLabel: '每次完成 +1000 EXP (直接折抵 2.8 天！)',
    description: '進行次感元技術個案實踐 3 次，並上傳實作心得。',
    recommendation: '💡 【實戰諮商利器】：實際為他人進行次感元調整，幫助其轉變情緒與認知編碼。每做完一次就等於減去 2.8 天修煉時間，是進階組的主力提速任務！',
    actionText: '✍️ 提交個案報告',
    actionTab: 'daily'
  },
  {
    id: 'a-deck-resonance',
    title: '牌組構築與元素屬性共鳴',
    scoreLabel: '每次打卡額外獲得 10%~20% 被動加成',
    description: '透過經驗值解鎖神兵卡牌，在牌組頁面配置同元素卡牌。',
    recommendation: '💡 【策略加分密技】：達到 5 級進化後即可解鎖卡牌。如果您的神獸是火系，牌組中多放火系卡牌會觸發「同屬性共鳴」，讓您每天打卡的分數被動放大 1.5 倍以上！',
    actionText: '🃏 構築我的牌組',
    actionTab: 'achievements'
  }
];

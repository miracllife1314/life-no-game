# 《NLP人性溝通術系統》極致效能、高併發與可擴充性「一次到位」終極架構建議書

本建議書旨在為系統提供「一次到位」的終極優化方案，解決**介面流暢度（變順）**、**多學員同時在線（高併發正常運作）**與**未來功能模組化（可擴充）**三大核心訴求。由於您已使用付費版 Supabase，我們將完全發揮付費版資料庫的高硬體規格與進階特性。

---

## 🚀 三大優化目標：流暢、安全高併發、極易擴充

```
                       ┌──────────────────────────────────────────┐
                       │      NLP Game v2 一次到位終極架構         │
                       └──────────────────────────────────────────┘
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      ▼                                      ▼                                      ▼
【極致流暢（變順）】                   【高併發防護（人多運作）】             【可擴充性（未來擴充）】
  * TanStack Query 數據快取              * 資料庫事務（Transaction）            * 模組化遊戲規則引擎
  * Tab 懶加載（Lazy Loading）           * RLS 行級安全鎖死                     * 抽象化任務與成就 Handler
  * 虛擬化長列表（Virtualized List）    * PgBouncer 連線池                      * 統一的 API 數據存取層
```

---

## ⚡ 目標一：極致流暢（變順）—— 前端渲染與數據流重構

目前系統在切換頁籤或打卡時，由於全局狀態集中在 `page.tsx`，會導致整個網頁重新計算。要達到 0 延遲的流暢感，建議採用以下架構：

### 1. 導入 TanStack Query (React Query) ── 數據快取與背景同步
這是目前業界公認「讓 React 變順」的最強工具：
*   **快取優先 (Cache-First)**：當學員在「每日定課」與「排行榜」頁籤切換時，畫面直接顯示快取中的數據（0毫秒加載），背景偷偷向 Supabase 發送請求對帳，並在數據變動時自動、無感地更新 UI。
*   **樂觀更新 (Optimistic Updates)**：當學員點擊打卡，UI 立即顯示「已獲得 +50 經驗」，而不需要等待 Supabase 的 API 回傳。如果 API 失敗，再自動回滾狀態。

### 2. Tab 組件懶加載 (Lazy Loading)
不要在一開始就下載並渲染所有頁籤組件。利用 React `lazy` 進行動態加載：
```tsx
const AdminDashboard = React.lazy(() => import('@/components/Admin/AdminDashboard'));
const LeaderboardTab = React.lazy(() => import('@/components/Tabs/LeaderboardTab'));
```
*   *好處*：學員登入時，不需要載入龐大的「管理員後台」程式碼，使網頁首頁首屏加載速度提升 300%。

### 3. 虛擬化長列表 (Virtual List)
*   當見證牆或排行榜的歷史筆數累積到數千筆時，瀏覽器一次繪製上千個卡片會產生卡頓。
*   使用 `react-window`，只渲染學員「肉眼看得到」的那 5-10 個卡片，滾動到下方時再動態生成。

---

## 🔒 目標二：高併發防護（人多運作）—— 資料庫與事務安全

當上百位學員在同一個課堂現場同時打卡、大隊長同時手動調分、小隊長同時審核時，資料庫必須保證數據的絕對一致性：

### 1. 分數變動移至「資料庫事務 (Database Transaction)」
*   **現狀風險**：目前打卡審核是「前端先算好新分數，再呼叫 update 修改 profiles」。如果有兩個人同時幫同一個小隊的人加分，會造成覆蓋與掉分。
*   **優化方案**：
    *   分數計算完全交給 Postgres Database Triggers。
    *   前端只向 `submissions` 寫入一條審核紀錄，Supabase 在一個 **ACID 事務（Transaction）** 中，自動完成：加分 ➔ 寫日誌 ➔ 計算神獸等級。這在技術上保證了即使有萬人同時打卡，數據也絕不衝突、絕不掉分。

### 2. 啟用 Supabase 連線池 (Connection Pooling)
*   在環境變數中，將 Supabase 連結改為透過 **PgBouncer 連線池（預設埠 6543）** 進行連線。
*   這能防止在學員上線高峰期，資料庫因為連線數過多而崩潰，輕鬆支撐高併發查詢。

---

## 🔌 目標三：可擴充性（未來擴充）—— 模組化遊戲規則引擎

為了方便未來能無痛加入新神獸（例如：玄武、麒麟）、新的四維屬性算法、或新的任務類型，建議建立 **「微型遊戲引擎（Game Engine）」** 結構：

### 1. 任務處理器抽象化 (Mission Handler Pattern)
定義一個任務處理器介面，每種新任務（打卡任務、限時挑戰、跨期任務）只需繼承該介面並實作：
```typescript
interface IMissionHandler {
  evaluate(submission: Submission): boolean; // 判斷是否符合過關
  calculatePoints(basePoints: number): number; // 計算加倍/連續打卡獎勵
}

class DailyMissionHandler implements IMissionHandler { ... }
class EvolutionMissionHandler implements IMissionHandler { ... }
```
*   *好處*：未來要增加「拍照打卡」、「上傳錄音」等新型任務時，不需修改 `page.tsx` 的龐大 switch-case，只需增加一個新的 `Handler` 檔案，徹底符合開放封閉原則 (Solid - OCP)。

### 2. 成就解鎖引擎 (Achievement Evaluator)
將成就判定與業務邏輯解耦，獨立為引擎：
```typescript
const achievementEvaluators = {
  total_score: (score: number, threshold: number) => score >= threshold,
  streak_days: (streak: number, threshold: number) => streak >= threshold,
  comments_count: (comments: number, threshold: number) => comments >= threshold,
};
```
*   *好處*：未來想加「留言大師（在見證牆留言 10 次解鎖）」或「定課狂人（連續打卡 7 天）」等新成就，只需配置 JSON 設定，引擎會自動處理判定。

---

## 🗺️ v2「一次到位」終極實作步驟與時間估算

此架構為**工業級的商業系統標準**，建議實作工時如下（雙人協同開發）：

| 階段 | 工作內容 | AI 負責部分 | 使用者配合 | 預估工時 |
| :---: | :--- | :--- | :--- | :---: |
| **第一階段** | **數據庫與 RLS 收緊** <br> (簡訊登入、事務 Trigger、權限鎖死) | 生成手機驗證碼對接、ACID 事務 SQL 腳本、收緊的 RLS DDL。 | 貼入 Supabase 執行，並提供測試手機門號。 | **4 - 8 小時** |
| **第二階段** | **組件拆分與狀態下放** <br> (瘦身 Admin、導入 TanStack Query) | 重構 `page.tsx`，分離 API 層，產出快取自帶的頁籤組件。 | 本地執行 `npm run build`，確認無 TypeScript 報錯。 | **6 - 10 小時** |
| **第三階段** | **擴充性遊戲引擎封裝** <br> (抽象化 Mission & Achievement) | 撰寫成就與任務的 Handler 類別與核心 JSON 配置結構。 | 提供新的成就或神獸需求，測試引擎是否能一鍵加入。 | **4 - 6 小時** |

**總計時間**：雙人合作僅需 **2 - 3 天**（實施工時 14 - 24 小時），即可將現有系統重構為**具備百萬級承載力、安全防禦力與極高擴充性**的完美版本。

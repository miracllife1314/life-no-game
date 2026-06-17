# 《NLP人性溝通術計分系統》系統優化建議書 (v2 終極版)

本建議書針對系統核心痛點，提出**極致安全**、**極致流暢（變順）**、**高可擴充性**，以及**智慧判讀（拒絕暴力讀取）**四個維度的系統重構方案，協助系統在學員規模擴大（百人至千人同時在線）時，依然能穩健、飛速地運行。

---

## 🏗️ 系統優化四大核心支柱 (The Four Pillars)

```
                            ┌──────────────────────────────────────────┐
                            │    NLP Game 系統優化與重構建議書          │
                            └──────────────────────────────────────────┘
                                                 │
      ┌──────────────────────────┬───────────────┴──────────┬──────────────────────────┐
      ▼                          ▼                          ▼                          ▼
【第一柱：安全維護】       【第二柱：介面流暢】       【第三柱：模組擴充】       【第四柱：智慧判讀】
* 資料庫事務控制 (ACID)     * TanStack Query 快取     * 任務與成就規則配置化      * 杜絕全表無篩選查詢
* RLS 行級安全鎖死         * 懶載入與虛擬列表         * 規則處理器 (Handler)     * Postgres Views 視圖
* 輸入過濾與防刷防漏分      * 局部渲染與狀態下放       * 解耦神獸與計分引擎       * 伺服器端關聯與分頁
```

---

## 🔒 第一柱：安全維護 (Security) —— 資料與權限安全鎖死

在多學員、多隊長同時在線的情況下，必須確保資料不被惡意竄改，且避免同時加分時發生「覆蓋掉分」的競爭問題（Race Conditions）。

### 1. 分數與等級計算移至「資料庫事務 (Database Transaction)」
*   **現狀風險**：目前打卡審核是「前端先算好新分數，再呼叫 API 更新 `profiles` 表」。如果有兩個人同時幫同一個小隊的人加分，會造成覆蓋與掉分。
*   **解決方案**：
    *   前端只向 `submissions` 寫入一條審核狀態變更紀錄。
    *   利用 Supabase 的 **PostgreSQL Triggers & Functions**，在資料庫的 **ACID 事務**中自動完成：計算分數 ➔ 寫入 `score_logs` ➔ 更新 `profiles`。這在技術上保證了即使有萬人同時打卡，數據也絕不衝突、絕不掉分。

### 2. 啟用並收緊 RLS (Row Level Security) 行級安全策略
*   **現狀風險**：如果沒有嚴格的 RLS 政策，任何懂技術的用戶都可以透過瀏覽器 F12 console 直接調用 supabase 用戶端更新其他人的分數。
*   **解決方案**：
    *   在 Supabase 所有表（如 `profiles`, `submissions`, `user_pets`）啟用 RLS。
    *   **學員權限**：只能 `select` 同期數同隊的資料，且只能 `insert/update` 自己擁有的資料（由 `auth.uid() = student_id` 判定）。
    *   **小隊長權限**：除個人資料外，可 `update` 自己小隊成員的 `submissions`（進行初審）。
    *   **大隊長權限**：全表擁有 `ALL`（讀寫）權限。

---

## ⚡ 第二柱：介面流暢 (Smoothness) —— 0 延遲的極致操作體驗

目前系統切換分頁或打卡時，由於全局狀態集中在單一頂層組件，導致整個頁面所有元件反覆計算。

### 1. 導入數據快取層 (TanStack Query / React Query)
*   **核心機制**：
    *   **快取優先 (Cache-First)**：當學員在「每日定課」與「排行榜」頁籤切換時，畫面直接顯示快取中的數據（0 毫秒立即呈現，完全不卡頓），背景非同步向 Supabase 發送請求對帳並自動更新 UI。
    *   **樂觀更新 (Optimistic Updates)**：學員點擊打卡後，前端 UI 立即顯示「已獲得 +50 經驗並冒出動畫」，而不需要等待網路傳輸。若後端傳輸失敗，UI 再自動退回，體驗流暢至極。

### 2. Tab 組件懶加載 (Lazy Loading & Suspense)
*   不要在一開始就下載所有分頁的程式碼（例如大隊長管理後台體積龐大，但普通學員根本不需要載入）。
*   **解決方案**：使用 React `lazy` 動態載入，首頁載入體積預估可減少 60% 以上：
    ```tsx
    const AdminDashboard = React.lazy(() => import('@/components/Admin/AdminDashboard'));
    ```

---

## 🔌 第三柱：模組擴充 (Extensibility) —— 規則解耦與配置化

為了方便未來能無痛加入新神獸（例如：玄武、麒麟）、新的四維屬性算法、或新的任務類型，程式碼必須避免硬編碼（Hardcode）。

### 1. 任務處理器抽象化 (Handler Pattern)
*   定義一個任務處理器介面，每種新任務只需繼承該介面並實作：
    ```typescript
    interface IMissionHandler {
      evaluate(submission: Submission): boolean; // 判斷是否符合過關
      calculatePoints(basePoints: number): number; // 計算加成獎勵
    }
    ```
*   **好處**：未來要增加「語音打卡」、「AI 判定」等新型任務時，不需修改 `page.tsx` 的龐大 switch-case，只需增加一個新的 `Handler` 檔案，符合物件導向開放封閉原則 (OCP)。

### 2. 神獸進化與計分引擎解耦
*   神獸等級與四維指標（如「能量感」、「影響力」）的增減，應透過獨立的計算模組進行，並由資料庫配置（JSON）讀取屬性對應表，避免程式碼內寫死 `if (score > 100) return '幼獸'` 的邏輯。

---

## 🔍 第四柱：智慧判讀 (Smart Read) —— 拒絕暴力全表讀取

**「不要暴力讀取」是本系統在資料量破千後能否順暢運作的最關鍵因素。** 目前 fetchData 平行撈取了 25 個資料表且皆無過濾條件，在前端使用雙重迴圈（$O(N^2)$）進行聯立。這在資料庫端和前端都是「極其暴力的消耗」。

### 1. 資料庫端：加上精準範圍過濾 (SQL Where Filters)
*   **優化前**：`supabase.from('submissions').select('*')` （暴力抓取歷史上所有期數、所有人的所有打卡）。
*   **優化後**：
    *   **限制期數**：學員和隊長進入系統時，一律加上當前班期篩選：`.eq('batch_id', currentBatchId)`。
    *   **限制用戶**：對於「積分日誌（`score_logs`）」等會隨著時間無限增長的流水帳，只查詢當前用戶個人：`.eq('student_id', currentUser.id)`。

### 2. 聯立判定優化：善用資料庫檢視表 (Database Views)
*   **優化前**：前端撈取上千筆 `submissions`、`profiles`，然後在 JavaScript 裡用 `.reduce()` 與雙重 `.find()` 去即時加總計算每位學員的總分、小隊打卡率、小隊總分，造成每次刷新畫面瀏覽器都要卡死 1~2 秒。
*   **優化後**：
    *   在 Postgres 建立 `v_leaderboard` (個人排行榜視圖) 與 `v_team_stats` (小隊統計視圖)。資料庫會在背後高效完成加總。
    *   前端只需要做一次查詢：`supabase.from('v_leaderboard').select('*')`，直接拿到已經算好的結果（0ms 延遲，不消耗前端運算）。

### 3. 關聯讀取優化：使用 Supabase 原生 Join 查詢
*   **優化前**：分別查詢 `submissions` 與 `profiles` 與 `missions` 三個表，在前端寫雙重迴圈對齊。
*   **優化後**：一行 SQL 完成關聯讀取，將聯立運算完全交給高效能的 Postgres 資料庫：
    ```typescript
    const { data } = await supabase
      .from('submissions')
      .select(`
        *,
        profile:profiles(name, avatar_url),
        template:mission_templates(title, points)
      `)
      .eq('batch_id', currentBatchId);
    ```

### 4. 成長型資料導入「分頁加載 (Pagination)」
*   針對「見證牆（`submissions` 中勾選分享的紀錄）」或「大後台審核列表」，**絕不能一次性 select 全表**。
*   **解決方案**：
    *   使用 `.range(from, to)` (如每次只載入 20 筆)。
    *   當使用者滑到頁面底部時，再非同步加載下 20 筆。如此一來，即使資料庫有十萬筆打卡，網頁載入依然在 0.1 秒內完成。

---

## 🗺️ 實施優先級建議 (Roadmap)

若要分步實施以降低負擔，建議依照以下優先順序進行：

*   **P0 (最迫切，立刻解決暴力讀取與掉分風險)**：
    1. 修改 `fetchData` 加入 `.eq('batch_id', currentBatchId)` 限制。
    2. 在 Supabase 對常用 Join 欄位建立「索引 (Index)」以加速查詢。
*   **P1 (介面流暢度提升，體驗最明顯)**：
    1. 將排行榜、後台等大組件改為 `React.lazy` 懶載入。
    2. 建立 Database Views，把前端 $O(N^2)$ 計算排行榜與小隊總分的邏輯移交給資料庫。
*   **P2 (架構安全與未來擴充)**：
    3. 引入 RLS 與認證機制防刷。
    4. 重構為 Handler 類別規則引擎。

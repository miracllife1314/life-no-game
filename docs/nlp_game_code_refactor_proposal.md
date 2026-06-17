# 《NLP人性溝通術計分系統》程式碼模組化拆分與分流讀取規劃書

本規劃書旨在解決系統當前 **「程式碼過度集中（127KB 單一檔案）」** 與 **「一次性載入過多資料（暴力 fetchData 25張表）」** 的架構問題。透過**目錄結構重構**與**資料讀取分流**，讓程式碼變得好維護、易擴充，同時大幅提升網頁首頁的加載速度。

---

## 🏗️ 核心重構概念：職責分離 (Separation of Concerns)

我們將目前的「大一統」架構拆分為三層：
1.  **UI 視圖層 (Components)**：只負責渲染畫面與接收使用者操作，不包含直接對 Supabase 的查詢。
2.  **狀態與邏輯層 (Hooks)**：透過 React Hooks 處理資料狀態、過濾與業務邏輯。
3.  **數據接口層 (Services)**：封裝所有與 Supabase 的 API 讀寫請求，並進行範圍過濾（防止暴力查詢）。

```
           ┌──────────────────────────────────────────────┐
           │                  app/page.tsx                │  <-- 入口點：只做登入路由分流，不載入大量元件
           └──────────────────────────────────────────────┘
                                  │
      ┌───────────────────────────┼───────────────────────────┐
      ▼                           ▼                           ▼
┌──────────────┐            ┌──────────────┐            ┌──────────────┐
│  components/ │            │    hooks/    │            │   services/  │
│  (UI 畫面)   │            │ (邏輯與狀態)  │            │ (Supabase讀寫)│
├──────────────┤            ├──────────────┤            ├──────────────┤
│ * Login      │ <── 呼叫 ──│ * useAuth    │ ── 呼叫 ── │ * authService│
│ * Admin      │            │ * useMissions│            │ * dbService  │
│ * Tabs       │            │ * usePet     │            │ * petService │
└──────────────┘            └──────────────┘            └──────────────┘
```

---

## 📁 第一部分：全新目錄結構規劃 (Directory Structure)

建議重構後的專案目錄排版如下，每個資料夾各司其職：

```
nlp-game/
├── app/                          # Next.js 頁面與 API 路由 (App Router)
│   ├── page.tsx                  # 核心入口（極簡化，只做基本認證路由分流）
│   ├── layout.tsx                # 全域版面配置
│   └── api/                      # 後端 API 接口 (如有需要)
├── services/                     # 【數據接口層】封裝所有資料庫查詢
│   ├── authService.ts            # 登入、驗證碼發送與權限檢索
│   ├── missionService.ts         # 讀取任務模板、新增打卡、審核任務（含 batch_id 篩選）
│   └── petService.ts             # 讀取神獸數值、進化線與進化紀錄
├── hooks/                        # 【邏輯與狀態層】自訂 Hooks 處理複雜狀態
│   ├── useAuth.ts                # 管理當前登入者 session、角色權限
│   ├── useMissions.ts            # 管理當前班期的任務清單與打卡紀錄
│   └── usePet.ts                 # 管理寵物升級、經驗加總、進化動畫狀態
├── components/                   # 【UI 視圖層】拆分後的 React 元件
│   ├── Layout/                   # 網頁版頭、導覽列、頁尾與背景動態特效
│   ├── Login/                    # 登入表單、簡訊驗證碼輸入、註冊填寫資料元件
│   ├── Admin/                    # 大隊長專屬管理區（審核卡片、設定期數、修改模板）
│   ├── Captain/                  # 小隊長專屬指揮所（審核小隊、查看組員打卡進度）
│   └── Tabs/                     # 學員端各分頁元件
│       ├── DailyQuestsTab.tsx    # 每日定課
│       ├── LeaderboardTab.tsx    # 排行榜
│       ├── PetTab.tsx            # 神獸狀態
│       └── WitnessTab.tsx        # 見證牆
└── lib/                          # 底層基礎套件與工具
    ├── supabase.ts               # 初始化 Supabase Client
    └── time.ts                   # 日期、時間格式化工具
```

---

## ⚡ 第二部分：資料讀取分流機制 (On-Demand Data Fetching)

### 1. 舊架構痛點（暴力讀取）：
首頁加載時，在頂層 `page.tsx` 中發送一個龐大的 `Promise.all` 查詢 25 張表，導致：
* 學員一登入，就必須連帶下載「全部期數的打卡」、「所有玩家的積分日誌」、「管理員後台規則」等幾百 MB 資料。
* 資料完全下載完成前，畫面一片空白（載入極慢）。

### 2. 新架構方案（分流讀取）：
依據 **「誰使用，誰載入」** 原則，將資料讀取職責下放到各個 Hooks 與頁籤元件中：

*   **⚡ 步驟一：首屏秒開（快速認證）**
    *   使用者打開網頁，`page.tsx` 啟動 `useAuth`，只查詢 **當前用戶個人資料 (`profiles`)**。
    *   確認登入狀態後，立即顯示系統主介面，耗時小於 100ms。
*   **⚡ 步驟二：頁籤切換時動態讀取 (Lazy Load & Fetch)**
    *   **學員進入「每日定課」頁籤**：`DailyQuestsTab` 內的 `useMissions` 被啟用，此時才向 Supabase 查詢「該學員本週的任務」與「個人當日打卡紀錄」。
    *   **學員進入「排行榜」頁籤**：`LeaderboardTab` 被點擊時，才發送請求讀取「排行榜資料檢視表」。
    *   **大隊長進入「後台審核」**：`AdminDashboard` 載入時，才發送請求讀取「待審核的打卡列表」。如果不點擊後台，這筆資料一輩子都不會下載。

---

## 🔄 第三部分：狀態管理優化 (State Management)

### 1. 引入 React Context (避免層層傳遞 Prop Drill)
原本所有的狀態如 `currentUser`, `userPets`, `squadMembers` 全都寫在 `page.tsx`，然後以參數形式一層一層往下傳給後代組件（例如：`page ➔ AdminDashboard ➔ Roster ➔ viewAsStudent`），導致修改程式時極易出錯。

*   **優化方案**：建立一個全域的 `AppContext` (或 `AuthContext`)：
    ```tsx
    export const AuthContext = React.createContext<AuthContextProps | null>(null);
    ```
*   子組件如果需要使用者資料，直接使用自訂 Hook 讀取，乾淨俐落：
    ```tsx
    const { currentUser, role } = useAuth();
    ```

---

## 📅 重構步驟與實施時程建議

由於專案正在運行，重構應採取**「漸進式拆分」**，而非一次全部砍掉重寫：

1.  **第一天：建立資料夾結構與 API 隔離**
    *   建立 `services/`、`hooks/` 目錄。
    *   將 `page.tsx` 裡面的 Supabase Fetch 邏輯抽取到 `services/` 檔案中，確保 API 呼叫模組化。
2.  **第二天：拆分組件與下放狀態**
    *   將 `page.tsx` 內部的 `AdminDashboard`、`CaptainDashboard`、以及各個學員頁籤 `Tab` 分別抽離至獨立的檔案。
    *   將原本在頂層的資料庫查詢（如 `fetchData`）拆解，讓各分頁元件自己呼叫對應的 `useMissions` 或 `usePet`。
3.  **第三天：導入 React.lazy 與編譯驗證**
    *   在 `page.tsx` 實施分頁 Component `lazy` 載入與 `Suspense` 骨架屏（Skeleton Screen）。
    *   執行 `npm run build` 進行完整 TypeScript 型別檢查，確保重構無死角。

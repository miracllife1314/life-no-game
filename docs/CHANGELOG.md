# 《NLP人性溝通術課程計分系統》變更日誌 (CHANGELOG.md)

本文件紀錄「NLP人性溝通術課程計分系統」的所有版本變更與功能修改紀錄。

## [v1.7.0] - 2026-06-11

### 🚀 修改內容
1. **神獸圖片畫質全面優化與不變形顯示**：
   - 調整後台圖片壓縮邏輯，將 Mock 儲存模式下的 Canvas 寬高壓縮上限 `MAX_SIZE` 從原先的 `200px` 提高至 `1024px`，並將 WebP 品質參數提升至 `0.9`，保證上傳高解析度網頁圖片極致清晰，且控制 Base64 在 ~30-50KB 以內，避免 localStorage 溢出。
   - 於全域 `app/globals.css` 與前台展示元件中確保 `object-fit: contain` 的圖片顯示，防止圖片因容器尺寸、CSS 拉伸或壓縮而產生模糊或變形。
2. **神獸進化路線自主設定（原神獸路線管理）**：
   - 將後台「神獸路線管理」全面重新命名為「神獸進化路線設定」，並擴充管理功能。
   - 後台編輯表單新增支援「進化名稱」、「進化後神獸圖片上傳/即時預覽」、「解鎖等級（數字輸入框，預設 5）」、「對應考驗任務（連動關聯 `mission_templates` 下拉選單）」、「顯示順序」與「是否啟用」之完整欄位設定。
3. **學員培育進度期數篩選與詳細狀態顯示**：
   - 於後台「學員培育進度」總覽中新增「班次期數篩選」下拉選單（包含「全部期數」與各個班級如「NLP初階50期」）。
   - 切換期數時自動篩選該期名冊，表格展示學員姓名、目前神獸（混沌之卵/已進化名稱）、成長等級、目前經驗值 (EXP) 與詳細的進化狀態（如：未達 Lv.5 / 待選擇進化任務 / 進化考驗中：[任務名稱] / 已進化成：[神獸名稱]）。
4. **前台即時「升級成功」彈窗 (Level-Up Overlay)**：
   - 實作前台 `useEffect` 監聽器與 localStorage 本機追蹤，當學員等級提升時，觸發全螢幕、具有粒子與發光微動畫的「升級成功」彈窗。
   - 彈窗詳細呈現目前神獸名稱、等級變化（e.g., `LV. 4 ➔ LV. 5`）、目前總經驗值、距離下一級還差多少經驗（`500 - (total_exp % 500)`），若達到進化門檻且尚未進化，則自動顯示高亮的進化引導提示。
5. **神祕進化選項與黑色剪影玩法**：
   - 當學員達到 Lv. 5 且為第 1 階段（混沌之卵）時，前台點擊進化將展示 4 個神秘進化卡片選項。
   - 使用 CSS 篩選器 `silhouette-pet` (`filter: brightness(0)`) 渲染為**黑色剪影**，隱藏神獸與流派名稱（維持神秘感），僅呈現對應的進化考驗任務標題與描述。
   - 系統會於學員達到 Lv. 5 時，自動為其班次期數發佈這 4 個神秘進化考驗任務至任務列表，供學員自由修煉。
6. **進化挑戰任務通過解鎖與破殼解密儀式**：
   - 每個神祕卡片會即時顯示學員對應該路線考驗任務的最新狀態（待提交、審核中、被退回、任務通過）。
   - 學員必須完成對應任務且獲得管理員核准（即「任務通過」）後，該進化方向才會解鎖。學員選取該已解鎖方向後，即可點擊「🔥 開始破殼解密儀式」按鈕，觸發破殼特效，進化為該守護神獸。
   - 取消了原先的流派預先鎖定機制，學員不需要事先決定方向，完全依據先通過哪項考驗來決定破殼的进化結果。

### 💡 修改原因
- 豐富神獸培育的互動體驗，將原本 Lv.5 自動進化機制優化為自主挑選神秘進化方向並執行專屬定課任務的破殼玩法。
- 提升後台圖片清晰度，增加班級期數篩選，讓督導能完整掌握每一期學員的進化與學習定課進度。

### 📂 修改檔案
- [types/index.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/types/index.ts)
- [lib/supabase.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/lib/supabase.ts)
- [app/page.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/page.tsx)
- [components/Admin/AdminDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Admin/AdminDashboard.tsx)
- [components/Tabs/DailyQuestsTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/DailyQuestsTab.tsx)
- [app/globals.css](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/globals.css)

## [v1.6.2] - 2026-06-11

### 🚀 修改內容
1. **小隊長候選名單獨立管理**：
   - 於 [types/index.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/types/index.ts) 新增 `CaptainCandidate` 介面，支援設定 `id`, `profile_id`, `status` (`eligible` | `paused` | `disabled`) 等基本與關聯屬性（包含姓名、手機後3碼、曾參與期數、曾擔任角色等）。
   - 在 [lib/supabase.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/lib/supabase.ts) 的 mock 資料庫中配置 `captain_candidates` 種子資料與 `localStorage` 升級機制。
   - 於後台新增「小隊長候選」管理分頁，提供快速搜尋、指派狀態切換以及移出候選名單的操作功能。
2. **小隊長跨期指派控制台與防重分配**：
   - **⚡ 新增「快速期數小隊長指派控制台」單一整合表單**：於小隊管理分頁最上方新增了極簡的一鍵設定表單。管理員只需「1. 選擇班次期數」->「2. 選擇所屬小隊」->「3. 選擇小隊長候選人」->「4. 選擇大隊長(選填)」，即可一鍵將小隊長及大隊綁定至小隊。設定介面極致精簡、完全免去原先需要去多步驟角色表單逐一設定的繁瑣。
   - **指派順序與智能回填優化**：調整快速設定欄位順序，改為**「先選小隊，再選小隊長候選人」**。當管理員在步驟 2 選定小隊後，系統會**自動偵測並在步驟 3 與 4 智能回填**該小隊目前已指派的小隊長及大隊長，省去人工核對時間。
   - **小隊長候選人當期去重過濾（雙通道均支援）**：快速指派表單與底部的「小隊與小隊長指派控制台」卡片下拉選單，均導入了去重過濾邏輯：在特定班次期數下，已被指派為其他小隊小隊長的候選人會**自動在下拉名單中隱藏**，防止重複指派，同時保留當前小隊己指派的小隊長供變更或清除。
   - **小隊顯示與卡片內即時修改小隊長/大隊**：全面優化所有小隊相關下拉選單及列表卡片！現在小隊選項均會以 `小隊名稱 (小隊長: 姓名)`（若無則顯示 `(無小隊長)`）的格式清晰顯示小隊長姓名。底部的「小隊與小隊長指派控制台 (批次管理)」卡片中，亦保留了可直接編輯/修改的精緻小選單（`👤 小隊長: 姓名` 下拉式變更與 `👑 所屬大隊:` 一鍵切換），雙通道設定讓管理者能靈活調校。
   - 實作防護邏輯：同一期數內，禁止將同一位小隊長重複指派給多個不同的小隊，更新時會跳出「此人在此期數已擔任其他小隊的小隊長！」警告。
   - 實作雙向自動同步觸發器（Triggers）：當更新學員期數 enrollment role 時，自動同步小隊的 `captain_id`；當小隊指派小隊長時，自動同步更新該學員在該期數的 `role = 'captain'`，並同步更新該小隊所有組員的 `captain_id`。
3. **安全 QR Code 招募通道與防竄改驗證**：
   - 重構小隊長指揮所的 QR Code 與邀請連結生成邏輯，邀請連結新增動態產生的安全隨機後綴（防通配掃描），且 URL 參數中強制攜帶 `invite`、`batch` 與 `team` 三重驗證。
   - 在學員端首頁載入時實作安全防護驗證：防篡改檢查將對比 URL 參數與資料庫小隊記錄，若不符則阻擋報名並顯示「邀請資訊不符，防竄改保護已啟動！」。
4. **回娘家學員無痛入隊與重複報名防護**：
   - 支援「回娘家學員」掃碼快速加入新期數：若登入的學員掃描新的邀請連結，系統會自動在 `user_batches` 關聯表中為其新增該期數/小隊的入隊 enrollment，而不會重複創建 profiles 帳戶。
   - 實作防護邏輯：禁止同一學員在同一個期數中重複加入多個小隊或重複報名；已登入學員若掃描已加入期數的其他小隊邀請，系統會進行阻擋警示。

### 💡 修改原因
* 實作後台小隊長候選名單管理，精簡期數建立時的小隊長挑選及跨期指派流程。
* 健全邀請通道的安全性防護，防止學員竄改 URL 期數或隊伍 ID，並流暢引導回娘家舊生加入新班級。

### 📂 修改檔案
* [types/index.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/types/index.ts)
* [lib/supabase.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/lib/supabase.ts)
* [app/page.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/page.tsx)
* [components/Admin/AdminDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Admin/AdminDashboard.tsx)
* [components/Captain/CaptainDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Captain/CaptainDashboard.tsx)

## [v1.6.1] - 2026-06-11

### 🚀 修改內容
1. **學員多期數參與關聯結構實作**：
   - 擴充 `types/index.ts` 中的 `Profile` 介面，新增 `profile_id` 與 `status` 屬性。
   - 重構 mock Supabase `lib/supabase.ts` 的底層資料模型，將原本扁平的 `profiles` 表格拆分為儲存帳戶核心資料的 `profiles`（`id`, `name`, `phone`, `created_at`）以及儲存各期數報名關聯資料的 `user_batches`（`id`, `profile_id`, `batch_id`, `team_id`, `role`, `score`, `status`, `captain_id`, `division_name`, `director_id`）。
   - 於 `getLocalStorageData` 實作自動資料庫升級移轉邏輯，無痛將既有使用者的單一期數資料移轉為 `user_batches` 關聯，並同時升級 active session 使用者。
   - 於 `SupabaseQueryBuilder` 實作動態 INNER JOIN 邏輯：當查詢 `profiles` 時，自動將 `profiles` 與 `user_batches` 進行合併，返回符合傳統 `Profile` 介面的 merged 對象，其中 `id` 欄位對應至 enrollment ID，使得前端其他模組無須修改任何欄位存取或 query API 即可完美相容多期數！
   - 升級 `signInWithPassword`、`signUp` 與 `getUser` 權限認證函數，在登入與註冊時能精確維護 profile 與多個 enrollments 關聯，並預設選擇進行中的 active enrollment 作為 session 入口。
2. **前台全域期數切換器 (Global Cohort Switcher)**：
   - 於頁首 `Header.tsx` 新增全域期數切換選單（Select 下拉選單），當學員帳號同時被加入多個期數（如 47 期與 50 期）時，會在姓名旁顯示切換選單。
   - 在 `app/page.tsx` 中實作 `handleSwitchCohort` 回呼，當學員變更選單時，動態載入該期數的 enrollment 狀態（包括該期數的總分、所屬小隊、神獸資料等），並自動儲存至 session localStorage，使前台排行榜、見證、成就、任務等所有分頁均依據選定期數即時同步更新。
3. **已結束期數唯讀防護**：
   - 在「修行定課」面板（`DailyQuestsTab.tsx`）中移除原本侷限在寵物面板內部的 local 期數切換下拉選單，改由 Header 全域切換器統一控制。
   - 實作防護邏輯：當學員切換至已結束（`ended`）或已停用（`inactive`）的期數時，前台的每日任務、每週主線任務等的「點擊簽到」、「提交證明」與「重新提交」按鈕會自動轉為唯讀的 `🔒 已結束` 狀態，且無法點擊互動或上傳，僅供查看歷史修行紀錄。
4. **後台多期數設定與狀態管理**：
   - 在後台學員管理 `AdminDashboard.tsx` 的「學員小隊分配與角色變更」表單中，新增「期數狀態 (Status)」設定欄位（進行中 / 已結束 / 已停用）。
   - 在「目前名冊概覽」表格中，新增「狀態」欄位，顯示每位學員在該期數中的當前參與狀態（進行中、已結束、已停用）。

### 💡 修改原因
* 滿足多期數參與的真實業務場景，支援學員同時加入多期培訓並進行獨立的分隊與角色管理，且歷史期數的數據在結業後僅供唯讀檢視。
* 透過中介關聯表動態 JOIN 技術，以最小的程式碼變更代價，確保所有既有計分、寵物培育、排行榜等模組無縫相容。

### 📂 修改檔案
* [types/index.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/types/index.ts)
* [lib/supabase.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/lib/supabase.ts)
* [app/page.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/page.tsx)
* [components/Layout/Header.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Layout/Header.tsx)
* [components/Tabs/DailyQuestsTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/DailyQuestsTab.tsx)
* [components/Admin/AdminDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Admin/AdminDashboard.tsx)

## [v1.6.0] - 2026-06-11

### 🚀 修改內容
1. **多大隊長支援與輸入優化**：
   - 更新後台 `AdminDashboard.tsx` 建立新課程期數表單以及列表中「大隊長姓名」欄位的 Placeholder 提示為：`「多位請用逗號分隔，例如：劉定洋,張品嬋」`，引導使用者使用逗號分隔多位大隊長。
   - 將表格行內編輯時大隊長輸入框的寬度與最小寬度加寬（`w-32 min-w-[130px]`），表頭「大隊長」也加寬至最小 140px，避免多位大隊長姓名被擠壓或換行吃字。
2. **多大隊長獨立膠囊徽章渲染**：
   - 重構小隊長指揮所 `CaptainDashboard.tsx` 中的大隊長姓名渲染邏輯：透過正則表達式 `/[,，]/` 自動拆分輸入的名單，並剔除多餘空格，為每一位大隊長渲染獨立且精美的琥珀金微光膠囊徽章（例如：`👑 劉定洋` `👑 張品嬋`）。

### 💡 修改原因
* 滿足每個課程期數（Batch）可能會有多位大隊長共同帶班的實務需求。
* 優化後台輸入引導與表格欄位寬度防護，提供高水準的使用者體驗。

### 📂 修改檔案
* [components/Admin/AdminDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Admin/AdminDashboard.tsx)
* [components/Captain/CaptainDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Captain/CaptainDashboard.tsx)

## [v1.5.9] - 2026-06-11

### 🚀 修改內容
1. **大隊與大隊長動態欄位配置**：
   - 擴充 `types/index.ts` 中的 `Batch` 介面，新增選填屬性 `division_name` (大隊名稱) 與 `director_name` (大隊長姓名)。
   - 更新 `lib/supabase.ts` 的 mock 資料與 `localStorage` 移轉升級邏輯，為既有期數 (如台中 47 期) 預載預設的大隊資訊「定洋大隊 · 👑 劉定洋」。
2. **後台期數大隊設定介面**：
   - 在後台「期數管理」分頁的「建立新課程期數」表單中，新增「大隊名稱 (選填)」與「大隊長姓名 (選填)」輸入框。
   - 在「目前課程期數列表」中新增大隊名稱與大隊長欄位，並支援在雙擊編輯/儲存時進行變更。
3. **指揮所大隊資訊條件渲染**：
   - 更新 `CaptainDashboard.tsx` 頁首：僅在該期數有設定 `director_name` 時，才會顯示大隊與大隊長資訊；若無填寫大隊長，則會自動完全隱藏此區塊，保持前台頁面簡潔。
4. **大隊長專屬小隊切換選單**：
   - 在首頁 `app/page.tsx` 中維護大隊長選取的小隊狀態 `adminSelectedTeamId`，使大隊長切換到小隊指揮所檢視時，不會被固定在預設的第一小隊。
   - 在 `CaptainDashboard.tsx` 中新增大隊長專屬的小隊切換選單（Select 下拉選單），大隊長 (Admin) 可自由切換查看該期數下各小隊的打卡進度、統計數據與學生補簽明細。

### 💡 修改原因
* 支援後台配置多個大隊及大隊長，並實作條件渲染以避免未配置大隊時出現空白標籤。
* 提供大隊長 (Admin) 在小隊指揮所隨時切換並檢視任意小隊打卡大表與成員狀態的功能。

### 📂 修改檔案
* [types/index.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/types/index.ts)
* [lib/supabase.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/lib/supabase.ts)
* [components/Admin/AdminDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Admin/AdminDashboard.tsx)
* [app/page.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/page.tsx)
* [components/Captain/CaptainDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Captain/CaptainDashboard.tsx)

## [v1.5.8] - 2026-06-11

### 🚀 修改內容
1. **後台預設任務模板編輯排版與唯讀優化**：
   - 將「編輯任務模板」模式下的「模板名稱」改為唯讀純文字（Fixed），防範編輯錯誤，符合「任務名稱固定」設計。
   - 將表格寬度設定改為 `min-w-[950px]`，為各列 `th` 加上明確的最小寬度限制；並將所有 `select` 與 `input` 編輯欄位改為滿寬（`w-full`），適配亮色與暗色模式，徹底解決修改表單被水平壓縮、吃字的問題。
   - 為「模板名稱」第一列加入 `sticky left-0` 定位、不透明背景色與右側微陰影邊框，使管理者向右滑動表格時，仍能維持左側模板名稱固定可見。
2. **自動生成任務複製次數上限**：
   - 更新 `app/page.tsx` 中 `fetchData` 與 `handleSaveBatchMissionTemplates` 後台排程自動生成任務的邏輯，在寫入資料庫時，一併將模板的 `max_completions` 次數上限複製寫入產生的 Missions 中。
   - 更新 `handleGenerateMissions` 接口以支援傳遞與儲存 `max_completions`。
3. **學員多次打卡與次數限制支援**：
   - 在 `components/Tabs/DailyQuestsTab.tsx` 中新增 `getTaskProgress` 輔助函數，精確統計目前任務的 `limit`、`approvedCount` 與 `pendingCount`。
   - 重構學員任務卡片視覺與邏輯：當次數上限限制 `limit > 1` 時，新增展示紫色進度標籤（例如 `已完成 1/3 次`）；當 `limit === 0` (無限次) 時，展示藍色進度標籤（例如 `已完成 2 次 / 無限制`）。卡片點擊限制亦依據完成進度是否達到上限進行阻擋。
4. **小隊長矩陣多打卡次數整合與累加操作**：
   - 在 `components/Captain/CaptainDashboard.tsx` 中增加 `getMemberTaskProgress` 輔助函數，在打卡矩陣內即時顯示組員的次數累加狀態，包含 `✓ x3` 已完成與 `⏳ x2` 待審核等動態角標。
   - 小隊長矩陣格子點擊互動邏輯更新：若組員有待審核 (`pending`) 紀錄，點擊格子將優先進行審核通過（核准）；若無待審核且已完成數小於上限（或無上限 `0`），點擊則為其新增一筆已核准打卡；若已完成數已達上限，點擊則撤銷刪除最新一筆已核准打卡。
   - 更新小隊進度條統計百分比計算方式，多打卡次數任務以其 `limit`（或無限次以 `1` 計）作為分母/分子統計，以確保達成率數值正確合理。
   - 更新展開組員明細的待完成/已完成列表，顯示對應的已打卡次數進度與補簽按鈕動態文字。
5. **隱藏小隊長與學員端之小隊編號顯示**：
   - 移除小隊長指揮所 `CaptainDashboard.tsx` 頁首的「小隊編號」渲染，避免隨機的資料庫 ID 外顯給前端使用者，優化視覺清爽度。

### 💡 修改原因
* 提供學員可對單一任務進行多次或無限次打卡的靈活機制，並有清晰的進度展示。
* 優化管理員預設任務模板編輯操作版面，防止欄位在水平方向受到極度壓縮擠爆。

### 📂 修改檔案
* [components/Admin/AdminDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Admin/AdminDashboard.tsx)
* [app/page.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/page.tsx)
* [components/Tabs/DailyQuestsTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/DailyQuestsTab.tsx)
* [components/Captain/CaptainDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Captain/CaptainDashboard.tsx)

## [v1.5.7] - 2026-06-11

### 🚀 修改內容
1. **期數專屬任務整合與自動生成優化**：
   - **整合 Mission 與 Task 資料**：在 [page.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/page.tsx) 中，將 `missions`（期數專屬任務）中的任務動態轉換為 `Task` 類型並合併，使傳遞給 `CaptainDashboard` 的任務陣列包含當前小隊所屬期數的所有動態任務，徹底解決小隊長指揮所的任務明細矩陣中任務欄位空白的問題。
   - **一鍵自動生成任務**：重構「配置期數專屬任務發布規則」下的 `handleSaveBatchMissionTemplates`，當管理員儲存該期數的任務配置時，系統會在後台**自動計算各日期的任務發布排程，並一鍵產生/更新寫入資料庫**，免去原先必須手動切換到「任務發布排程預覽」點擊確認產生的繁瑣二步驟。
   - **支持 ended 期數的自動生成補全**：修改 `fetchData` 中背景防護生成的期數狀態判定，將 `ended` 狀態（如台中 47 期，因在 seed data 中狀態被標記為 ended 導致先前被略過自動生成）亦納入任務自動生成及檢測，保證學員與小隊長登入能立刻看見定課和任務打卡選項。
   - **手動打卡判定修正**：更新小隊長手動幫隊員打卡 `handleToggleCell` 的函數邏輯，使其支援同時比對 `tasks` 與 `missions` 資料，當判定打卡格子點擊時能正確定位並對 `missions` 進行審核狀態寫入。
   - **打卡進度矩陣欄位格式與排序優化**：在 [CaptainDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Captain/CaptainDashboard.tsx) 中對打卡矩陣中的任務進行排版，為每日任務自動解析並補上日期前綴 `(月/日) 任務名稱`（例如 `(6/11) 每日五感恩`），並將所有每日任務按照日期（由舊到新）升序排列統一集中在最前方展示；其餘每週、限時與特殊任務則排在所有每日任務的後方。此外，移除 `th` 與 `span` 內部的 `truncate` 與 `max-w` 字數限制，支持較長任務名稱自動折行顯示（不吃字）；且依據日期分組動態套用同日期同色塊、跨日期灰白（或暗色交替）相間色塊，並在不同日期邊界加上垂直分隔線以利分辨。

### 💡 修改原因
* 解決管理員儲存完任務規則後，因為期數狀態被標記為 `ended` 且未手動進行二次確認發布，導致 47 期學員與小隊長看不到定課與任務選項的產品使用阻礙。
* 讓指揮所打卡矩陣欄位與期數專屬任務（Missions）完全同步。
* 提供精確的每日任務日期標示以利核對，並集中每日任務以便觀察，提供更好的排版與閱讀體驗。

### 📂 修改檔案
* [app/page.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/page.tsx)
* [components/Captain/CaptainDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Captain/CaptainDashboard.tsx)

## [v1.5.6] - 2026-06-10

### 🚀 修改內容
1. **小隊長指揮所指標分類優化與連動**：
   - 指揮所標題區塊完成「所屬期數 (batchName)」與「小隊編號 (team.id)」與後台資料庫屬性的動態連動。
   - 重構小隊學習整體指標區塊，細分為「每日定課打卡進度（Z% 達成率 + X/Y 件數）」、「每週任務打卡進度（Z% 達成率 + X/Y 件數）」、「特殊任務打卡進度（Z% 達成率 + X/Y 件數）」，數值直接與後台對應任務類型連動，並附帶具指導性的文字註解，方便隊務輔導。
   - 將 AI 隊務分析改為根據資料庫小隊實際統計百分比進行動態文字與士氣生成，不再寫死 mock 狀態。
2. **招募通道與邀請連結樣式與可讀性優化**：
   - 將招募通道的 QR Code 與邀請連結導向路徑由 `/register?invite=...` 修正為單頁應用的首頁路徑 `/?invite=...`，確保 QR Code 能正常產生並在掃碼後引導至正確頁面。
   - 新增專屬 CSS 類別 `.invite-link-input-black`（含 `.light .invite-link-input-black`）強制設定邀請連結輸入框的背景為純黑、文字為白色。同時在 React 標籤中移除了與其衝突的 `bg-slate-950/80`、`border-slate-800` 和 `text-slate-350` 等 Tailwind 顏色工具類別，防止亮色模式下的全域樣式覆蓋與衝突，徹底確保邀請連結文字的高對比可讀性。
3. **大隊長系統角色模擬 (GM 模式) 升級**：
   - 於 Header 更新 GM 模式模擬按鈕標籤為「原始大隊長模式」、「模擬學員模式」與「模擬小隊長模式」。
   - 實作模擬防護機制：在大隊長模擬其他角色操作時（打卡、報名、初審、存筆記），將狀態變更操作暫存於 React 記憶體中同步更新 UI，完全不寫入 supabase/localStorage 資料庫，關閉模擬模式或重新整理後隨即還原，不影響真實帳號資料。
4. **大隊長預設登入導向**：
   - 當大隊長 (Admin) 登入系統或載入 session 時，首頁 activeTab 預設自動進入「大隊指揮部」而非修行定課打卡頁面。

### 💡 修改原因
* 將指揮所及招募通道的數據及路徑正確連動至後台設定，提高前台的實時擴充性。
* 健全大隊長系統的 GM 模擬機制，提供安全的無痕模擬體驗。
* 優化大隊長的管理入口體驗，登入後直接定位至管理視窗。

### 📂 修改檔案
* [app/globals.css](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/globals.css) (新增 `.invite-link-input-black` class)
* [components/Captain/CaptainDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Captain/CaptainDashboard.tsx) (期數編號連動、招募網址與樣式優化、指標統計連動、初審/補簽 callbacks 改道)
* [app/page.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/page.tsx) (連動 `batches`、實作模擬模式記憶體防護、大隊長預設登入 tab 邏輯)
* [components/Layout/Header.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Layout/Header.tsx) (角色切換按鈕標籤更新)

---

## [v1.5.5] - 2026-06-10

### 🚀 修改內容
1. **成就系統進度名稱與樣式升級**：
   - 將成就進度條標題「修行成就進度」改名為「我的成就進度」。
   - 未解鎖成就：重構為水平橫向卡片版面（比照設計圖結構）。左側採用精緻的灰色雙層圓形邊框，內置灰色功能圖示，右側包含灰色雙翼盾牌，盾牌中心嵌入大號 Lock 鎖頭圖示（等比例縮小為精簡的 `w-28 h-28` 尺寸，在任何解析度下完美嵌入卡片），以鎖頭標籤 `🔒 未解鎖` 呈現，展現高質感的黑灰風格。
   - 已解鎖成就：重構為水平橫向卡片版面。整體呈現奢華金配色（`bg-[#090806] border-amber-500`），左側採用金色雙層圓形邊框與金色外發光（`border-amber-500 bg-black shadow-[0_0_15px_rgba(245,158,11,0.35)]`），內置發光琥珀金圖示，右側包含等比例縮小為精簡的 `w-28 h-28` 尺寸的金色雙翼盾牌徽章，盾牌中心嵌入大號金色雷電 `Zap` 圖示與金色放射漸層背光，並移除背景的分支雷電 SVG 以保持視覺清爽，頂部以閃電標籤 `⚡ 已解鎖` 呈現，展現極強的動態感與高級奢華感。
   - 進度總覽區塊：同步重構為極致黑金風格（`bg-[#070605] border-amber-500/40`），左側放置金色漸層發光進度條與「我的成就進度」標題，右側嵌套等比例縮小的金色雙翼盾牌徽章與置中發光雷電圖案，並移除背景的雷電分支線條以求視覺整潔，完美對齊設計圖風格。
   - 字體可讀性與對比度修正：為防止 Light Mode 亮色主題下的全域 CSS 規則（如 `.light .text-white`、`.light .text-slate-*` 等 `!important` 規則）將黑底卡片與總覽區塊內的文字強制轉為暗色（導致黑底配黑字），直接於 React 標籤中採用 inline `style={{ color: '...' }}` 樣式進行直接定義，徹底繞過外部 CSS 優先權覆蓋，保證所有標題、解鎖件數、分數和說明在任何背景下皆清晰易讀。
2. **系統詞彙與文字更正**：
   - 歷史明細頁面中的「全部交易日誌」字樣正式更名為「全部任務日誌」。
   - 將全系統中殘存的「經驗榜」字樣（如初始歡迎公告、公告編輯模板內容）全面替換為「排行榜」，確保與排行榜分頁名稱保持一致。

### 💡 修改原因
* 提升成就牆已解鎖與未解鎖徽章的視覺對比與美感，以金色發光風格展現解鎖的榮譽與高級感。
* 將明細與公告的術語與主選單完全對齊（如全部任務日誌、排行榜）。

### 📂 修改檔案
* [components/Tabs/AchievementsTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/AchievementsTab.tsx) (我的成就進度重新更名，未解鎖灰色遮罩，已解鎖金色漸層發光高級感樣式優化)
* [components/Tabs/HistoryTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/HistoryTab.tsx) (全部交易日誌更名為全部任務日誌)
* [components/Layout/Navigation.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Layout/Navigation.tsx) (首頁選單經驗榜更名為排行榜)
* [lib/supabase.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/lib/supabase.ts) (初始公告內容「經驗榜」更名為「排行榜」)
* [components/Admin/AdminDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Admin/AdminDashboard.tsx) (後台公告模板內容「經驗榜」更名為「排行榜」)

---

## [v1.5.4] - 2026-06-10

### 🚀 修改內容
1. **見證牆上傳圖片載入問題修正**：
   - 將圖片壓縮參數調整為最大寬度 450px，品質壓縮比調至 0.4（原為 600px, 0.6），大幅降低 Base64 字串的長度至原來的 1/3 ~ 1/4，從根本上避免了瀏覽器本地 LocalStorage 儲存上限（5MB）造成的溢出或截斷問題，確保圖片上傳後能完美顯示，且載入速度極快。
   - 同時調整了每日打卡任務的圖片上傳壓縮邏輯，統一保持圖片小巧精實。
2. **燈箱（Lightbox）介面與返回按鈕全面重構**：
   - 採用「按鈕懸浮於圖片上方」的極簡風格設計。
   - 頂部左側設計了具高度辨識度的「返回見證牆」圓角按鈕（含 ChevronLeft 圖示），右側設計「X」圓角關閉按鈕。
   - 兩個按鈕均採用**白底黑字（白底深色字）**設計，並透過 CSS 類別搭配 `!important` 規則（`.lightbox-header-btn-back`、`.lightbox-header-btn-close`），防範 Next.js 亮色主題樣式的覆蓋，確保在暗色燈箱背景中呈現出極高對比與可讀性。
   - 將放大圖片的最大高度由 `75vh` 調整為 `60vh`（容器限制 `70vh`），使頂部的懸浮按鈕與圖片內容之間留有舒適空間，防止遮擋圖片。

### 💡 修改原因
* 解決使用者反映「上架圖片後沒有顯示」的 base64 儲存及載入失敗問題。
* 解決亮色模式下放大圖片時，頂部按鈕因為被主題 CSS 覆蓋而出現白色衝突、文字無法閱讀的情況。
* 縮小圖片尺寸，避免燈箱與頂部按鈕太擠，並提供更清楚、更高辨識度的返回路徑。

### 📂 修改檔案
* [components/Tabs/WitnessTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/WitnessTab.tsx) (優化 `compressImage` 寬度品質、重構 Lightbox DOM 排版與 class 樣式)
* [components/Tabs/DailyQuestsTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/DailyQuestsTab.tsx) (同步優化日常打卡的 `compressImage` 參數)
* [app/globals.css](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/globals.css) (新增 `.lightbox-force-*` 高對比強制深色樣式集)

---

## [v1.5.3] - 2026-06-10

### 🚀 修改內容
1. **見證牆按分類篩選**：
   - 實作見證分享分類切換，包含「全部見證」、「當期見證」、「任務見證」、「分享見證」四大類。
   - **全部見證**：顯示所有期數之見證，並於每張卡片上額外顯示該期數的「期數標籤」 (如 NLP初階50期)。
   - **當期見證**：只顯示當前梯次 (currentUser 所在期數，或進行中 active 期數) 的見證分享。
   - **任務見證**：只顯示當期完成常規任務並通過審核的打卡見證。
   - **分享見證**：只顯示當期成員自行發布的自由分享 (task-custom-post)。
2. **簡潔扁平化搜尋與篩選 (刪除任務下拉選單)**：
   - 刪除「全部任務 / 任務篩選」下拉選單，簡化過濾項目。
   - 移除了笨重的篩選灰底外框容器與多餘標籤，改為極簡的搜尋輸入框與精緻的膠囊式排序、範圍切換按鈕，提升頁面清爽度與手機版閱讀體驗。
3. **一篇見證最多上傳 3 張圖片與 IG 風格外觀**：
   - 更新「發佈分享」自發心願單功能，支援上傳 1 ~ 3 張圖片。提供預覽縮圖與一鍵移除按鈕。
   - 見證卡片全新重構為 **類 Instagram (IG) 的版面結構**：頂部顯示頭像與姓名期數 -> 中間大圖/相簿網格拼圖 -> 按讚與留言的圖示按鈕列 -> 粗體姓名與見證說明內容 -> 底部細線任務分類與審核狀態。
4. **圖片放大燈箱與返回按鈕辨識度優化**：
   - 點擊拼圖中任何一張圖片可開啟放大燈箱，燈箱內支援左右切換前一張/後一張圖片，並顯示 `1 / 3` 等張數標記。
   - 燈箱新增高對比的圓角「返回見證牆」按鈕（附帶 Chevron 箭頭）與 X 關閉按鈕，強制加入 `!text-white` 與白邊框設計，徹底解決在暗色背景下返回字樣不清晰的問題。
5. **前台期數管理影藏排行修正**：
   - 修正後台「隱藏排行」狀態及控制按鈕邏輯，使其在 `batches.rankings_visible` 為 `false` 時正確顯示為「手動隱藏 / 封印中」，並修正前台對於隱藏排行的判定，使前台確實展示「排行榜封印中」鎖定畫面，提示訊息並統一改為「競賽進入倒數隱藏排名等畢業典禮後公告」。

### 💡 修改原因
* 提升見證分享牆在多梯次、多分享內容下的分類管理與檢索效率。
* 增強分享貼文的多媒體豐富度，並優化看圖燈箱的互動體驗與返回按鈕辨識度。
* 確保後台隱藏排行狀態與前台人員看到的鎖定畫面文字和狀態完全一致，防止數據洩漏。

### 📂 修改檔案
* [components/Tabs/WitnessTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/WitnessTab.tsx) (見證牆 4 大分類邏輯、多圖上傳預覽、Collage 相簿網格、燈箱 Carousel 與大返回按鈕)
* [app/page.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/page.tsx) (傳遞 batches 陣列至 WitnessTab)
* [components/Admin/AdminDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Admin/AdminDashboard.tsx) (修正期數列表公開狀態與按鈕觸發狀態)
* [components/Tabs/LeaderboardTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/LeaderboardTab.tsx) (排行榜封印畫面文字與提示邏輯優化)

### 🗄️ 是否影響資料庫
* **否**：多圖上傳採用 comma-separated base64 存入原 `proof_image_url` text 欄位，無需對 Supabase 資料庫進行結構變更，完全向下相容。

### ⚠️ 是否影響舊功能
* **否**：舊有的單圖見證會自動被 `split(',')` 視為 1 張圖片進行展示與放大，無縫相容。

---

## [v1.5.2] - 2026-06-10

### 🚀 修改內容
1. **經驗榜更名為「排行榜」與分拆四大子榜單**：
   - 經驗榜全面更名為「排行榜」，並在分頁內提供「當期個人榜」、「當期小隊榜」、「歷屆神人榜」、「歷屆神隊榜」四個子榜單。
2. **排行榜具體細節與頒獎台排版優化**：
   - **個人榜 (當期)**：前三名彩色框框內改為直接顯示學員的「完整姓名」並增大框框寬度，框框下方則統一寫「第一名/第二名/第三名」以及對應經驗值。
   - **小隊榜 (當期)**：前三名彩色框框內改為顯示「小隊簡稱」(如第一隊、第二隊)，框框下方統一顯示「第一名/第二名/第三名」、小隊長姓名及小隊總經驗。列表所有行均顯示該小隊的「小隊長」名稱。
   - **神人榜 (歷屆)**：展示所有期數的所有學員(排除管理員)按經驗排序，顯示期數名稱、姓名、等級、經驗值。
   - **神隊榜 (歷屆)**：展示所有期數的小隊，顯示期數名稱、隊名、小隊長、總等級、總經驗。
3. **結業倒數 7 天排行榜不公開 (封印) 邏輯**：
   - 實作「結業前 7 天不公開」安全機制，當系統時間與當前班次結業日期小於 7 天時，一般學員及小隊長造訪當期個人/小隊榜將顯示「當前排行榜封印中」鎖定畫面，引導學員進行最後衝刺修行。
4. **大隊長管理解封權限與後台多梯次查詢**：
   - 排行榜分頁中，若目前使用者為大隊長 (Admin) 且已進入倒數 7 天，會顯示手動解封/封印開關，可直接開啟排名公開。
   - 大隊長在排行榜頁首可透過下拉選單自由切換、查詢不同期數的當期排行榜排名。
   - 後台「期數管理」列表新增「排行榜公開」狀態顯示（公開中 / 封印中 / 常規公開），並新增「公開排行 / 隱藏排行」快速按鈕，方便隨時管理各期排行公開狀態。

### 💡 修改原因
* 滿足課程尾聲時排行榜的趣味及競爭策略性隱藏，並允許大隊長手動控制展示。
* 優化子榜單的維度（當期 vs 歷屆）及數據細節（等級、小隊長、期數名稱），提升數據可讀性。

### 📂 修改檔案
* [types/index.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/types/index.ts) (擴充 Batch 介面新增 rankings_visible 欄位)
* [lib/supabase.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/lib/supabase.ts) (Batches 初始模擬資料寫入與 rankings_visible 支援)
* [app/page.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/page.tsx) (傳遞完整 profiles, teams, batches 與 rankings_visible 修改回呼)
* [components/Tabs/LeaderboardTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/LeaderboardTab.tsx) (排行榜 4 子榜單重構、倒數 7 天封印卡片展示、等級與小隊長細節計算)
* [components/Admin/AdminDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Admin/AdminDashboard.tsx) (期數管理列表新增排行榜公開列及切換操作按鈕)
* [docs/CHANGELOG.md](file:///Users/leo/Desktop/定課系統/NLP_GAME/docs/CHANGELOG.md) (記錄變更日誌)

### 🗄️ 是否影響資料庫
* **是 (若使用真實 Supabase 需增加欄位)**：
  在 Supabase 中，`public.batches` 資料表需要執行以下 DDL 新增欄位，系統才能在真實環境下正常保存公開狀態（已於 local/mock 模式中完整兼容）：
  ```sql
  ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS rankings_visible BOOLEAN DEFAULT false;
  ```

### ⚠️ 是否影響舊功能
* **否**：學員原有的經驗值累積、寵物升級及明細流水帳等功能皆正常運作，無任何相容性影響。

---

## [v1.5.1] - 2026-06-10

### 🚀 修改內容
1. **公告預設模板與選期數排程發布**：
   - 公告發布表單新增「預設內容/模板」下拉選單，可一鍵載入預設之「歡迎加入課程」、「每日定課修行提醒」或「結訓典禮與最後衝刺」模板。當選擇期數時，模板標題會自動替換為該期數名稱。
   - 新增「排程發布時間」設定（`datetime-local`），如未設定時間則立即發布，設定時間則會在設定時間點到達後，該期學員才可看見此公告。
2. **課程預設模板與期數日期發布**：
   - 課程發布表單新增「預設內容/模板」下拉選單，支援載入預設之「基礎人性溝通術」、「進階信念重塑工作坊」或「影響力大師精進班」模板，並可自訂課程期數及日期。
3. **建立經驗成就自訂圖片與前台展示**：
   - 「建立經驗成就」表單改用高對比數字輸入框（無限制選項），並支援成就徽章圖片上傳（自動壓縮為 WebP Base64 格式儲存）。
   - 學員端成就牆（`AchievementsTab`）支援渲染上傳之自訂圖片或 base64 圖檔，並在未解鎖狀態下以去色（Grayscale）高對比呈現，解鎖後呈現原色，對齊 Lucide 預設圖標表現。
4. **隱藏「開設新班次」簡易表單**：
   - 由於「開設新班次 (Cohort)」簡易表單僅能建立班次記錄而無法自動初始化小隊，與「期數管理」功能重複且易造成後續配置遺漏。現已將其從管理後台「其他設定與管理」中隱藏，並將該區塊排版由 4 欄調整為更平衡的 3 欄，引導管理員統一使用功能完整的「期數管理」分頁。

### 💡 修改原因
* 方便管理員快速利用模板建立公告與課程，並支援公告排程預發布，簡化營運成本。
* 移除死板的成就預設選項限制，支援個性化成就徽章圖片上傳及前台展示。
* 隱藏功能重複且不支援自動初始化小隊的「開設新班次」簡易表單，優化管理流程與避免配置錯誤。

### 📂 修改檔案
* [components/Admin/AdminDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Admin/AdminDashboard.tsx) (新增預設模板配置、表單整合排程輸入、成就圖片上傳器與簡易班次建立的導流警示區塊)
* [app/page.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/page.tsx) (公告排程寫入 created_at 判定與前台過濾顯示、成就 handleCreateAchievement 接收自訂圖片)
* [components/Tabs/AchievementsTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/AchievementsTab.tsx) (支援 achievements 渲染 img 圖檔與鎖定狀態 grayscale 處理)
* [docs/CHANGELOG.md](file:///Users/leo/Desktop/定課系統/NLP_GAME/docs/CHANGELOG.md) (記錄變更日誌)

### 🗄️ 是否影響資料庫
* **否**： scheduled announcements 及成就 icon 儲存皆直接複用原有 metadata 與 data column，無 schema 變更。

### ⚠️ 是否影響舊功能
* **否**：原有公告立即發布、課程發布及預設成就正常運作，無相容性影響。

---

## [v1.5.0] - 2026-06-10

### 🚀 修改內容
1. **小隊分配頁面優化 (高對比度白字黑底與樣式對齊)**：
   - 提升後台「目前名冊概覽」、寵物階級進度表、排程預覽表之表格內文字對比度，將低對比的 `text-slate-400 light:text-slate-600` 調整為 `text-slate-200 light:text-slate-800`，確保視覺無障礙可讀性。
2. **小隊分配新增「期數切換選單」 (Batch Filter Pills)**：
   - 於管理者後台小隊分配的「目前名冊概覽」表格上方新增期數篩選 Pills（Batch Selector），讓管理員可動態切換並查看不同期數的學員小隊名單，無須離開頁面。
3. **手動調分功能升級與經驗值對齊**：
   - 將手動調分操作由原本的下拉選單改為數字輸入框（支援正數與負數直接輸入），方便快速微調，並將調整名稱更新為「經驗值」。
4. **全域 UI 詞彙替換 ("修為" -> "經驗")**：
   - 全面將前台與後台的「修為」字樣更名為「經驗 / 經驗值」，包含每日任務、每週主題、特殊任務之獎勵顯示、排行榜（修為榜更名為經驗榜）、學員個人資料頁首、修行明細記錄、小隊長補簽提示等。
   - 保留內部資料結構、API 與 supabase 欄位名稱以維護資料庫相容性。
5. **個人面板取消分類篩選**：
   - 移除學員端「修行定課」分頁（個人面板）中的「分類篩選」Pills 與對應的篩選邏輯，預設直接顯示該頁籤下所有的修行任務。

### 💡 修改原因
* 提升小隊分配頁面的文字可讀性，增加多期數切換的便利性。
* 升級手動調分輸入體驗，支援更精確、正負向的經驗值調整。
* 統一全系統使用者介面上的術語，將「修為」更名為學員更易理解的「經驗」。

### 📂 修改檔案
* [components/Admin/AdminDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Admin/AdminDashboard.tsx) (新增期數篩選 Pills、表格對比度提升、手動調分升級為輸入框、全域 修為 ➔ 經驗)
* [components/Tabs/DailyQuestsTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/DailyQuestsTab.tsx) (更名為經驗、神獸對話/進化共鳴更名)
* [components/Tabs/LeaderboardTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/LeaderboardTab.tsx) (排行榜更名為經驗榜)
* [components/Tabs/SpecialQuestsTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/SpecialQuestsTab.tsx) (獎勵文字更名)
* [components/Tabs/WeeklyTopicTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/WeeklyTopicTab.tsx) (獎勵文字更名)
* [components/Tabs/HistoryTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/HistoryTab.tsx) (明細記錄標題與內容更名)
* [components/Tabs/WitnessTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/WitnessTab.tsx) (審核通過獎勵文字更名)
* [components/Layout/Navigation.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Layout/Navigation.tsx) (選單 修為榜 ➔ 經驗榜)
* [components/Layout/Header.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Layout/Header.tsx) (個人資訊欄位 修為 ➔ 經驗)
* [components/Captain/CaptainDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Captain/CaptainDashboard.tsx) (小隊長補簽提示與成員明細更名)
* [app/page.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/page.tsx) (打卡成功 Toast 與經驗浮動動畫文字更名)
* [lib/supabase.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/lib/supabase.ts) (公告初始文字更名)
* [app/layout.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/layout.tsx) (SEO metadata 排行榜更名)
* [docs/CHANGELOG.md](file:///Users/leo/Desktop/定課系統/NLP_GAME/docs/CHANGELOG.md) (記錄變更日誌)

### 🗄️ 是否影響資料庫
* **否**：底層欄位（如 score）及資料結構均不變，僅有使用者介面（UI）與通知訊息上的呈現詞彙調整。

### ⚠️ 是否影響舊功能
* **否**：不影響任何打卡、任務判定及自動加分計算邏輯。

---

## [v1.4.0] - 2026-06-10

### 🚀 修改內容
1. **任務分類（任務分類）功能實作**：
   - 在 [index.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/types/index.ts) 中為 `Task`、`MissionTemplate` 與 `Mission` 介面新增選填的 `category` (任務分類) 屬性。
   - 更新大會指揮部（後台）的「任務模板庫」與「期數任務設定」，支援建立與編輯任務模板時設定分類（例如：初階、進階、VIP、期數任務等）。
   - 後台支援依照任務分類篩選任務模板及發布規則，加速管理者檢索與設定。
   - 於手動「任務管理」（ ad-hoc 任務）的建立 Modal 中新增「任務分類」下拉選單，讓單次指定任務也能設定分類。
   - 學員端「修行定課」任務列表上方新增分類篩選按鈕列（Pills），動態計算當前可用的分類選項（包含預設分類及已發布任務中的分類），並依學員選擇過濾顯示的任務與期數任務。
2. **每週任務日期計算時區 Offset Bug 修正**：
   - 修正每週任務發布與截止日期計算時，因本地時間與 UTC 時間轉換（如 `.toISOString()`）導致星期一任務提早一天跑到星期日（如 6/8 變成 6/7）的時區偏移問題。
   - 全面改用 UTC 時間函式（`getUTCDay`、`setUTCDate` 等）進行週別與日期遞增計算，確保生成的發布與截止日期不受本地瀏覽器與伺服器時區差異影響，日期精確對齊活動開始日之對應星期。

### 💡 修改原因
* 滿足課程系統新增「任務分類」與篩選的需求，並統一學員端與管理端之任務管理體驗。
* 解決因時區轉換造成每週任務日期往前偏移一天的 Bug，確保排程生成日期與實際規劃日期 100% 一致。

### 📂 修改檔案
* [types/index.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/types/index.ts) (擴充任務與模板資料結構的 category 屬性)
* [app/page.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/page.tsx) (改用 UTC 計算每週任務日期、動態任務生成時複製分類欄位)
* [components/Admin/AdminDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Admin/AdminDashboard.tsx) (後台模板/發布規則篩選、手動任務建立 Modal 新增分類選擇、UTC 日期預覽計算)
* [components/Tabs/DailyQuestsTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/DailyQuestsTab.tsx) (學員端任務列表新增分類篩選 Pills 及過濾邏輯)
* [docs/CHANGELOG.md](file:///Users/leo/Desktop/定課系統/NLP_GAME/docs/CHANGELOG.md) (記錄變更日誌)

### 🗄️ 是否影響資料庫
* **否**：本地模擬資料庫（localStorage）在儲存時會自動序列化新屬性，無須手動更改 Supabase schema。

### ⚠️ 是否影響舊功能
* **否**：舊有任務若無 category 屬性，會於前端篩選中歸類於「全部」，不影響任何既有任務之打卡與計分運作。

---

## [v1.3.0] - 2026-06-09

### 🚀 修改內容
1. **神獸系統進化與多路線培育**：
   - 擴充神獸進化路線（`pet_lines`）與進化階段（`pet_stages`）功能。
   - 支援四種主要的進化路線：尊者龍（Dragon）、卓越獅（Lion）、親和狐（Fox）與沉靜水母/精靈（Spirit）。
   - 當學員的修為分數自動轉換為神獸 EXP 及 Level 達到 5 級以上時，自動觸發並解鎖對應的進化路線選擇。
2. **神獸對話氣泡互動**：
   - 於學員端「修行定課」分頁整合神獸動態卡片與對話泡泡。
   - 神獸的招呼與對話內容會根據當前神獸的進化型態與等級進行動態調整（例如尊者龍提供拆解信念指引，卓越獅激發行動力）。
3. **後台神獸階段管理與圖片上傳**：
   - 管理者後台新增「神獸各階段外觀編輯器」，支援調整各階段的名稱、描述、進化門檻（最低等級/最高等級）、發光顏色及呼吸動畫特效。
   - 整合 Supabase Storage 圖片上傳功能，並引入**圖片背景透明度偵測**機制。若上傳之神獸圖片包含不透明背景，系統會發出警告提示，避免破壞學員端雙主題模式下的視覺體驗。
4. **自動化分數與神獸 EXP/Level 同步**：
   - 引入首頁載入時的自動對齊邏輯。系統會比對學員的總修為（Score）並自動同步更新 `user_pets` 內的 EXP 與 Level，並於滿足條件時觸發進化待處理狀態。

### 💡 修改原因
* 實作第七階段「後台寵物圖片上傳與神獸進化功能」，增強本計分系統的遊戲化學習元素。
* 讓管理員能夠自行配置與上傳精美的神獸插圖，並透過透明度檢測確保 UI 視覺美感一致。
* 提升學員在日常定課打卡過程中的互動感與心智模型建立。

### 📂 修改檔案
* [app/globals.css](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/globals.css) (新增神獸呼吸動畫、外觀發光與進化特效樣式)
* [app/page.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/page.tsx) (整合神獸相關資料庫讀寫、同步邏輯與進化 RPC 介面)
* [components/Admin/AdminDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Admin/AdminDashboard.tsx) (實作神獸進化管理、圖片上傳、背景透明度偵測與警告 UI)
* [components/Tabs/DailyQuestsTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/DailyQuestsTab.tsx) (學員端神獸卡片、對話泡泡與手動進化觸發按鈕)
* [lib/supabase.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/lib/supabase.ts) (升級本地模擬資料庫 schema，新增 `pet_stages`, `pet_lines`, `pet_evolution_logs` 資料操作)
* [types/index.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/types/index.ts) (擴充神獸相關介面 `PetStage`, `PetLine`, `PetEvolutionLog` 與 `UserPet` 類型定義)

### 🗄️ 是否影響資料庫
* **是**：新增了 `pet_stages` (神獸階段定義表)、`pet_lines` (神獸進化路線表)、`pet_evolution_logs` (神獸進化歷史日誌表) 三張資料表，並擴充了 `user_pets` 的欄位（將 `pet_id` 等扁平屬性升級為多維進化軌跡屬性）。

### ⚠️ 是否影響舊功能
* **否**：原有的分數計算機制、定課打卡及小隊積分累計功能均完整保留，且新增的同步機制具有良好的防錯與預設值防護，不影響既有流程。

---

## [v1.2.0] - 2026-06-06

### 🚀 修改內容
1. **強制顯示課程報名連結與預設網址防護**：
   - 學生端「課程」頁面的所有卡片現已強制顯示「前往課程報名連結」按鈕。
   - 若管理發布時未提供特定連結，系統會自動套用預設網址 `https://example.com/register-nlp`，避免按鈕消失破壞排版。
2. **後台發布課程管理與一鍵刪除**：
   - 於管理員後台的「發布課程與日期」區塊下方新增「已發布課程列表」。
   - 提供直觀的垃圾桶刪除按鈕，方便管理員隨時一鍵下架已發布的課程並重新發布。
3. **雙主題文字高對比度優化 (A11y 可讀性防護)**：
   - 移除課程卡片上重複顯示的黃色「課程日期」徽章，使版面專注於內容與報名。
   - 將課程標題改為高對比琥珀金色（深色模式下為亮琥珀 `text-amber-500`，淺色模式下為深琥珀金 `light:text-amber-800`）。
   - 提升課程敘述、小隊徽章與通知列文字在淺色主題下的對比度，解決原本灰色偏淡、難以閱讀的問題。
   - 全域 CSS 強制覆蓋規則，確保彩色實色按鈕（`bg-purple-600`、`bg-blue-600`、`bg-red-600` 等）在雙主題下均強制呈現**純白文字 (`#ffffff`)**，避免出現紫底黑字。
4. **小隊命名格式優化與職稱更正**：
   - 首頁 Header 的小隊名稱顯示順序調整為 `預設隊名 (自訂隊名)`（例如：`NLP初階50期第二隊 (帥氣對)`）。
   - 新增動態切除重複期數前綴邏輯，將 Header 精簡為：`第二隊 (帥氣對)`。
   - 將 Header 處的 `小隊長・導師` 職稱標籤更正為符合大會設定的 **「小隊長」**。
5. **本地資料庫 schema 自動移轉升級**：
   - 在 `lib/supabase.ts` 中實作 localStorage 資料結構升級邏輯，修復舊版本被自訂名稱覆蓋的原小隊名稱，並安全地將自訂小隊名稱存入專屬欄位。

### 💡 修改原因
* 簡化課程發布流程，並在後台提供完整的增刪管理。
* 修正淺色模式下文字與彩色按鈕的色彩對比度缺陷，確保系統在任何光線環境下皆符合無障礙閱讀標準。
* 遵循大會對小隊長職稱與小隊命名的規範，簡化首頁排版，並透過自動移轉保護舊用戶的本地資料庫。

### 📂 修改檔案
* [lib/supabase.ts](file:///Users/leo/Desktop/定課系統/NLP_GAME/lib/supabase.ts) (資料庫移轉修復)
* [components/Layout/Header.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Layout/Header.tsx) (小隊名稱格式簡化與職稱標籤調整)
* [components/Tabs/CourseTab.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Tabs/CourseTab.tsx) (課程卡片報名按鈕與對比度樣式優化)
* [components/Admin/AdminDashboard.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/components/Admin/AdminDashboard.tsx) (新增已發布課程列表與刪除介面)
* [app/globals.css](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/globals.css) (按鈕對比度防護與高對比文字樣式)
* [app/page.tsx](file:///Users/leo/Desktop/定課系統/NLP_GAME/app/page.tsx) (串接刪除課程 API)

### 🗄️ 是否影響資料庫
* **否**：未更改 Supabase 實體資料庫 schema。但針對 localStorage 模擬資料庫進行了自動 schema 移轉與欄位結構升級。

### ⚠️ 是否影響舊功能
* **否**：主要為視覺優化、欄位文字更正及資料修復，所有原有功能皆不受影響。

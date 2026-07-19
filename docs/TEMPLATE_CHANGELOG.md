# Template Changelog — 模板變更紀錄

> 複製本模板到新專案時，請在此檔頂部記一行：「基於模板 vX.X.X 複製於 YYYY-MM-DD」。

## v1.7.0（2026-07-16）— 一週實戰回流：角色系統重定位 + AI 驗證通道 + 索引/GRANT 機器對帳

> 來源：學院專案 `logs/template_feedback.md` 一週高強度實戰盤點（R1~R8 建議書 + 全元件去留總表）
> ＋ 2026-07-09 Supabase default privileges 安全條目 ＋ 2026-07-08 待回流三則。
> 核心再驗證：**文字規則會衰減，機器檢查會存活**（hook 類 100% 執行、儀式類 0% 執行）。

### Changed（R2 角色系統重定位：從「扮演制」改為「清單＋第二顆腦」）

- **AI_RULES §4 六維 Technical Review 升格為角色檢查的日常執行體**（六維＝六個角色視角）；多角色開會儀式退役。（依據：一週角色開會 0% 執行率；六維輕、可執行）
- **ROLE_SYSTEM §7 改為「獨立審查機制」**：執行載體改為**乾淨的獨立 AI 實例／子代理，只給 diff＋需求**；「同一 AI 分飾多角開會」退役。實作者迴避、按視角分開回報、五類否決權、Unverified、禁虛構風險等精神全部保留。（依據：乾淨子代理一次審查抓到實作者自漏的 High bug——另一顆腦，不是另一頂帽子）
- **「啟動 1~8」升為主打用法**（TASK_ROUTER §0、ROLE_SYSTEM §1）：使用者點名＝當回合指令，100% 執行，是最可靠啟用路徑；AI 依關鍵字應「真的 Read」對應 SKILL。（依據：整週唯一一次正式載入 skill 的任務零失誤，憑感覺的 UI 任務連踩三坑）
- **🛡️ 標示協定縮小為「載入才標」**（AI_RULES §10）：實際載入守衛/角色檔時標一行 `🛡️ 已載入：<名>`，供使用者抽查；廢除「每次回報開頭全域宣告」。（依據：全域宣告 0% 執行率，留著損傷規則權威；無法機器化——AI 讀檔行為 script 攔不到，故縮為可抽查的最小語言協定）
- **docs/roles/ 八檔降級為「深查參考」**，不刪、不再是流程要求（ROLE_SYSTEM、TASK_ROUTER §0.5、_目錄說明 同步）。

### Added（R3 高風險獨立審查機器化，先軟後硬）

- **scripts/review.sh**：取 `git diff origin/main..HEAD` 交乾淨 AI 實例（`claude -p`）以資安＋QA 視角審，輸出 `logs/reviews/<sha>.md`，末行固定 `VERDICT: OK|BLOCKER`（判定只看末行，勿全文 grep）。觸發範圍從嚴：僅 migration/auth/金流/權限（`--force` 可強制）；無 claude CLI 時印手動替代流程。**軟跑階段不掛 pre-push 硬門**，統計 1~2 週真問題/誤報/拖慢後由使用者決定升級。（端到端實測：沙盒故意放「無 RLS＋grant all」migration，審查正確回 BLOCKER）
- **AI_RULES §5**：高風險改動交付前跑 review.sh 一句指路。

### Added（R5 AI 驗證通道成為必備項——本次通用性最高的一條）

- **TESTING §0「AI 驗證通道（必備基建）」**：每個系統必須提供 AI 可用的端到端驗證通道（測試帳號＋種子資料 / 免密身分切換 / staging 自動登入，擇一）；只在 local/staging，不通 production。（依據：AI 登不進學員頁 → §10「實跑流程」物理上做不到 → 本該 30 秒抓到的 bug 漏到使用者面前；此基建防 bug 效益高於任何審查制度）
- **AI_RULES §10 補協定**：AI 測不了的流程必須明講「我測不了 X，需要你測 Y」，不得含糊帶過。
- **BROWNFIELD_IMPORT 第 2 步新增「AI 驗證通道盤點」**（高優先修繕項）；INIT_PROMPT 同步必備項。

### Added（機器對帳與安全提醒）

- **preflight 第 13 項：skill 索引一致性**（黃字）——`.claude/skills/` 實際資料夾 ↔ `_目錄說明.md` skill 表 ↔ `TASK_ROUTER §0` 表雙向對帳（漏列＋幽靈條目都抓）。（依據 R4：學院 `_目錄說明` 實證 drift——漏列 skill、路徑寫錯；手動索引必 drift，只有機器對帳能治。六情境實測通過）
- **preflight 第 14 項：新 migration 建表無 REVOKE**（黃字）——Supabase default privileges 會自動 GRANT 新表給 anon/authenticated，只寫 GRANT（加法）收不窄。（依據 2026-07-09 條目：Staging 實證 anon 拿到 56 筆權限，全靠 RLS 單層硬撐。三情境實測通過）
- **DB_MIGRATION_RULES 鐵律 12＋SECURITY_CHECKLIST 第 18 項＋supabase-guard 鐵律 9**：敏感表/函式必須顯式 `REVOKE ALL FROM anon, authenticated` 再最小 GRANT（規則全文在 DB_MIGRATION_RULES，skill 只摘要）。

### Changed（結構與語言協定）

- **R1 docs 熱/冷分層**：`_目錄說明.md` docs 表加「層級」欄——熱區 5 份（AI_RULES、TASK_ROUTER、DB_MIGRATION_RULES、SECURITY_CHECKLIST、DEPLOYMENT）＝維護優先；其餘標冷（情境參考，出事才查；冷≠沒用）。（依據：31 份 docs 實戰 load-bearing 約 5 份）
- **R6 AI_RULES §11 補註**：「一功能一 push」防的是同批已知改動拆多次推造成部署空窗；不禁止「部署→使用者實測→修正」的迭代循環。（依據：單一功能因即時回饋連推 5+ 次屬健康迭代，被誤判違規）
- **R8 索引文件二選一**：skill 索引已機器對帳（第 13 項）；README 目錄樹、_目錄說明其餘表格檔頭標「可能落後實況，以實際內容為準」——不留「看起來權威其實過期」狀態。
- **AI_RULES §0.3 補**：禁止 `git add .` / `git add -A` 整批加入（2026-07-08 條目；無法機器化——hook 看不到 staging 指令，已註明原因）。

### Deferred（否決／延後，含理由）

- **R7 檔案行數 preflight 提醒**：使用者裁決**暫不做**，記入 FUTURE_BACKLOG 第 4 項——誤報風險中等（大檔改一行也被唸），黃字噪音疲勞會侵蝕其他提醒權威；「大檔失控」重複發生 ≥2 次再升級。
- **2026-07-08 CI 分層策略**：已在 FUTURE_BACKLOG 第 3 項（觸發條件未到，不提前建）。

### Fixed（發版前全庫體檢＋外部獨立審查補正）

- 體檢抓到的舊 drift：INIT_PROMPT §五 skill 清單 6→8（v1.5.1 起漏）、README「見 CLAUDE.md 對照表」→ Router §0（v1.4.0 起漏）、security-engineer.md 17→18 項。
- 外部獨立審查（`logs/reviews/1bc4df6.md`，乾淨實例，VERDICT: OK）抓到：INIT_PROMPT「12 項通用防範」→ 13 項（實作者自漏——「另一顆腦」第二次實證）；preflight #14 pass 文案弱化為「字面偵測，逐表覆蓋仍須人審」；review.sh 檔頭補「升級硬門前兩項決策點」（diff prompt injection、檔名關鍵字誤報/漏報統計）；review.sh --force 顯示補正。
- DEPLOYMENT 部署前清單補 review.sh 一行；FEEDBACK_LOOP 已驗證實例補 v1.7.0（第一次負向證據回流：依 0% 執行率裁撤規則）。

### Sync（防 drift）

- BROWNFIELD_IMPORT：skill 數 6→8、複製清單補 review.sh/release.sh、驗證通道盤點項。
- INIT_PROMPT：角色系統鐵律（子代理審查/深查參考/🛡️ 載入標示）、五項黃字、review.sh、TESTING §0、SECURITY 18 項。
- README（目錄樹標註＋review.sh＋角色系統段）、CLAUDE.md＝AGENTS.md（兩檔一致）、CUSTOM_SYSTEM_PROMPT、qa-verify＋supabase-guard skill（含 .agents 鏡像）、_目錄說明（熱/冷欄＋reviews/＋review.sh＋13/18 項數補正）。

## v1.6.3（2026-07-12）— 版本一致性機器化（防「tag 存在但文件無此版」）

> 來源：v1.6.2 事故——git tag 打了 v1.6.2，但 changelog 與 preflight 檔頭未同步；
> 版本號散落三處（git tag / changelog / 檔頭）卻無任何檢查。學院 re-sync 時抓到此落差。
> 依母版鐵律「文字規則會衰減，機器檢查會存活」，把版本一致性改為機器強制。

### Added（新增）

- **preflight 第 12 項：版本一致性**（黃字提醒）——changelog 最新版號 ≠ preflight 檔頭版號即提醒。commit 當刻就抓到「檔頭沒跟著 changelog 一起 bump」（此事故當時就會被攔）。
- **scripts/release.sh：發版一致性閘門**——`bash scripts/release.sh vX.Y.Z` 只在「工作區乾淨＋changelog 最新版＝檔頭＝傳入版號＋tag 未存在＋preflight 通過」五項全滿足時才打 tag，杜絕漏步驟打出「幽靈版本」。不 commit、不 push（維持人為決定）。

## v1.6.2（2026-07-12）— 修正 BROWNFIELD 匯入指令舊路徑

> 來源：v1.6.2 封版時發現匯入指令的絕對路徑漏「2版」，貼上會找不到檔案。

### Fixed（修正）

- **BROWNFIELD_IMPORT.md 匯入指令路徑**：`/Users/leo/萬用AI系統開發/…` → `/Users/leo/萬用AI系統開發2版/…`（可執行絕對路徑，原本貼上即失敗）。
- **FEEDBACK_LOOP.md、template_feedback.md** 母版暱稱一致化補「2版」。
- **preflight-check.sh 檔頭版號**補正：v1.6.0 → v1.6.2（先前 v1.6.1 未同步檔頭）。

## v1.6.1（2026-07-12）— 外部審查修正 + 收尾

> 來源：v1.6.0 獨立外部審查（2 Important、1 Improvement）+ 收尾三小項。

### Fixed（依審查修正）

- **preflight 第 11 項改三態明確標記**：`Mobile check: verified / unverified / not-applicable`，廢除模糊關鍵字判定（審查實證：「本次未檢查手機版」原會轉綠）。輸出文案忠實區分三態，並明寫「只驗證聲明狀態，不能自動判斷破版」。六情境乾淨狀態實測通過（含否定聲明、舊關鍵字不轉綠、無 UI 靜默）。
- **風格 D 起手 token 對比修正**：`#ea580c`（白字 3.56:1，違反 BRAND_UI §11 AA）→ `#c2410c`（5.18:1）、hover `#9a3412`（7.31:1），實算通過。
- **FEEDBACK_LOOP 規則預算第 1 點**補「原則同 AI_RULES §0.1（原則 SSOT），本點只是回流關卡落地」，消除潛在雙頭馬車。

### Added（收尾）

- **ai_sync_log 紀錄格式加 `Mobile check:` 欄**：AI 填紀錄時自然寫三態，preflight 警告變兜底；未填的模板原文刻意不會被 preflight 誤判為已填。
- **CUSTOM_SYSTEM_PROMPT 補角色系統**：動態啟動 + 獨立審查制兩行指路（原短版停在 v1.4 世界觀）。
- **git tag 版本標記**：v1.4.1 起每版打 tag，舊專案對照缺哪些改進可用 `git log vA..vB --oneline`。

## v1.6.0（2026-07-12）— 評分回饋優化：手機檢查機器化 + 風格開箱 token + 規則預算

> 來源：v1.5.2 全母版評分（8.6/10）的優化建議 2~6 批次執行。

### Added（新增）

- **preflight 第 11 項：UI 變更無手機檢查聲明**（黃字提醒，不擋 commit）——變更含 UI 檔案（css/tsx/jsx/vue/svelte/html 或 components/app/pages/）而 `logs/ai_sync_log.md` 無手機 / mobile / 375 / 響應式聲明時提醒。比照第 9 項金流提醒的機器化模式；三情境實測通過（無聲明警告 / 有聲明綠燈 / 無 UI 變更靜默）。
- **STYLE_PACKS A~E 各附「起手 token」**：選完風格直接換入 `--color-primary` 系列即可成型（A 近黑極簡 / B 暖棕 / C 即預設藍 / D 轉換橘－全頁唯一焦點色 / E 科技紫），含搭配注意事項；擴充包 F/G 於實際使用時依同格式補值。
- **BRAND_UI §12「實測而非目測」**：有瀏覽器工具時必須實際以 375px 開頁驗證；無法實測必須標「未實測，僅程式碼推估（Unverified）」，不得寫成「已檢查」。
- **FEEDBACK_LOOP「規則預算」**：回流新規則前先問能否機器化；無法機器化須寫明原因；優先替換整併而非疊加——把「文字規則會衰減」的教訓固化為回流關卡。

### Changed（變更）

- preflight-check.sh 版號標示 v1.6.0。

### 未完成（需使用者操作）

- 母版推上私有遠端備份：本機無 gh CLI / Homebrew，無法代建 GitHub repo；本地已就緒，剩三步手動指令（見交付回報）。

## v1.5.2（2026-07-12）— 獨立多角色審查機制

> 來源：使用者需求——防止「同一 AI 自我放水」：實作者不得批准自己的成果。

### Added（新增）

- **ROLE_SYSTEM §7（單一事實來源）**：實作者迴避（7.1）、獨立判斷→交叉審查→整合三階段（7.2）、各角色分開回報與整合回報格式（7.3）、合作但不取代不跟隨（7.4）、五類否決權不受多數決（資安/資料庫/金流/核心需求/嚴重手機 UX，7.5）、無證據標 `Unverified` + 禁止虛構風險 + 已啟用/已完成審查/尚未驗證三態（7.6）。
- **ROLE_SYSTEM §1 第 5 點**：關鍵字只是觸發提示，啟動依實際任務意圖與風險判斷，不過度啟動。
- **qa-verify 守衛整合審查流程摘要**（不新增 skill、不重抄，指向 §7）；description 補 multi-role review 觸發詞。含 `.agents` 鏡像同步。
- **AI_RULES §12 第 4 點**：核心規則最短摘要（迴避 / 三階段 / 否決權 / Unverified），指向 §7。
- CLAUDE.md / AGENTS.md 各加一行指路（兩檔一致）；INIT_PROMPT 同步一句。

## v1.5.1（2026-07-12）— 角色可視化 + 守衛補齊為 1~8（每角色皆有對應 SKILL）

> 來源：使用者回饋——「調用了哪些角色要讓我知道」＋「其他角色也要像 UI/UX 一樣有守衛 SKILL」。

### Added（新增）

- **skill 7 `qa-verify`（測試與驗收守衛）**：金流權限交易必測、bug 必附重現、回報用語三詞協定、手動驗證格式。對應 QA Engineer。
- **skill 8 `deploy-guard`（部署與維運守衛）**：環境分離、不碰 production、migration 先 staging、必有回滾、部署交付格式。對應 DevOps Engineer。兩者皆含 `.agents` 鏡像。
- **AI_RULES §10 標示協定第 3 點「角色標註」**：啟動多角色時在開頭標 `[角色：___、___]`（例：`🛡️ [已啟用：啟動 3 金流與交易守衛] [角色：資安、資料庫、QA] [Claude]`），使用者隨時看得到本次由哪些角色把關；集中審查回報中各角色結論分開列出。

### Changed（變更）

- TASK_ROUTER §0 對照表擴為 1~8；部署分類（9）必讀加入 deploy-guard。
- ROLE_SYSTEM §5 對照表補 7/8——**八個角色全部有對應守衛**（PM→6、架構→5、開發→4/5、DB→2、資安→2/3、QA→7、DevOps→8、UI/UX→1）。
- 「啟動 1~6」全庫同步為「啟動 1~8」：README（三件事）、CLAUDE.md / AGENTS.md（保持一致）、CUSTOM_SYSTEM_PROMPT、INIT_PROMPT（skills 清單八個）、_目錄說明。

## v1.5.0（2026-07-12）— 三層架構定名 + 多角色協作系統 + UI/UX 商用產品設計師

> 來源：整套母版全面檢視優化。目標：萬用、輕量、商用、風險觸發升級——
> 平常簡單快速，高風險有商用保護；產品不只能用，還要好看、好懂、手機好操作。

### Added（新增）

- **`docs/ROLE_SYSTEM.md`**：多角色協作系統精簡核心——8 角色一覽、依任務分級的啟動原則（小改單角色直做 / 中改段落後集中審查一次 / 高風險依風險啟動）、UI/UX 三級啟動條件、與 SKILL「啟動 1~6」對照。鐵律：**動態啟動，不是每次全員開會**。
- **`docs/roles/` 八個角色完整版**（按需載入，不塞入口檔）：product-manager、**ui-ux-product-designer（新核心角色）**、system-architect、developer、database-engineer、security-engineer、qa-engineer、devops-engineer。每檔含定位 / 核心責任 / 啟動時機 / 集中審查檢查清單，規則一律指向既有 SSOT 文件不重抄。
- **UI/UX 商用產品設計師**正式加入核心角色：非一般美工、不可由前端完全取代；含與前端工程師的分工表（風格 / 流程 / 資訊架構 / 響應式策略 / 互動狀態 / 體驗驗收 vs 程式實作 / 元件 / 相容性 / 效能 / 無障礙實作）與驗收交付格式。
- **`docs/STYLE_PACKS.md`**：風格庫抽出為獨立可擴充文件——**風格提問協定**（未指定風格不得自行猜測，原則上只問 5 題）+ 五個基本風格 A~E（高級極簡 / 溫暖專業 / 現代商務 / 高轉換行銷 / 高級科技）+ 擴充包（高級學院風、遊戲任務風）+ 新增格式。
- **`docs/tech-packs/nextjs-supabase-vercel.md`**：技術套件層落地——預設棧技術特有規則的索引（不重抄）+ **換技術棧 Swap Checklist** + 等價概念對照表。其他套件有真實需求才建，不預建空套件。
- **UX_GUIDELINES §四「符合人性的簡單操作」**：13 項硬性檢查（知道在哪 / 下一步 / 主要目標 / 減步驟 / 不叫使用者找系統能拿到的資料 / 白話 / 錯誤與成功回饋 / 防選擇困難 / 危險操作確認 / 表單最小化 / 中斷可續）。簡單直覺可信任 > 炫技。
- **AI_RULES §12「多角色協作」**：角色鐵律入 SSOT（動態啟動 / 風格先問 / 分工不混淆），細節指向 ROLE_SYSTEM。
- **TASK_ROUTER §0.5 角色啟動**；分類 3（UI）加讀 STYLE_PACKS 與 UI/UX 角色檔的情境指引。

### Changed（變更）

- **BRAND_UI_SYSTEM §12** 升級為「手機優先與防破版硬性標準」完整清單：非必要橫向捲動 / 內容超框 / 44px 觸控 / 長表單分段 / Modal-Drawer 可操作可關閉 / 手機 CTA 可見 / 圖片比例與 fallback / **禁 hover-only 主要操作** / 常見寬度檢查（375/390/414）/ 表格手機化四策略（卡片化 / 重點欄位 / 可控橫捲 / 展開），桌機手機可不同排列。
- **BRAND_UI_SYSTEM §13** 改為指向 STYLE_PACKS.md（風格庫單一事實來源）；原四風格包遷入：學院風、遊戲風保留為擴充包，企業後台風併入 C 現代商務、品牌官網風併入 D 高轉換行銷。
- **CLAUDE.md / AGENTS.md**（兩檔一致）：加入角色系統與風格 / Mobile-first 指路（各 3 行，維持薄入口）。
- **README**：新增「三層架構」與「多角色協作系統」章節；修正過時的「母版刻意保持非 Git」描述（母版現以 Git 記錄版本演進），並提醒複製新專案時勿帶母版 .git。
- **TECH_STACK.md**：指向技術套件與 Swap Checklist。
- **ui-ux-defense SKILL**（.claude + .agents 鏡像同步）：補風格選擇、Mobile-first 硬性摘要、人性化與角色檔指路。

### Sync（防 drift）

- `docs/_目錄說明.md`：新增 ROLE_SYSTEM / STYLE_PACKS / docs/roles/ / docs/tech-packs/ 對照。
- `docs/INIT_PROMPT.md`：檔案清單與角色系統鐵律同步至 v1.5.0。

## v1.4.1（2026-07-10）— 健檢小修補（去重 + 補缺口 + 加一項機器檢查）

> 來源：F5 母版 v1.4.0 架構健檢報告，只取「風險最低、最值得做」的三類，全為 patch 級，無架構變動。

### Changed（消除 SSOT 檔內部重複）

- **AI_RULES §0 整併**：0.2「每一步可驗證」改引用 §9 第 4 點與 §10；0.5「測試驅動」改引用 §10 第 2 點與 `docs/TESTING.md`；0.6「不追求永不犯錯」心法併入 §0 前言後移除。**保留 0.1 / 0.3（禁危險連續指令）/ 0.4（範圍先縮小）原文不動**，編號 0.1~0.5 不重排。目的：SSOT 檔不再自我重複，杜絕同檔 drift。

### Added（護欄與缺口補丁）

- **preflight 第 10 項：入口檔一致性**——`CLAUDE.md` 與 `AGENTS.md` 須完全相同（比照 skills 鏡像），單邊修改即 fail 並印 diff；只存在其一則 skip。堵住健檢發現的「兩入口檔無機器檢查」缺口。
- **DB_DESIGN §8 索引原則**：常用查詢 / 外鍵 / 排序 / 排行榜統計後台欄位應評估建索引，避免 500+ 後全表掃描爆效能；索引變更屬 §5 高風險。
- **SECURITY_CHECKLIST 第 16、17 項**：公開 API / 表單 / 登入 / 上傳 / AI 端點限流防刷；檔案上傳大小 / 格式 / 數量 / 權限限制。
- **BRAND_UI §12 空狀態（Empty State）**：列表 / 卡片 / 表格 / 搜尋結果 / 排行榜 / 後台區塊無資料時必須有明確 empty state。

### Sync（防 drift）

- `docs/_目錄說明.md`、`docs/INIT_PROMPT.md`：SECURITY_CHECKLIST「15 項」→「17 項」。
- 確認 README / TASK_ROUTER 未寫死 preflight 項數或 SECURITY 項數（grep 無命中）；「preflight 第 9 項」相關引用指的是既有金流測試檢查，不受新增第 10 項影響。

## v1.4.0（2026-07-08）— 入口瘦身與 SSOT 收斂

> 來源：學院系統「母版瘦身實測」回流評估（僅回流通用項，特例未納入）。

### Changed（結構收斂）

- **TASK_ROUTER 新增 §0 SKILL 對照表**：skill 對照的單一事實來源（編號/簡稱/名稱/觸發時機）。
- **CLAUDE.md / AGENTS.md 瘦身為薄入口**（36→20 行、兩檔內容一致）：刪內嵌 skill 表與小改/Prototype/中改明細，改指 AI_RULES 與 Router §0；**保留高風險熔斷 2 行**作為常駐 context 最後防線。順修 AGENTS.md `.Codex/skills/` 不存在路徑 bug。
- **CUSTOM_SYSTEM_PROMPT 去重**（83→33 行）：只指路不重抄，保留高風險關鍵字全文；檔頭註明「需 AI 可讀檔」限制。
- **CODE_STANDARDS 資料存取層中性化**：不寫死 `lib/db/`，改「services / repositories / lib/db 擇一並全專案一致」；目錄樹標註為 Next.js 範例。
- **FEEDBACK_LOOP 補 Append-only 原則**：整併採新增結論，不覆蓋舊紀錄。

### Added（護欄）

- **pre-push 工作區乾淨檢查**（build 前）：`git status --porcelain` 非空即擋並顯示 `--short`，不代使用者 add/commit——build 驗證工作區、push 送出 HEAD，不乾淨時「本機綠」≠「推上去綠」。四情境實測通過（乾淨過／未 add 擋／未 commit 擋／untracked 擋）。

### Fixed（測試中發現的既有 bug）

- preflight `existing_dirs()` 在掃描目錄全部不存在時，`set -u` 下空陣列展開報 `unbound variable`（複製到極簡新專案會觸發）。已加守衛，實測歸零。

### Sync（防 drift）

- INIT_PROMPT 四處同步：薄入口描述（含保留高風險 2 行）、雙層 hook（含乾淨檢查）、Router §0、CUSTOM_SYSTEM_PROMPT 指路版。

## v1.3.3（2026-07-08）— 快慢分層（兩則對立回饋整合為一條規則）

> 來源：學院專案 template_feedback.md 兩則同議題回饋——Claude「不跑完整 build 會被
> Vercel 靜默失敗鬼打牆（排版錯誤當 build 失敗且不部署，tsc/dev 抓不到）」vs
> Codex「完整 build 放每次 commit 太重、破壞心流」。整合為一條，不各寫一條（避免雙頭馬車）。

### Added（新增）

- **DEPLOYMENT.md「本機檢查快慢分層」**（規則單一出處）：pre-commit 跑輕量快檢（preflight + tsc --noEmit + eslint，約 5 秒，抓 95% 含排版）；pre-push 跑完整 `npm run build`（攔 Vercel 靜默失敗）。**鐵律：完整 build 放 pre-push、不放 pre-commit。**
- **install-hooks.sh 升級為雙層 hook**：自動安裝 pre-commit（快檢，tsconfig/lint script 存在才跑）與 pre-push（完整 build，無 build script 自動略過；既有 hook 先備份 .bak）。三情境實測通過（壞 build 擋 push／好 build 放行／無 script 略過）。
- **AI_RULES §10 明確定義**：「build」= 專案完整 build 指令，不是只有 tsc --noEmit；詳情指向 DEPLOYMENT.md 快慢分層節。

## v1.3.2（2026-07-06）— 第一次正式回饋回流

> 來源：brownfield 學院專案透過 `logs/template_feedback.md` 正式回流的三則實戰回饋——
> 首次完整走完「察覺→收集→回流」機制。核心發現：**文字規則會衰減，機器檢查會存活**。

### Changed（依回饋修正）

- **AI_RULES §10 加「回報用語協定」**：「完成 / 已部署待驗證 / 已修改待驗證」三詞不得混用；使用者待辦前置步驟必列回報最上方。（回饋：DoD 被系統性放寬，「build 綠+已 push」被當成「完成」）
- **AI_RULES §11 加具體動作標準**：一個功能 = 一個 commit = 一次 push，禁止連續推造成部署空窗 404。（回饋：效率規則反被逐 commit 推違反，重複發生）

### Added（規則機器化）

- **preflight 第 9 項：金流變更無測試提醒**——變更碰到 payment/coupon/point/ledger 等檔案、卻無任何測試變更時黃字提醒（不擋 commit）。（回饋：TESTING「金流必測」因無機器提醒被整批跳過；照學院建議做成軟提醒）
- TESTING.md 同步註明此機器提醒與豁免說明義務。

## v1.3.1（2026-07-06）— 紅隊自我攻擊修正

> 由 F5 對規則做對抗性審查（紅隊思維攻擊自己的設計）後的安全修正。

### Fixed（漏洞封堵）

- **inline `preflight-allow` 繞過漏洞**：原本 inline 標記在任何檔案都生效——可在**新 migration** 危險政策行尾加標記靜默繞過外部白名單審核程序。現在 migration 目錄裡 inline 標記一律無效，只認 `scripts/preflight-allow.txt`；非 migration 檔 inline 照常可用。（實測四情境通過）

### Added（規則機器化）

- **preflight 第 8 項：skills 鏡像一致性檢查**——`.claude/skills` 與 `.agents/skills` 逐檔 diff，分岔即紅燈並附修法。把原本「靠自律」的鏡像同步規則（AI_RULES 第 8 節、事故 #13）變成機器強制；無 `.agents` 的單工具專案自動 skip。

## v1.3.0（2026-07-06）— 固定基準版

> 本版為全面總體檢後的**固定基準版**：之後每個新系統以此版為起點複製。

### Fixed（總體檢修正）

- **skills 雙頭馬車（母版自己踩到 #13）**：`.agents/skills/` 被其他 AI 工具以舊版規格重建、與 `.claude/skills/` 全部分岔。已以 `.claude/` 為權威同步鏡像，並在 AI_RULES 第 8 節對應表新增「改 skill 必同步鏡像」規則。
- **INIT_PROMPT.md 過期**：補齊 v1.2 全部演進（preflight-allow 白名單、FEEDBACK_LOOP、BROWNFIELD_IMPORT、template_feedback、鏡像規則、AI_RULES 第 11 節）。
- **README 過期**：目錄樹補齊 v1.1~v1.2 新增檔案與鏡像說明。

### Added（新增）

- **AI_RULES 第 11 節「自主執行與效率原則」**：規則內自主執行到底、批次回報、省 token、批次回饋；效率永遠讓位於安全。（來源：使用者回饋「來來回回花時間跟額度」）
- **BRAND_UI_SYSTEM 起手式 Design Tokens**：可直接複製的完整 token 集（品牌色/語意色/中性色/字級/間距/圓角/陰影/元件基準，光暗兩套）——小白專案開箱即有一致質感，換品牌只改 primary 系列。
- **README「日常開發只要記住三件事」**：小白日常心智模型收斂成三句話。
- CUSTOM_SYSTEM_PROMPT 貼用版補「自主執行、批次回報」段。

## v1.2.2（2026-07-05）

### Fixed（修正）

- scripts/preflight-allow.txt 檔頭加**重新同步警告**：本檔屬「專案內容」（同 PROJECT_CONTEXT 等回填檔），re-sync 母版時**只合併不覆蓋**——空白版直接覆蓋會洗掉已審核例外、preflight 立刻變紅。
  來源：學院專案 re-sync v1.2.1 時，協作 AI 正確判斷「不可用空白版覆蓋」；把這個判斷固化成白紙黑字，不再靠每次臨場判斷（回饋循環第三圈）。

## v1.2.1（2026-07-05）

### Added / Fixed（新增與修正）

- **外部白名單檔 `scripts/preflight-allow.txt`**：migration 的合法 RLS 例外改用「路徑:行號」外部登記放行。
  修正 v1.1.2 inline `preflight-allow` 的設計矛盾——在 migration 檔加 inline 註記會同時 (a) 違反「migration 只增不改」、(b) 觸發 preflight 檢查 #6「既有 migration 被修改」，等於白名單無法用在它最該用的場景。
  migration 只增不改 → 行號永久穩定，path:line 不漂移，且外部檔可 git 稽核。
- inline `-- preflight-allow` 標記保留給**非 migration 檔**使用；兩種放行機制依檔案類型分工。
- 機密掃描仍不受任何白名單影響（實測：列入白名單的 sk_live 仍被攔）。
- docs/DB_MIGRATION_RULES.md 第 9 條同步：migration 用外部白名單、非 migration 用 inline。
- 來源：brownfield 學院專案協作 AI 回流（回饋循環第二圈）。

## v1.2.0（2026-07-05）

### Added（新增）

- **回饋循環機制內建**：讓真實開發中發現的問題能系統性回流、持續打磨母版。
  - docs/FEEDBACK_LOOP.md — 三階段（察覺→收集→回流）+ 通用/特例判準
  - logs/template_feedback.md — 回饋暫存檔，內附收工用 Retro Prompt
  - CLAUDE.md — 完成較大功能時提醒使用者做一次回饋 retro
- 設計理念：模板從「設計良好」走向「實戰驗證良好」；v1.1.1~v1.1.3 皆來自真實專案回流，證明此循環有效。

## v1.1.3（2026-07-05）

### Added（新增）

- AI_RULES.md 第 8 節新增「**單一事實來源：不得平行維護兩套規範**」：每主題只能有一份權威文件；禁止文件雙頭馬車；brownfield 匯入時指定一份權威、其餘標歷史參考並停止平行維護；發現多份同主題規範須主動提報整併。
- INCIDENT_PREVENTION.md 新增第 13 項「規範文件雙頭馬車」。
- SECURITY_CHECKLIST.md 已於 v1.1.2 加入「設定表/參考表永遠不放機密」（第 6b 項）。

## v1.1.2（2026-07-05）

### Fixed（修正）

- scripts/preflight-check.sh：RLS 語法紅線掃描改為**大小寫不敏感**（`grep -i`）。
  修正原本只抓小寫 `using(true)`、漏掉真實 SQL 常見的大寫 `USING (true)` 的**偵測盲點**——這是一支專門攔 using(true) 的工具最不該有的漏洞。（brownfield 匯入真實專案時,由協作 AI 盤點發現。）

### Added（新增）

- **`preflight-allow` 白名單機制**：公開/參考資料表若確需 `USING (true)`，可在該行加 `-- preflight-allow: <原因>` 標記為「已人工審核放行」，preflight 即放行該行。標記受 git 稽核。
  解決「掃描改嚴格 → 合法政策全被標紅 → 逢 commit 必擋」的兩難：嚴格偵測與可掛 hook 兼得。
- **安全鐵則**：機密掃描（sk_live 等）**不受** `preflight-allow` 影響，標了也照攔——不得用白名單掩護外洩金鑰。
- docs/DB_MIGRATION_RULES.md 第 8~9 條、docs/SECURITY_CHECKLIST.md 第 4/6b 項：同步「敏感表禁 using(true)、公開參考表須審核加標記」規則。

## v1.1.1（2026-07-05）

### Fixed（修正）

- scripts/preflight-check.sh：RLS 語法紅線（using(true)/check(true)/allow_all_anon）與 NEXT_PUBLIC service_role 命名檢查，改為**排除整行註解**（SQL `--`、JS/TS `//`、`#`、`*`）。
  修正 migration/程式裡的「警語型註解」（例如 `-- 禁止使用 using(true)`）被誤判為紅線、導致 preflight 永遠 exit 1 的問題。
  機密掃描（sk_live 等）**不排除註解**——機密就算寫在註解裡也算外洩，仍會攔。
  （此 bug 在 brownfield 匯入真實專案時發現。）

## v1.1.0（2026-07-05）

### Added（新增）

- docs/CODE_STANDARDS.md — 程式結構與寫法規範（目錄結構模板、server/client 邊界、server-only 隔離、資料存取集中 lib/db、錯誤處理、命名、env 集中驗證）
- docs/TESTING.md — 測試策略（金流/權限/交易必測不可豁免、關鍵路徑回歸、手動驗證格式、bug 修復必附重現測試）
- AI_RULES.md 第 10 節「完成的定義（Definition of Done）」— build/測試/preflight/實跑/文件同步全過才可稱「完成」
- CLAUDE.md / CUSTOM_SYSTEM_PROMPT.md — SKILL 快速對照表（中文簡稱 + 數字編號 1~6）
- 模板版本標記機制 — 新專案複製時記錄「基於模板 vX.X.X」
- docs/BROWNFIELD_IMPORT.md — 既有專案匯入說明書（保護現場→只加不蓋→回填現況→健檢不掛槍→交付回報）

### Changed（變更）

- AI_RULES.md 第 5 節「高風險熔斷」細分：改「規則與結構」（schema/RLS/權限/金流寫入/個資寫入/production）= 高風險；用既有表與既有 RLS 做一般 CRUD = 中改，避免流程過嚴被疲勞繞過
- TASK_ROUTER.md 開頭新增通用規則：寫程式一律加讀 CODE_STANDARDS.md，完成標準見 AI_RULES 第 10 節
- CLAUDE.md / CUSTOM_SYSTEM_PROMPT.md 補 DoD 導引；skill 觸發措辭改為工具中立的「讀取對應 SKILL.md」
- INIT_PROMPT.md 同步至 v1.1 全部內容（install-hooks、_目錄說明、CODE_STANDARDS、TESTING、DoD、高風險細分、數字對照）

## v1.0.0

### Added（新增）

- CLAUDE.md — 自動載入進入點（導向 Router）
- TASK_ROUTER.md — 任務路由表
- AI_RULES.md — AI 開發總規則與單一事實來源
- CUSTOM_SYSTEM_PROMPT.md — 日常開發短版提示詞
- TECH_STACK.md — 技術棧模板
- PROJECT_CONTEXT.md — 專案背景模板
- FEATURE_MAP.md — 功能地圖模板
- DB_DESIGN.md — 資料庫設計模板
- DB_MIGRATION_RULES.md — 資料庫 migration 規範
- SECURITY_CHECKLIST.md — 安全檢查表
- TRANSACTION_RULES.md — 交易與冪等規範
- INCIDENT_PREVENTION.md — 歷史重大 Bug 防範
- OBSERVABILITY.md — 監控、log、備份與還原規範
- BRAND_UI_SYSTEM.md — 品牌與樣式系統
- UX_GUIDELINES.md — UX、轉化率與後台編輯器規範
- DEPLOYMENT.md — 部署規範
- TROUBLESHOOTING.md — 常見問題排查
- INIT_PROMPT.md — 本模板完整初始化提示詞（可重複使用）
- _目錄說明.md — 英文檔名 ↔ 中文對照表（側邊欄中文導覽）
- Prototype Mode — 原型快速模式
- 文件同步熔斷規則
- .gitignore
- .env.example
- scripts/preflight-check.sh — 機器護欄紅線掃描
- scripts/install-hooks.sh — 把 preflight 掛成 pre-commit hook（新專案用）
- .claude/skills/ — Claude Code Custom Skills（6 個）

### Design（設計理念）

- 建立「第一次初始化完整規範，日常依任務讀文件」的 AI 開發模式。
- CLAUDE.md 作為自動進入點，router-first 自動生效。
- AI_RULES.md 作為單一事實來源。
- Router 與 Skills 只引用規則，不重抄，避免文件互相過期。
- Skills 置於 .claude/skills/，可被 Claude Code 自動探索與觸發。
- 避免每天貼超長 Prompt。
- 降低 token 消耗。
- 降低 AI 注意力衰減。
- 降低文件過期導致 AI 誤判的風險。
- 用機器護欄補強人工規範。
- 提升安全、效能、UX、監控與商用穩定度。

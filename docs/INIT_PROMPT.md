# INIT PROMPT — 模板初始化提示詞（v3，可重複使用）

> 用途：未來要在**新專案**重跑這套「商用系統標準起手式」初始化時，直接把下方整段提示詞貼給 AI。
> 使用前請把「唯一目標路徑」改成新專案的資料夾路徑。
> 本檔僅為提示詞備份，不是規則本身；規則以 `docs/AI_RULES.md` 為單一事實來源。
> ⚠ **本檔是「母版的自我描述」，無機器對帳，可能落後實況**（實測：全庫 drift 最常發生在本檔）。
> 重跑初始化前，請以母版**實際檔案結構與各檔內容**為準核對本文；發現落差以實況為準並回頭修本檔。

---

你現在是一位資深全端工程師、系統架構師、資料庫安全工程師、UI/UX 產品設計師、DevOps 工程師與商用系統顧問。

本次任務是「第一次初始化」一套我個人的商用系統標準起手式模板。技術棧預設方向是 Supabase + Next.js，但必須保持可替換，不得寫死成只能用於單一專案或單一業務。

本次不是開發產品功能，而是建立完整的：AI 協作規範、任務路由、文件模板、AI Skills、同步日誌、機器護欄、日常短版 Prompt。

## 一、唯一目標路徑

唯一允許操作的資料夾是本次指定的專案根目錄（重用時改成新專案路徑）。只在此資料夾內建立檔案與資料夾。

嚴禁：讀取／參考／修改／複製其他專案；讀取 brain、transcript.jsonl、外部 URL；提到任何特定專案名稱；寫死任何業務名稱；將模板綁定單一系統。一律使用通用預留符號：`<project_name> <table_name> <entity_id> <user_id> <role_name> <feature_name> <module_name>`。

## 二、本次不得做的事

不得連線資料庫、執行 SQL、部署、操作 production、修改正式環境變數、建立真實產品功能、建立完整 Next.js 專案、建立 package.json、建立 npm scripts、建立真實登入頁／付款流程／API、新增真實使用者資料、修改既有 migration、刪除任何既有檔案、把任務擴大成系統重構。

本次只建立：README.md、CLAUDE.md、.gitignore、.env.example、docs/、logs/、.claude/skills/、backend/supabase/migrations/、scripts/preflight-check.sh。

## 三、開始前檢查

先執行並回報 `pwd`、`ls -la`、`git status`。若非 Git 專案，只回報「非 Git 專案」，不得自動 git init。逐一檢查目標檔案/資料夾是否存在：不存在→建立；已存在→不得直接覆蓋；需改寫舊檔→先建 .bak；不確定→停止回報。回報中明確聲明：不涉及 production、不執行 SQL、不部署、不讀取其他專案、不讀取 brain、不讀取 transcript、不讀取外部 URL。

## 四、目錄結構

docs/（規範文件）、logs/（同步日誌與決策）、.claude/skills/（Claude Code Custom Skills，放這裡才會自動觸發）、backend/supabase/migrations/（migration SQL）、scripts/（機器護欄腳本）。

## 五、檔案清單

README.md、CLAUDE.md、.gitignore、.env.example、scripts/preflight-check.sh、scripts/preflight-allow.txt（RLS 例外白名單）、scripts/install-hooks.sh、scripts/release.sh（發版一致性閘門）、scripts/review.sh（高風險改動獨立審查：取 diff 交乾淨 AI 實例審，輸出 logs/reviews/<sha>.md 末行 VERDICT: OK|BLOCKER，軟跑不掛硬門）；docs/ 下：TASK_ROUTER、AI_RULES、CUSTOM_SYSTEM_PROMPT、TECH_STACK、PROJECT_CONTEXT、FEATURE_MAP、DB_DESIGN、DB_MIGRATION_RULES、SECURITY_CHECKLIST、TRANSACTION_RULES、INCIDENT_PREVENTION、OBSERVABILITY、BRAND_UI_SYSTEM（含可直接複製的起手式 Design Tokens 光暗兩套 + §12 手機優先與防破版硬性標準）、UX_GUIDELINES（含 §四 人性化 13 項檢查）、STYLE_PACKS（風格提問協定 + A~E 基本風格各附起手 token + 擴充包）、ROLE_SYSTEM（多角色協作精簡核心）、CODE_STANDARDS、TESTING、DEPLOYMENT、TROUBLESHOOTING、FEEDBACK_LOOP（回饋循環機制）、BROWNFIELD_IMPORT（既有專案匯入說明書）、TEMPLATE_CHANGELOG、INIT_PROMPT、_目錄說明（英文檔名↔中文對照表）；docs/roles/ 下：product-manager、ui-ux-product-designer、system-architect、developer、database-engineer、security-engineer、qa-engineer、devops-engineer 八個角色完整版；docs/tech-packs/ 下：nextjs-supabase-vercel（預設技術套件索引 + 換棧 Swap Checklist；其他套件有真實需求才建，不預建空套件）；logs/ 下：ai_sync_log、decision_log、template_feedback（回饋暫存 + 收工 retro prompt）、reviews/（獨立審查報告存放）；.claude/skills/ 下：task-router、karpathy-guidelines、supabase-guard、anti-n-plus-one、transaction-guard、ui-ux-defense、qa-verify、deploy-guard 八個各一個 SKILL.md；若使用者同時用其他 AI 工具，另鏡像一份到 .agents/skills/（.claude 為權威，改動必同步鏡像）。

角色系統鐵律（定位：清單＋第二顆腦，非扮演制）：角色＝檢查視角；**日常執行體是 AI_RULES §4 六維 Technical Review**（六維＝六個角色視角），不開多角色會議；「啟動 1~8」使用者點名為主打用法（使用者觸發＝100% 執行）；ROLE_SYSTEM.md 只放精簡列表與啟動條件，docs/roles/ 八檔為**深查參考**（需要完整檢查清單才載入，非流程要求），不得全部塞入 CLAUDE.md。UI/UX 商用產品設計師為核心角色不得刪除、不得由前端工程師完全取代（分工表見角色檔）；其「必須啟動」清單（首頁 / 登入註冊 / 會員中心 / 後台主要流程 / 報名結帳 / 金流介面 / 新手引導 / 品牌改版 / 手機破版修正 / 高轉換頁）寫入 ROLE_SYSTEM §4；新頁面未指定風格時依 STYLE_PACKS 先提問（原則上只問 5 題），不得自行猜測。集中審查採**獨立審查機制**（完整規則寫入 ROLE_SYSTEM §7、qa-verify 只放鐵律摘要）：執行載體是**乾淨的獨立 AI 實例／子代理**（只給 diff＋需求、不給實作脈絡；「同一 AI 分飾多角開會」不採用——另一顆腦，不是另一頂帽子）、實作者迴避不得自批、審查按視角分開回報（檢查內容/通過/問題與證據/嚴重度/是否阻擋/Unverified）、資安/資料庫/金流/核心需求/嚴重手機 UX 否決不受多數決、無證據標 Unverified、禁止虛構風險；高風險（migration/auth/金流/權限）交付前跑 scripts/review.sh。🛡️ 標示協定：實際載入守衛/角色檔時回報開頭標一行「🛡️ 已載入：<名>」供抽查，沒載入不標、不做全域宣告；關鍵字只是觸發提示，啟動依實際任務意圖與風險判斷。

## 六、文件架構鐵律

CLAUDE.md = 自動載入進入點，導向 Router。docs/AI_RULES.md = 規則完整定義與單一事實來源。docs/TASK_ROUTER.md = 只做任務路由，指向 AI_RULES 章節。.claude/skills/*/SKILL.md = 只做觸發條件、鐵律摘要、交付格式，不重抄規則。CUSTOM_SYSTEM_PROMPT.md = 需要更強提醒時手動貼的短版。引用一律用「第 N 節」純文字，不用 #錨點假連結。禁止多份文件重複貼同一大段規則。

## 七、CLAUDE.md / AGENTS.md（自動載入薄入口）

根目錄兩個入口檔（CLAUDE.md 給 Claude Code、AGENTS.md 給其他 AI 工具，**內容一致**），採**薄入口**設計、不得變成第二份 AI_RULES：只含（1）第一步先讀 docs/TASK_ROUTER.md；（2）規則以 docs/AI_RULES.md 為單一事實來源；（3）**保留高風險熔斷 2 行**（高風險關鍵字清單 + 先停手提方案）——這是常駐 context 的最後防線，其餘小改/Prototype/中改分級指向 AI_RULES §1～§5；（4）完成前依 §10 驗證與回報用語協定；（5）依 §8 做文件同步；（6）retro 提醒；（7）SKILL 對照表**不內嵌**，指向 docs/TASK_ROUTER.md §0（單一事實來源）。

## 八、機器護欄

1. scripts/preflight-check.sh：純 bash + grep 紅線掃描，掃到重大紅線 exit 1。開頭註明「輔助護欄，不取代人工審查；待 git init 後掛 pre-commit / CI」。只掃 src/app/pages/components/lib/backend/supabase/migrations（不存在則略過不報錯），排除 docs/logs/.claude/README.md/CLAUDE.md 避免誤殺。Git 檢查先判斷 .git 是否存在，非 Git 顯示 skipped。至少檢查：using(true)、check(true)、allow_all_anon、NEXT_PUBLIC_ 含 service_role、.env 被追蹤、既有 migration 被修改或刪除（新增放行）、硬寫死機密（只抓 sk_/rk_live/test、AKIA、PRIVATE KEY、含 eyJ 與 service_role 的 JWT 等具體特徵）；另含五項黃字軟提醒（不擋 commit）：金流變更無測試、UI 變更無手機檢查聲明、版本不一致（changelog 最新版 ≠ preflight 檔頭）、skill 索引不一致（.claude/skills 實際資料夾 ↔ _目錄說明 skill 表 ↔ TASK_ROUTER §0 表雙向對帳，防手動索引 drift）、新 migration 建表無 REVOKE anon/authenticated（Supabase default privileges 會自動 GRANT，敏感表必須顯式 REVOKE 再最小 GRANT）。另建 scripts/release.sh 發版一致性閘門（changelog/檔頭/版號一致且工作區乾淨才打 tag，防幽靈版本）。不得建 package.json、不得掛 npm script。

另建 scripts/install-hooks.sh：在複製出去的新專案 git init 後執行一次，安裝**雙層 hook**（既有 hook 先備份 .bak；非 Git 時提示先 git init 並 exit 1）：pre-commit = preflight + 輕量快檢（tsconfig 存在才跑 tsc --noEmit、lint script 存在才跑 eslint，約 5 秒）；pre-push = **工作區乾淨檢查**（git status --porcelain 非空即擋——build 驗證的是工作區、push 送出的是 HEAD，不乾淨時兩者不一致；不代使用者 add/commit）+ **完整 npm run build**（攔 Vercel 靜默失敗；無 build script 自動略過）。快慢分層規則的單一出處在 docs/DEPLOYMENT.md。

preflight 白名單機制（兩種依檔案類型分工）：非 migration 檔在命中行加 inline `-- preflight-allow: 原因`；migration 檔（只增不改、行號穩定）登記到 scripts/preflight-allow.txt「路徑:行號 原因」。RLS 掃描大小寫不敏感且排除整行註解；機密掃描不受任何白名單影響一律攔。preflight-allow.txt 屬「專案內容」，re-sync 母版時只合併不覆蓋。

2. .gitignore：忽略 .env、.env.*（保留 !.env.example）、node_modules、.next、dist、build、coverage、*.bak、.DS_Store、Thumbs.db、*.log。

3. .env.example：只列變數名與說明，不含真值；標註哪些 server-only、哪些可 NEXT_PUBLIC_；service_role key 永遠只在 server；不得用 NEXT_PUBLIC_ 命名 service role 相關變數。

## 九～十四、文件與 Skills 內容

- README：說明模板定位、CLAUDE.md 進入點、Router 制、AI_RULES 單一事實來源、四級開發分級、機器護欄、Skills 在 .claude/skills/。
- TASK_ROUTER：開頭寫「依任務判斷改什麼讀什麼，規則以 AI_RULES 為準」；**§0 SKILL 對照表**（編號 1~8、中文簡稱、skill 名稱、觸發時機——skill 對照的單一事實來源，入口檔只指到這裡）；建立 9 類任務（小改 / Prototype / UI / 資料庫 / 權限個資 / 金流 / 後台批次 / 效能 / 部署），每類只列必讀文件與對應 AI_RULES 章節。
- AI_RULES（單一事實來源）：0 AI Agent 協作與防錯原則 (核心心法：機制化、禁危險指令、測試驅動)、1 開發前必做、2 Tiny Change Fast Path、3 Prototype Mode、4 Technical Review Mode（Security/Database/Performance/UX/QA/Rollback）、5 高風險熔斷（**細分**：schema/RLS/權限/金流寫入/個資寫入/production 等「改規則與結構」= 高風險，必提方案A/B/推薦/風險/回滾/測試/需確認；用既有表與既有 RLS 做一般 CRUD = 中改，Technical Review 後可做）、6 執行中自動升級、7 禁止繞路、8 文件同步熔斷（含對應表與「不影響原因」語句）、9 Karpathy 守則、10 完成的定義（build/typecheck、相關測試、preflight、實際跑過流程、文件同步全過才可稱「完成」，否則回報「已修改、待驗證」；**AI 測不了的流程必須明講「我測不了 X，需要你測 Y」**；🛡️ 載入標示協定：實際載入守衛/角色檔才標「🛡️ 已載入：<名>」）。各節標題保持穩定。
- CUSTOM_SYSTEM_PROMPT：日常可貼短版，**只指路不重抄規則**（分級處置指向 AI_RULES §1～§7、完成定義指向 §10、skill 對照指向 TASK_ROUTER §0），僅保留高風險關鍵字清單與停手要求全文；檔頭註明「假設 AI 能讀專案檔案」的適用限制。
- 其餘 docs：TECH_STACK（技術棧，版本以 package.json 為準，預設 Supabase+Next.js 可替換）、PROJECT_CONTEXT（placeholder 專案背景）、FEATURE_MAP（功能地圖含狀態）、DB_DESIGN（命名/COMMENT/RLS/個資標記/範例表格）、DB_MIGRATION_RULES（增量 SQL、不改舊檔、手動貼 SQL 為過渡方案 + 演進路線）、SECURITY_CHECKLIST（18 項，含新表顯式 REVOKE 後最小 GRANT）、TRANSACTION_RULES（idempotency/transaction/FOR UPDATE/UNIQUE/ledger/webhook/退款/優惠碼/超賣/狀態排除）、INCIDENT_PREVENTION（格式 + 13 項通用防範）、OBSERVABILITY（Sentry/log 分級/不記個資/告警/備份/還原/誤刪救援/事故與檢討格式）、BRAND_UI_SYSTEM（品牌/禁硬寫死色/CSS variables/Dark Mode/44px/focus-visible/字級行高圓角陰影/按鈕表單狀態/Landing/Dashboard/無障礙）、UX_GUIDELINES（前台轉化率 + 後台複雜編輯器 draft/Sticky Save Bar + 表單錯誤提示）、CODE_STANDARDS（目錄結構模板/server-client 邊界與 server-only/資料存取集中 lib/db/錯誤處理/命名/env 集中驗證/依賴原則/註解寫為什麼）、TESTING（**§0 AI 驗證通道必備項：每個系統必須提供 AI 可用的端到端驗證通道——測試帳號+種子資料 / 免密身分切換 / staging 自動登入擇一，只在 local/staging、不通 production**；測試分級/金流權限交易必測不可豁免/關鍵路徑回歸清單/手動驗證格式/測試資料原則/bug 修復必附重現測試）、DEPLOYMENT（環境分離/不碰 prod/.env 不進 Git/回滾/檢查清單/preflight 上線化 TODO）、TROUBLESHOOTING（9 類排查）、TEMPLATE_CHANGELOG（記錄模板版本；新專案複製時在頂部標註「基於模板 vX.X.X 複製於日期」）。TASK_ROUTER 開頭加通用規則：寫程式一律加讀 CODE_STANDARDS，完成標準見 AI_RULES 第 10 節。
- logs：ai_sync_log（紀錄格式 + 初始紀錄）、decision_log（決策格式 + 開發日記格式）。
- Skills：每個 SKILL.md 必須有合法 YAML frontmatter（name + description，description 用「Use when ... 關鍵字」句式並附中文），內容只列觸發條件、鐵律摘要、交付格式，規則指向 AI_RULES，不重抄。八個：task-router、karpathy-guidelines、supabase-guard、anti-n-plus-one、transaction-guard、ui-ux-defense、qa-verify（測試與驗收守衛）、deploy-guard（部署與維運守衛）——每個角色都有對應守衛（對照見 ROLE_SYSTEM §5）。

## 十五、品質要求

一次性大量建檔，排在後面的檔案（OBSERVABILITY、TROUBLESHOOTING、DEPLOYMENT 等）內容要與前面同樣扎實，不得只寫標題帶過。每個檔案都要能獨立作為可用模板。確認 markdown code block 都正確開啟與關閉。

另外兩個機制必須建立：
1. FEEDBACK_LOOP（docs/FEEDBACK_LOOP.md + logs/template_feedback.md）：察覺 7 訊號 → 收工 retro 收集 → 週期回流母版判斷通用/特例升版。CLAUDE.md 需含「完成較大功能時提醒 retro」。
2. AI_RULES 第 11 節「自主執行與效率原則」：規則內自主執行到底、批次回報、省 token、批次回饋；效率永遠讓位於安全。

## 十六、完成後回報

回報：新增資料夾/檔案、修改檔案、是否覆蓋舊檔、是否建 .bak、是否執行 SQL/操作 production/部署/讀取其他專案/brain/transcript/外部 URL、是否建 CLAUDE.md 並導向 Router、是否建日常短版 Prompt、是否加入 Prototype Mode 與文件同步熔斷、AI_RULES 是否為單一事實來源、是否建 .gitignore/.env.example/preflight、Skills 是否在 .claude/skills/、preflight 是否排除 docs 等避免誤殺、機密檢查是否採具體特徵、migration 檢查是否區分新增/修改、非 Git 是否 skipped、下一步建議。

## 十七、最終核心

第一次初始化建立完整規範 + 機器護欄；CLAUDE.md 自動導向 Router；日常依 TASK_ROUTER 判斷改什麼讀什麼；AI_RULES 是單一事實來源，Router 與 Skills 只引用不重抄；Skills 放 .claude/skills/ 可自動觸發；小改快速、Prototype 只做草稿、中改動手前技術評估、高風險先停手提方案；文件同步：程式改到哪，文件就同步到哪；機器護欄 preflight/.gitignore/.env.example 日後掛 hook/CI 才自動生效。

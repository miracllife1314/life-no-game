# AI Sync Log — AI 同步日誌

## 紀錄格式

### 日期：
### 修改者：
### 任務目標：
### 任務類型：
小改 / Prototype / 中改 / 大改 / 高風險 / 初始化

### 必讀文件：
### 修改檔案：
### 是否影響資料庫：
### 是否影響 RLS：
### 是否影響權限：
### 是否影響 production：
### 是否影響 UI / UX：
### Mobile check: （涉及 UI 檔案變更時必填——將本行括號改為 verified / unverified / not-applicable 其一，preflight 第 11 項會核對）
### 是否同步更新 docs：
### 若未更新 docs，原因：
### 測試方式：
### 風險提醒：
### 下一步：




## 紀錄：2026-07-22（期數結束判斷集中化 + 修正後台早一天顯示已結束）

### 日期：2026-07-22
### 修改者：AI (Claude Opus 4.8)
### 任務目標：查證前一批「任務到期/排行封印/期數已結束」修正，修掉後台比學員端早一天顯示「已結束」的矛盾，並把「期數是否結束」集中成唯一判斷來源。
### 任務類型：小改
### 必讀文件：
- logs/ai_sync_log.md
### 修改檔案：
- lib/batchStatus.ts [ADD]（新增：全站唯一的期數結束判斷）
- components/Admin/tabs/BatchesTab.tsx [MODIFY]（原本 `今天 >= 結束日` 就標已結束，比學員端早一天；改走共用函式）
- components/Admin/tabs/TeamsTab.tsx [MODIFY]（改用共用函式）
- components/Tabs/DailyQuestsTab.tsx [MODIFY]（改用共用函式）
### 是否影響資料庫：否（僅顯示邏輯；期數 status 欄位未變更）
### 是否影響 RLS：否
### 是否影響權限：否
### 是否影響 production：否（僅本機檔案，未部署、未執行任何 SQL）
### 是否影響 UI / UX：是（狀態標籤文字會依日期改變，未調整版面/樣式）
### Mobile check: not-applicable
（理由：僅變更狀態判斷邏輯與標籤文字，無任何版面、尺寸或樣式調整。）
### 是否同步更新 docs：否
### 若未更新 docs，原因：屬既有功能之一致性修正，未新增對外規格。
### 測試方式：
1. `npx tsc --noEmit` → 0 錯誤。
2. 以真實期數資料驗證：11期(end 2026-07-14)、49期(end 2026-07-21) → 已結束；Batch 50(draft) → 草稿。
3. 邊界驗證：結束日「當天」仍為進行中、「隔天」才轉已結束。
### 風險提醒：
1. 11 期、49 期資料庫的 `status` 仍為 `active`，畫面雖已正確顯示「已結束」，但資料本身尚未補正（編輯下拉、外部取用仍會看到 active）。
2. ⚠️ 本專案與 NLP_GAME 共用同一組 Supabase（測試庫 lwynbnphzpmbcawqvycy／正式庫 epolsiukauqfwxmjojia）。若要補正期數 status，會同時影響另一個專案的站台，須先評估。
### 下一步：
決定是否將已過期期數的 `status` 補正為 `ended`（建議先測試庫，並確認不影響 NLP_GAME 正在進行的驗證）。

---

## 紀錄：2026-07-22（母版 v1.9.0 — 專案升級與母版機制同步）

### 日期：2026-07-22
### 修改者：AI (Antigravity)
### 任務目標：修復任務到期隱藏、倒數 7 天排行榜自動封印、期數時間到自動轉為已結束、`parseTaipeiEnd` 時間解析優化，並同步專案母版版本至 v1.9.0。
### 任務類型：母版升級
### 必讀文件：
- docs/TEMPLATE_CHANGELOG.md
- scripts/preflight-check.sh
### 修改檔案：
- [DailyQuestsTab.tsx](file:///Users/leo/Desktop/定課系統/Life_no_game/components/Tabs/DailyQuestsTab.tsx) [MODIFY]
- [LeaderboardTab.tsx](file:///Users/leo/Desktop/定課系統/Life_no_game/components/Tabs/LeaderboardTab.tsx) [MODIFY]
- [BatchesTab.tsx](file:///Users/leo/Desktop/定課系統/Life_no_game/components/Admin/tabs/BatchesTab.tsx) [MODIFY]
- [TeamsTab.tsx](file:///Users/leo/Desktop/定課系統/Life_no_game/components/Admin/tabs/TeamsTab.tsx) [MODIFY]
- [time.ts](file:///Users/leo/Desktop/定課系統/Life_no_game/lib/time.ts) [MODIFY]
- [dailyQuestLogic.ts](file:///Users/leo/Desktop/定課系統/Life_no_game/lib/dailyQuestLogic.ts) [MODIFY]
- [TEMPLATE_CHANGELOG.md](file:///Users/leo/Desktop/定課系統/Life_no_game/docs/TEMPLATE_CHANGELOG.md) [MODIFY]
- [preflight-check.sh](file:///Users/leo/Desktop/定課系統/Life_no_game/scripts/preflight-check.sh) [MODIFY]
- [ai_sync_log.md](file:///Users/leo/Desktop/定課系統/Life_no_game/logs/ai_sync_log.md) [MODIFY]
### Mobile check: verified
### 測試方式：npx tsc --noEmit (0 錯誤) + preflight-check.sh (通過)。

---

## 紀錄：2026-07-16（大改：v1.7.0 一週實戰回流——角色系統重定位 + AI 驗證通道 + 索引/GRANT 機器對帳）

### 日期：2026-07-16
### 修改者：AI (Claude)
### 任務目標：執行 FEEDBACK_LOOP 階段三回流——處理學院專案 template_feedback.md 全部「未回流」條目（R1~R8 建議書、2026-07-09 GRANT 安全條目、2026-07-08 三則）。
### 任務類型：大改（含 preflight 高風險改動——已先提方案＋測試情境＋回滾，經使用者確認：R4 雙文件對帳✓、GRANT 提醒✓、R7 否決留候選）

### 必讀文件：
docs/TASK_ROUTER.md、docs/AI_RULES.md、docs/ROLE_SYSTEM.md、docs/FEEDBACK_LOOP.md、
docs/TESTING.md、docs/DB_MIGRATION_RULES.md、docs/SECURITY_CHECKLIST.md、
/Users/leo/ＮＬＰ學院系統/logs/template_feedback.md（回饋來源）

### 修改檔案：
- docs/AI_RULES.md（§0.3 禁 git add .、§4 六維升格執行體、§5 review.sh 指路、§10 🛡️ 載入標示協定＋測不了要明講、§11 迭代補註、§12 獨立審查載體）
- docs/ROLE_SYSTEM.md（§1 重定位、§3 中改/高風險流程、§5 主打用法、§7 全面改寫為乾淨實例獨立審查）
- docs/TASK_ROUTER.md（§0 主打用法＋對帳註記、§0.5 深查參考）
- docs/TESTING.md（§0 AI 驗證通道必備項）
- docs/DB_MIGRATION_RULES.md（鐵律 12 REVOKE 收斂）
- docs/SECURITY_CHECKLIST.md（第 18 項）
- docs/BROWNFIELD_IMPORT.md（驗證通道盤點項、skill 數 6→8、複製清單補齊）
- docs/_目錄說明.md（熱/冷欄、對帳標註、reviews/、review.sh、項數補正）
- docs/FUTURE_BACKLOG.md（第 4 項：R7 行數提醒候選）
- docs/INIT_PROMPT.md、docs/CUSTOM_SYSTEM_PROMPT.md、README.md、CLAUDE.md、AGENTS.md（同步）
- docs/TEMPLATE_CHANGELOG.md（v1.7.0 條目）
- .claude/skills/qa-verify/SKILL.md、.claude/skills/supabase-guard/SKILL.md（＋.agents 鏡像同步）
- scripts/preflight-check.sh（第 13 項索引一致性、第 14 項 GRANT 提醒；檔頭 v1.7.0）
- scripts/review.sh（新增）、logs/reviews/.gitkeep（新增）

### 是否影響資料庫 / RLS / 權限 / production：否（純規範與腳本，未執行 SQL、未部署）
### 是否影響 UI / UX：否
### Mobile check: not-applicable
### 是否同步更新 docs：是（見上；CLAUDE.md＝AGENTS.md 已 diff 驗證一致）
### 測試方式：
1. preflight 乾淨態通過（exit 0）。
2. 第 13 項六情境實測：漏列（目錄說明＋Router）／幽靈條目（目錄說明＋Router）黃字、乾淨綠、無誤殺。
3. 第 14 項三情境實測：建表無 REVOKE 黃字／有 REVOKE 綠／僅 function 靜默。
4. review.sh 端到端實測：沙盒 repo 放「無 RLS＋grant all」migration，乾淨實例正確回 VERDICT: BLOCKER（exit 1）；docs-only diff 正確放行；bash -n 語法通過。
### 風險提醒：
- review.sh 為軟跑階段：不掛 pre-push 硬門，1~2 週統計真問題/誤報/拖慢後由使用者決定升級。
- 既有專案（學院）re-sync 時：preflight-allow.txt 只合併不覆蓋；角色系統重定位屬行為變更，建議先讀 v1.7.0 changelog 再對齊。
### 下一步：commit → scripts/release.sh v1.7.0 打 tag → push；學院專案把已回流條目標「是」。

### 補記（2026-07-16 發版前體檢＋外部獨立審查）：
使用者要求全庫檢查。機械 grep 抓到 3 個舊 drift（INIT_PROMPT skill 清單 6→8、README 對照表指路、security-engineer 17→18 項）；
dogfood 跑 scripts/review.sh --force 交乾淨實例審 v1.7.0 diff → VERDICT: OK（報告 logs/reviews/1bc4df6.md），
另抓到實作者自漏的 INIT_PROMPT「12→13 項」＋三項 Low 建議（#14 文案弱化、review.sh 硬門前決策點、--force 顯示）——全部已修正併入 v1.7.0 重打 tag。
另依使用者「幫我優化」指示：設定 git identity（定洋 / miracllife1314@gmail.com，兩筆未推 commit 一併 reset-author 重寫）；
INIT_PROMPT 檔頭加「本檔無機器對帳、可能落後實況」標註（R8 二選一，體檢實證它是全庫最易 drift 的檔案）。

---

## 紀錄：2026-07-12（小改：修正母版舊路徑「萬用AI系統開發」→「2版」）

### 日期：2026-07-12
### 修改者：AI (Claude)
### 任務目標：修正 BROWNFIELD_IMPORT.md 可執行絕對路徑漏「2版」的 bug，並統一兩處散文暱稱。
### 任務類型：小改（Tiny Change，純字串修正）

### 修改檔案：
- docs/BROWNFIELD_IMPORT.md（第 10 行匯入指令路徑 → 萬用AI系統開發2版）
- docs/FEEDBACK_LOOP.md（母版暱稱補 2版）
- logs/template_feedback.md（母版暱稱補 2版）

### 是否影響資料庫 / RLS / 權限 / production：否
### 是否影響 UI / UX：否
### Mobile check: not-applicable
### 是否同步更新 docs：是（本次即為文件修正）
### 測試方式：全庫掃描確認無殘留舊路徑（changelog 歷史紀錄保留不動）；preflight 通過。
### 風險提醒：無。未動任何規則邏輯。
### 下一步：commit 並 push 到 GitHub。

---

## 紀錄：2026-07-12（修正：補正 v1.6.2 版本文件，消除「tag 存在但文件無此版」落差）

### 日期：2026-07-12
### 修改者：AI (Claude)
### 任務目標：前次已打 v1.6.2 git tag 卻未在 changelog 記錄、preflight 檔頭仍標 v1.6.0——學院系統 re-sync 時正確抓到此落差並拒絕謊標。補正文件使 v1.6.2 成為真版本。
### 任務類型：小改（版本文件補正）

### 修改檔案：
- docs/TEMPLATE_CHANGELOG.md（新增 v1.6.2 條目，記錄路徑修正）
- scripts/preflight-check.sh（檔頭 v1.6.0 → v1.6.2）
- 將 v1.6.2 tag 前移至本 commit（原指向缺 changelog 的 commit）

### 是否影響資料庫 / RLS / 權限 / production：否
### 是否影響 UI / UX：否
### Mobile check: not-applicable
### 是否同步更新 docs：是
### 測試方式：preflight 通過；grep 確認 changelog 與檔頭皆為 v1.6.2。
### 風險提醒：v1.6.2 tag 前移一個 commit（自有備份、剛建立、無共享歷史），以 --force 推該 tag。
### 下一步：學院系統 re-sync 目標版本為 v1.6.2（文件已一致）。

---

## 紀錄：2026-07-12（母版 v1.6.3：版本一致性機器化，防「幽靈版本」再發生）

### 日期：2026-07-12
### 修改者：AI (Claude)
### 任務目標：把 v1.6.2 事故（tag 存在但文件無此版）的防範改為機器強制，杜絕版本號散落三處而分岔。
### 任務類型：中改（機器護欄新增）

### 修改檔案：
- scripts/preflight-check.sh（新增第 12 項版本一致性；檔頭 v1.6.2 → v1.6.3）
- scripts/release.sh（新增：發版一致性閘門，五項全滿足才打 tag）
- docs/TEMPLATE_CHANGELOG.md（v1.6.3 條目）
- docs/_目錄說明.md、docs/INIT_PROMPT.md（同步 release.sh 與第 12 項）

### 是否影響資料庫 / RLS / 權限 / production：否
### 是否影響 UI / UX：否
### Mobile check: not-applicable
### 是否同步更新 docs：是
### 測試方式：
1. preflight 第 12 項：changelog v1.6.3 == 檔頭 v1.6.3 → 綠燈（實測）。
2. release.sh 三個閘門實測擋下：格式錯、無參數、工作區髒。
3. bash -n 兩支腳本語法通過。
### 風險提醒：無。第 12 項為黃字軟提醒不擋 commit；release.sh 不 commit 不 push。
### 下一步：以 release.sh v1.6.3 打 tag（示範新流程）、push。

---

## 紀錄：2026-07-12（母版 v1.6.1：外部審查修正 + 收尾）

### 日期：2026-07-12
### 修改者：AI (Claude)
### 任務目標：依 v1.6.0 外部審查修正（手機檢查三態化 / 風格 D 對比 / 規則預算引用），加三項收尾（sync log 欄位 / 短版提示詞 / git tag）。
### 任務類型：中改（護欄修正 + 文件收尾）

### 修改檔案：
- scripts/preflight-check.sh（第 11 項三態標記，廢除模糊關鍵字）
- docs/STYLE_PACKS.md（D：#c2410c / hover #9a3412，白字對比 5.18 / 7.31）
- docs/FEEDBACK_LOOP.md（規則預算引用 AI_RULES §0.1）
- logs/ai_sync_log.md（紀錄格式加 Mobile check: 欄）
- docs/CUSTOM_SYSTEM_PROMPT.md（補角色系統與獨立審查兩行）
- docs/TEMPLATE_CHANGELOG.md（v1.6.1）

### 是否影響資料庫 / RLS / 權限 / production：否
### 是否影響 UI / UX：規範與 token 預設值修正，未改任何實際畫面程式
### Mobile check: not-applicable
### 是否同步更新 docs：是
### 測試方式：
1. 三態 + 否定聲明 + 舊關鍵字 + 無 UI 共六情境，乾淨 git 狀態實測全過（第一輪污染測試作廢重測）。
2. 風格 D 對比以 WCAG 公式實算：5.18:1 / 7.31:1。
3. preflight 全綠；入口檔與 skills 鏡像一致。
### 風險提醒：無。
### 下一步：打 git tag（v1.4.1 起）；使用者建立 GitHub private repo 後 push。

---

## 紀錄：2026-07-12（母版 v1.6.0：評分回饋優化批次 2~6）

### 日期：2026-07-12
### 修改者：AI (Claude)
### 任務目標：執行 v1.5.2 評分報告的優化建議 2~6（1 實戰驗證由使用者執行）。
### 任務類型：中改（護欄機器化 + 規範補強）

### 修改檔案：
- scripts/preflight-check.sh（新增第 11 項 UI 變更無手機檢查聲明軟提醒；版號 v1.6.0）
- docs/STYLE_PACKS.md（A~E 各附起手 token；使用規則同步）
- docs/BRAND_UI_SYSTEM.md（§12 加「實測而非目測」：375px 實開驗證，無法實測標 Unverified）
- docs/FEEDBACK_LOOP.md（新增「規則預算」：回流先問能否機器化、優先整併不疊加）
- docs/INIT_PROMPT.md、docs/TEMPLATE_CHANGELOG.md（v1.6.0）

### 是否影響資料庫 / RLS / 權限 / production：否
### 是否影響 UI / UX：是（規範與護欄，未改任何實際畫面程式；本次無 UI 檔案變更，手機版檢查不適用）
### 是否同步更新 docs：是
### 測試方式：
1. preflight 第 11 項三情境實測：UI 變更無聲明→黃字提醒、有聲明→綠燈、無 UI 變更→靜默，全過。
2. bash -n 語法檢查通過；bash scripts/preflight-check.sh 全綠。
3. STYLE_PACKS code fence 平衡檢查通過。
### 風險提醒：
- 遠端備份（建議 2）因本機無 gh CLI 未完成，需使用者手動建 GitHub private repo 後 push。
### 下一步：使用者建立遠端後 git push；下個真實專案實測新提醒的誤報率。

---

## 紀錄：2026-07-12（母版 v1.5.2：獨立多角色審查機制）

### 日期：2026-07-12
### 修改者：AI (Claude)
### 任務目標：新增獨立多角色審查機制——實作者不得自批、獨立判斷→交叉審查→整合、五類否決權、Unverified 證據原則。
### 任務類型：中改（母版規範新增，最小精準改動）

### 修改檔案：
- docs/ROLE_SYSTEM.md（新增 §7 完整規則；§1 第 5 點觸發節制）
- .claude/skills/qa-verify/SKILL.md + .agents 鏡像（整合審查摘要與觸發詞，不新增 skill）
- docs/AI_RULES.md（§12 第 4 點最短摘要）
- CLAUDE.md / AGENTS.md（各一行指路，兩檔一致）
- docs/INIT_PROMPT.md、docs/TEMPLATE_CHANGELOG.md（v1.5.2）

### 是否影響資料庫 / RLS / 權限 / production：否
### 是否影響 UI / UX：否（僅審查流程規範）
### 是否同步更新 docs：是
### 測試方式：
1. bash scripts/preflight-check.sh（鏡像與入口檔一致性）。
2. qa-verify 新 description 已被 Claude Code 重新探索。
3. 規則無重複：完整規則僅在 ROLE_SYSTEM §7，其餘皆為指路摘要。
### 風險提醒：無。依使用者指示本次未 commit，待確認。
### 下一步：使用者確認後 commit v1.5.2。

---

## 紀錄：2026-07-12（母版 v1.5.1：角色可視化 + 守衛補齊為 1~8）

### 日期：2026-07-12
### 修改者：AI (Claude)
### 任務目標：使用者要能看到每次調用了哪些角色；每個角色都要有對應守衛 SKILL。
### 任務類型：中改（母版文件與 skills 優化）

### 修改檔案：
新增：.claude/skills/qa-verify/、.claude/skills/deploy-guard/（含 .agents 鏡像）
修改：docs/AI_RULES.md（§10 標示協定第 3 點角色標註）、docs/TASK_ROUTER.md（§0 擴為 1~8、部署分類加 deploy-guard）、
docs/ROLE_SYSTEM.md（§5 補 7/8）、README.md、CLAUDE.md、AGENTS.md、docs/CUSTOM_SYSTEM_PROMPT.md、
docs/INIT_PROMPT.md、docs/_目錄說明.md、docs/TEMPLATE_CHANGELOG.md（v1.5.1）

### 是否影響資料庫 / RLS / 權限 / production：否
### 是否影響 UI / UX：否（僅規範）
### 是否同步更新 docs：是（「啟動 1~6」引用全庫同步為 1~8）
### 測試方式：
1. bash scripts/preflight-check.sh（含 skills 鏡像與入口檔一致性）。
2. Claude Code 已自動探索到 qa-verify / deploy-guard 兩個新 skill。
### 風險提醒：無。
### 下一步：真實專案實測「角色標註」是否穩定出現在回報開頭。

---

## 紀錄：2026-07-12（母版 v1.5.0：三層架構定名 + 多角色協作系統 + UI/UX 商用產品設計師）

### 日期：2026-07-12
### 修改者：AI (Claude)
### 任務目標：全面檢視並優化母版——整理三層架構（萬用核心 / 技術套件 / 專案層）、建立正式多角色協作系統、新增 UI/UX 商用產品設計師核心角色、風格選擇機制、Mobile-first 防破版硬性標準。
### 任務類型：中改（母版文件規範優化，未動任何產品程式 / DB / production）

### 必讀文件：
- 全母版盤點（docs/ 全部、.claude/skills/、scripts/、logs/、入口檔）

### 修改檔案：
新增：
- docs/ROLE_SYSTEM.md（角色系統精簡核心）
- docs/roles/ 八個角色完整版（含 ui-ux-product-designer.md）
- docs/STYLE_PACKS.md（風格提問協定 + A~E 基本風格 + 擴充包）
- docs/tech-packs/nextjs-supabase-vercel.md（預設技術套件索引 + 換棧 Swap Checklist）
修改：
- docs/BRAND_UI_SYSTEM.md（§12 手機優先防破版硬性標準；§13 指向 STYLE_PACKS）
- docs/UX_GUIDELINES.md（新增 §四 人性化 13 項檢查）
- docs/AI_RULES.md（新增 §12 多角色協作）
- docs/TASK_ROUTER.md（§0.5 角色啟動；分類 3 加讀指引）
- CLAUDE.md / AGENTS.md（角色與風格指路，兩檔一致）
- docs/TECH_STACK.md、README.md、docs/_目錄說明.md、docs/INIT_PROMPT.md、docs/TEMPLATE_CHANGELOG.md（v1.5.0）
- .claude/skills/ui-ux-defense/SKILL.md + .agents 鏡像（同步）

### 是否影響資料庫：否
### 是否影響 RLS：否
### 是否影響權限：否
### 是否影響 production：否
### 是否影響 UI / UX：是（新增 UI/UX 規範與角色，未改任何實際畫面程式）
### 是否同步更新 docs：是（_目錄說明 / INIT_PROMPT / README / TEMPLATE_CHANGELOG 全數同步）
### 測試方式：
1. bash scripts/preflight-check.sh（含入口檔一致性、skills 鏡像一致性）。
2. 全庫文件路徑引用掃描，確認新增引用之檔案皆存在。
### 風險提醒：
- BRAND_UI §13 原四風格包遷移至 STYLE_PACKS.md（學院 / 遊戲保留為擴充包，企業後台併入 C、品牌官網併入 D）；舊專案若引用「BRAND_UI §13 某風格」，請改讀 STYLE_PACKS.md。
### 下一步：
- 建議建立獨立 Git commit 保存 v1.5.0 母版版本。
- 下次真實專案套用時，實測「風格提問協定」與「角色動態啟動」流暢度，回饋記入 logs/template_feedback.md。

---

## 紀錄：2026-07-10（新增鐵律：防目錄與檔案巨大化/模組化要求）

### 日期：2026-07-10
### 修改者：AI (Antigravity)
### 任務目標：新增「防目錄與檔案巨大化/輕量模組化」規範，確保代碼結構清晰不臃腫。
### 任務類型：中改（文件規範修訂）

### 必讀文件：
- docs/AI_RULES.md
- docs/CODE_STANDARDS.md

### 修改檔案：
- docs/AI_RULES.md（第 9 節 Karpathy 守則新增第 5 項 Keep Folders Lightweight）
- docs/CODE_STANDARDS.md（新增第 9 節輕量化與防止目錄巨大化）

### 是否影響資料庫：否
### 是否影響 RLS：否
### 是否影響權限：否
### 是否影響 production：否
### 是否影響 UI / UX：否
### 是否同步更新 docs：是（直接更新 AI_RULES.md 與 CODE_STANDARDS.md）
### 測試方式：
1. 檢查檔案變更正確性。
2. 執行 bash scripts/preflight-check.sh 通過。
### 風險提醒：
無風險。此修改僅為程式開發結構規範，不改變任何執行代碼。
### 下一步：
後續在進行任何代碼開發時，AI 與開發人員應嚴格遵守防巨大化與輕量化規則，避免程式碼檔案與單一資料夾膨脹。

---

## 紀錄：2026-07-10（微調：新增身份宣告與角色防禦標示協定於主規則中）

### 日期：2026-07-10
### 修改者：AI (Antigravity)
### 任務目標：在 docs/AI_RULES.md 中正式寫入「身份宣告與角色防禦標示協定」，強制 AI 在回覆開頭以 `🛡️ [已啟用：啟動 N 角色名稱] [修改者/AI名稱]` 格式進行宣告。
### 任務類型：中改（文件規範修訂）

### 必讀文件：
- docs/AI_RULES.md
- docs/TASK_ROUTER.md

### 修改檔案：
- docs/AI_RULES.md

### 是否影響資料庫：否
### 是否影響 RLS：否
### 是否影響權限：否
### 是否影響 production：否
### 是否影響 UI / UX：否（改善 AI 與使用者的溝通體驗與透明度）
### 是否同步更新 docs：是（直接更新 AI_RULES.md）
### 測試方式：
1. 檢查 AI_RULES.md 新增的標註協定文字。
2. 執行 bash scripts/preflight-check.sh 通過。
### 風險提醒：
無風險。此修改僅為 AI 與使用者的溝通反饋協定，不會對程式邏輯或資料庫結構產生實質物理影響。
### 下一步：
後續在開啟任何開發或分析任務時，AI 會自動在回報或計畫開頭標註 `🛡️ [已啟用：啟動 N 角色名稱] [修改者/AI名稱]`。

---

## 紀錄：2026-07-10（微調：新增角色啟用標註協定，確保使用者透明度）

### 日期：2026-07-10
### 修改者：AI (Antigravity)
### 任務目標：新增「已啟用：啟動 N 角色名稱」標註協定，讓使用者能清楚知道目前 AI 是否正確啟用了對應的防護與規則。
### 任務類型：中改（文件規範修訂）

### 必讀文件：
- docs/AI_RULES.md
- docs/TASK_ROUTER.md

### 修改檔案：
- docs/TASK_ROUTER.md

### 是否影響資料庫：否
### 是否影響 RLS：否
### 是否影響權限：否
### 是否影響 production：否
### 是否影響 UI / UX：否（改善 AI 與使用者的溝通體驗與透明度）
### 是否同步更新 docs：是（直接更新 TASK_ROUTER.md）
### 測試方式：
1. 檢查 TASK_ROUTER.md 新增的標註協定文字。
2. 執行 bash scripts/preflight-check.sh 通過。
### 風險提醒：
無風險。此修改僅為 AI 與使用者的溝通反饋協定，不會對程式邏輯或資料庫結構產生實質物理影響。
### 下一步：
後續在開啟任何開發或分析任務時，AI 會自動在回報或計畫開頭標註 `🛡️ [已啟用：啟動 N 角色名稱]`。

---

## 紀錄：2026-07-10（母版 v1.4.1 — 健檢小修補：去重 + 補缺口 + 加機器檢查）

### 任務類型：中改（多檔文件與腳本小修補，無架構變動）
### 修改檔案：
- docs/AI_RULES.md（§0 整併：0.2/0.5 改引用、0.6 併入前言後移除；保留 0.1/0.3/0.4）
- scripts/preflight-check.sh（新增第 10 項 入口檔一致性；標頭 v1.3.2→v1.4.1）
- docs/DB_DESIGN.md（新增 §8 索引原則）
- docs/SECURITY_CHECKLIST.md（新增第 16 限流防刷、第 17 上傳限制）
- docs/BRAND_UI_SYSTEM.md（§12 新增 空狀態 Empty State）
- docs/_目錄說明.md、docs/INIT_PROMPT.md（SECURITY 15 項→17 項）
- docs/TEMPLATE_CHANGELOG.md（v1.4.1 條目）
### 內容：
取 F5 母版 v1.4.0 架構健檢報告中「風險最低、最值得做」三類：①消除 AI_RULES SSOT 檔內部重複（改引用，不刪安全含義，不動高風險熔斷 §5 與完成定義 §10 本體）；②補 500+ 商用缺口（索引 / 限流 / 上傳 / 空狀態，皆短句）；③新增 preflight 入口檔一致性檢查，堵住 CLAUDE.md↔AGENTS.md 無機器護欄的 drift 缺口。
### 是否影響資料庫/RLS/權限/production：否（純文件與腳本檢查）
### 是否影響 UI / UX：僅新增 empty state 規則字句，無程式變更
### 是否同步更新 docs：是（_目錄說明、INIT_PROMPT 計數；CHANGELOG 條目）
### 測試方式：bash scripts/preflight-check.sh 全過，第 10 項顯示「入口檔一致」
### 風險提醒：無高風險；全為 patch 級加規則或同檔去重
### 版本：v1.4.1
### 狀態：v1.4.1 小修補已實作並通過 preflight，準備以 Git commit / tag 封版（不推送、不建遠端）。

---

## 紀錄：2026-07-08（v1.4.0 後補充 — FUTURE_BACKLOG 待辦清單）

### 任務類型：小改（純文件補充，不升版）
### 修改檔案：docs/FUTURE_BACKLOG.md（新增）、docs/_目錄說明.md（加一列索引）
### 內容：
記錄刻意延後的三項母版能力（多租戶 org_id / 複式簿記 / GitHub Actions CI），各附觸發條件與「有真實需求才回流」原則。額外補：多租戶「架構決策要早下、建置可延後」（回填 org_id 到既有多表系統極痛，來源：學院 70 表補課教訓）；三項回流時皆屬 AI_RULES §5 高風險。
### 是否影響資料庫/RLS/權限/production/程式/腳本/AI_RULES： 否（純規劃文件）
### 版本：不升版，v1.4.0 維持定版（規劃文件非行為變更）。
### 狀態：未 commit（依指示）。

---

## 紀錄：2026-07-08（模板 v1.4.0 — 入口瘦身與 SSOT 收斂回流，v1.4.0 已確認）

### 任務類型：中改（結構收斂 + 護欄，A~F 六項回流）
### 修改檔案：
- docs/TASK_ROUTER.md（新增 §0 SKILL 對照表 SSOT）
- CLAUDE.md、AGENTS.md（36→20 行薄入口；保留高風險 2 行；修 .Codex 路徑 bug；兩檔一致）
- docs/CUSTOM_SYSTEM_PROMPT.md（83→33 行指路版）
- docs/FEEDBACK_LOOP.md（Append-only 原則）
- docs/CODE_STANDARDS.md（資料存取層中性化）
- scripts/install-hooks.sh（pre-push 加工作區乾淨檢查）
- scripts/preflight-check.sh（修 existing_dirs 空陣列 unbound bug——測試中發現）
- docs/INIT_PROMPT.md（四處 drift 同步）、docs/TEMPLATE_CHANGELOG.md
### 測試：
乾淨檢查四情境全過（乾淨0／未add 1／未commit 1／untracked 1）；unbound 錯誤歸零；母版 fence 平衡、preflight exit 0。
### 是否影響資料庫/RLS/權限/production： 否
### 未回流（特例，依指示排除）：複訓死鍵、優惠碼鎖表、推薦碼 Cookie、學院資料表/目錄結構、project-commands。
### 狀態：**未 commit、未 push**（母版非 Git repo；完整 diff 已產出待使用者審查）。

---

## 紀錄：2026-07-08（模板 v1.3.3 — 快慢分層回流）

### 任務類型：中改（回饋整合 + hook 機器化）
### 修改檔案：docs/AI_RULES.md（§10 build 定義）、docs/DEPLOYMENT.md（快慢分層節，單一出處）、scripts/install-hooks.sh（雙層 hook）、docs/FEEDBACK_LOOP.md、docs/TEMPLATE_CHANGELOG.md
### 回饋來源：學院 template_feedback.md 2026-07-08 兩則同議題（Vercel 靜默失敗 vs build 太重），判定通用、整合為一條「快慢分層」規則。
### 測試：pre-push 三情境通過（壞 build 擋／好 build 放行／無 script 略過）；母版 fence 與 preflight 綠。
### 是否影響資料庫/RLS/權限/production： 否
### 給學院的同步指示：重跑 bash scripts/install-hooks.sh（母版 v1.3.3 版）升級成雙層 hook；若先前把完整 build 塞進了 preflight-check.sh，請移除該段改用 pre-push；兩則回饋標「已回流母版：是」。

---

## 紀錄：2026-07-06（模板 v1.3.2 — 第一次正式回饋回流）

### 任務類型：中改（依實戰回饋修規則 + 機器化）
### 修改檔案：docs/AI_RULES.md（§10 用語協定、§11 一功能一commit）、scripts/preflight-check.sh（第 9 項金流無測試提醒）、docs/TESTING.md、docs/FEEDBACK_LOOP.md、docs/TEMPLATE_CHANGELOG.md
### 回饋來源：學院專案 logs/template_feedback.md 三則（§10 被放寬／§11 逐commit推／TESTING 全跳過），判定全部「通用」，全數採納。
### 測試：金流檔無測試→黃字提醒且 exit 0；補測試→綠；母版乾淨 exit 0。
### 是否影響資料庫/RLS/權限/production： 否
### 給學院的同步指示：下次順手用母版 v1.3.2 覆蓋 preflight-check.sh；並把 template_feedback.md 三則標「已回流母版：是」。

---

## 紀錄：2026-07-06（模板 v1.3.1 — 紅隊自我攻擊修正）

### 任務類型：小改（安全修正 + 檢查機器化）
### 修改檔案：scripts/preflight-check.sh、docs/TEMPLATE_CHANGELOG.md
### 內容：
1. 封堵 inline preflight-allow 在新 migration 的繞過漏洞（migration 只認外部白名單）。
2. 新增 preflight 第 8 項 skills 鏡像一致性檢查（規則 → 機器強制）。
### 測試：四情境全通過（migration inline 失效／外部白名單有效／一般檔 inline 有效／鏡像分岔被抓）；乾淨狀態 exit 0。
### 是否影響資料庫/RLS/權限/production： 否
### 給 brownfield 專案：下次順手同步時用母版 v1.3.1 覆蓋 preflight-check.sh 即可（白名單檔照舊只合併不覆蓋）。

---

## 紀錄：2026-07-06（模板 v1.3.0 — 固定基準版總體檢）

### 任務類型：中改（總體檢 + 修正 + 新增）
### 修改檔案：
- .agents/skills/*/SKILL.md × 6（以 .claude 權威同步鏡像，修復雙頭馬車）
- docs/AI_RULES.md（第 8 節加 skill 鏡像同步；新增第 11 節自主執行與效率原則）
- docs/BRAND_UI_SYSTEM.md（起手式 Design Tokens 光暗兩套）
- README.md（日常三件事 + 目錄樹補齊）
- docs/INIT_PROMPT.md（補齊 v1.2 全部演進）
- docs/CUSTOM_SYSTEM_PROMPT.md（自主批次段）
- docs/_目錄說明.md（鏡像註記）
- docs/TEMPLATE_CHANGELOG.md（v1.3.0）
### 稽核發現：
1. .agents/skills 被其他工具以舊規格重建、6 檔全分岔（母版自踩 #13）→ 已修＋立規則。
2. INIT_PROMPT / README 落後 v1.2 兩版 → 已補齊。
### 是否影響資料庫/RLS/權限/production： 否
### 測試：fence 全平衡、preflight exit 0、兩份 skills diff 全同、目錄說明所列檔案全存在。
### 本版定位：固定基準版——之後每個新系統以 v1.3.0 複製起步。

---

## 紀錄：2026-07-05（模板 v1.2.2 — preflight-allow.txt 加 re-sync 警告）

### 任務類型：小改（檔頭警告 + 規範）
### 修改檔案：scripts/preflight-allow.txt、docs/TEMPLATE_CHANGELOG.md
### 背景（回饋循環第三圈）：
學院專案 re-sync 母版 v1.2.1 時，若直接用母版空白 preflight-allow.txt 覆蓋，會洗掉已審核的 10 條例外、preflight 立刻變紅。協作 AI 正確判斷改為合併保留。固化成檔頭警告，不再靠臨場判斷。
### 是否影響資料庫/RLS/權限/production： 否

---

## 紀錄：2026-07-05（模板 v1.2.1 — 外部白名單檔，修正 inline 白名單的 migration 矛盾）

### 任務類型：小改（腳本 + 規範同步）
### 修改檔案：scripts/preflight-check.sh、scripts/preflight-allow.txt(新增)、docs/DB_MIGRATION_RULES.md、docs/_目錄說明.md、docs/FEEDBACK_LOOP.md、docs/TEMPLATE_CHANGELOG.md
### 背景（回饋循環第二圈）：
brownfield 學院專案協作 AI 發現：v1.1.2 的 inline `preflight-allow` 用在 migration 政策上會 (a) 違反只增不改、(b) 觸發檢查 #6，等於無法用在最需要它的場景。
### 解法：
新增外部白名單檔 scripts/preflight-allow.txt，以「路徑:行號」放行 migration 例外（migration 不改→行號穩定→可 git 稽核）。inline 標記保留給非 migration 檔。
### 測試（全通過）：
A 無白名單兩條都攔；B 白名單精準放行第2行、危險第3行仍攔；C 機密列入白名單仍被攔。
### 是否影響資料庫/RLS/權限/production： 否
### 給 brownfield 專案的同步指示：
用母版 v1.2.1 覆蓋 scripts/preflight-check.sh 並複製 scripts/preflight-allow.txt；migration 的合法參考表政策改登記到白名單檔（路徑:行號），非 migration 檔用 inline 標記。

---

## 紀錄：2026-07-05（模板 v1.2.0 — 回饋循環機制內建）

### 任務類型：中改（新增機制 + 文件）
### 修改檔案：
新增：docs/FEEDBACK_LOOP.md、logs/template_feedback.md
修改：CLAUDE.md（retro 提醒）、docs/_目錄說明.md、docs/TEMPLATE_CHANGELOG.md
### 內容：
把「開發中收集回饋 → 週期回流母版打磨」固化為內建機制。三階段：察覺（7 訊號）、收集（收工 retro prompt 自動整理）、回流（母版判斷通用 vs 特例）。
### 是否影響資料庫/RLS/權限/production： 否
### 測試：fence 全平衡、preflight exit 0。
### 下一步：實戰中每完成功能跑一次 retro，週期性把 template_feedback.md 帶回母版評估升版。

---

## 紀錄：2026-07-05（模板 v1.1.3 — 單一事實來源規則）

### 任務類型：小改（規範新增）
### 修改檔案：docs/AI_RULES.md、docs/INCIDENT_PREVENTION.md、docs/TEMPLATE_CHANGELOG.md
### 內容：
1. AI_RULES 第 8 節新增「單一事實來源：不得平行維護兩套規範」（禁止文件雙頭馬車；brownfield 指定權威 + 其餘標歷史參考 + 停止平行維護；發現多份須主動提報）。
2. INCIDENT_PREVENTION 新增第 13 項「規範文件雙頭馬車」。
### 背景：brownfield 匯入學院專案時出現兩份 AI_RULES 並存，固化此經驗為規則。
### 是否影響資料庫/RLS/權限/production： 否
### 給 brownfield 專案的建議：據此把模板版 docs/AI_RULES.md 定為唯一權威，舊版 docs/04_專案規範/AI_RULES.md 標歷史參考並停止平行維護。

---

## 紀錄：2026-07-05（模板 v1.1.2 — preflight 大小寫盲點修正 + 白名單機制）

### 任務類型：小改（腳本 + 規範同步）
### 修改檔案：scripts/preflight-check.sh、docs/DB_MIGRATION_RULES.md、docs/SECURITY_CHECKLIST.md、docs/TEMPLATE_CHANGELOG.md
### 背景：
brownfield 專案協作 AI 發現 preflight 大小寫敏感，漏掉真實大寫 USING (true) 政策（偵測盲點）。
### 修正與新增：
1. grep 改 -i（大小寫不敏感），補上盲點。
2. 新增 preflight-allow 白名單：公開/參考表審核後可標記放行，解決「嚴格化 → 逢 commit 必擋」兩難。
3. 機密掃描不受 allow 影響，標了照攔。
4. DB_MIGRATION_RULES／SECURITY_CHECKLIST 同步規則（敏感表禁、公開表須審核加標記、設定表不放機密）。
### 測試：大寫 USING(true) 抓到、標記行放行、註解警語不報、機密標 allow 仍攔——全數驗證通過。
### 是否影響資料庫/RLS/權限/production： 否（純工具與規範）
### 給 brownfield 專案的同步指示：
再次用母版 v1.1.2 覆蓋專案 scripts/preflight-check.sh；然後為合法的參考表政策逐行加 `-- preflight-allow: 原因`，即可嚴格掃描且乾淨掛 hook。

---

## 紀錄：2026-07-05（模板 v1.1.1 — preflight 註解誤報修正）

### 任務類型：小改（腳本修正）
### 修改檔案：scripts/preflight-check.sh、docs/TEMPLATE_CHANGELOG.md
### 背景：
brownfield 匯入真實專案時發現，migration 註解中的警語（如 `-- 禁止 using(true)`）被 preflight 當成紅線，導致逢 commit 必擋。
### 修正：
grep_scan 新增 skip_comments 參數；RLS 語法紅線與 NEXT_PUBLIC 命名檢查排除整行註解；機密掃描維持不排除。
### 測試：真 using(true) 仍抓到；純警語註解 exit 0；已驗證通過。
### 是否影響資料庫/RLS/權限/production： 否

---

## 紀錄：2026-07-05（模板 v1.1.0 品質升級）

### 日期：2026-07-05
### 修改者：AI
### 任務目標：
把模板從「防出事」升級到「保證品質」：新增完成的定義（DoD）、程式結構規範、測試策略，並細化高風險熔斷避免流程被疲勞繞過。

### 任務類型：
中改（純文件層，無程式、無資料庫）

### 必讀文件：
- docs/AI_RULES.md
- docs/TASK_ROUTER.md

### 修改檔案：
新增：
- docs/CODE_STANDARDS.md
- docs/TESTING.md

補充（同日）：
- 新增 docs/BROWNFIELD_IMPORT.md（既有專案匯入說明書），已同步 _目錄說明.md 與 TEMPLATE_CHANGELOG.md。

修改：
- docs/AI_RULES.md（第 5 節高風險細分；新增第 10 節完成的定義）
- docs/TASK_ROUTER.md（開頭加通用規則）
- CLAUDE.md（DoD 導引；skill 觸發措辭改為「讀取對應 SKILL.md」）
- docs/CUSTOM_SYSTEM_PROMPT.md（同上 + 貼用版補 DoD）
- docs/INIT_PROMPT.md（同步 v1.1 全部內容）
- docs/TEMPLATE_CHANGELOG.md（v1.1.0 + 版本標記機制）
- docs/_目錄說明.md（補兩份新文件）
- README.md（複製流程加版本標記步驟）

### 是否影響資料庫： 否
### 是否影響 RLS： 否
### 是否影響權限： 否
### 是否影響 production： 否
### 是否影響 UI / UX： 否（僅規範文件）
### 是否同步更新 docs： 是（changelog、對照表、INIT_PROMPT、README 皆同步）
### 測試方式：
1. 檢查 AI_RULES 第 5 節有高風險/中改分級、第 10 節存在。
2. 檢查 docs/CODE_STANDARDS.md、docs/TESTING.md 存在且完整。
3. 檢查所有 md 的 code fence 配對為偶數。
4. 跑 bash scripts/preflight-check.sh 應通過。

### 風險提醒：
高風險熔斷放寬了「用既有表做一般 CRUD」為中改——若實際使用時發現邊界誤判，應把該案例補回第 5 節高風險清單。

### 下一步：
複製到第一個新專案時實測 DoD 與 skills 觸發效果。

---

## 紀錄：2026-07-05 (新增 SKILL 中文與數字對照)

### 日期：2026-07-05
### 修改者：AI
### 任務目標：
新增 SKILL 快速對照與觸發機制（中文簡稱、數字代號 1~6），簡化使用者記憶與呼叫成本。

### 任務類型：
小改

### 必讀文件：
- docs/AI_RULES.md
- CLAUDE.md

### 修改檔案：
修改：
- CLAUDE.md
- docs/CUSTOM_SYSTEM_PROMPT.md

### 是否影響資料庫： 否
### 是否影響 RLS： 否
### 是否影響權限： 否
### 是否影響 production： 否
### 是否影響 UI / UX： 否
### 是否同步更新 docs： 是，更新了 docs/CUSTOM_SYSTEM_PROMPT.md
### 測試方式：
檢查 CLAUDE.md 與 docs/CUSTOM_SYSTEM_PROMPT.md 是否已正確寫入簡短好懂的 SKILL 對照表與觸發提示。

### 風險提醒：
無風險。此修改僅為引導提示，不改變既有代碼邏輯。

### 下一步：
後續當使用者輸入「啟動 1」等指令時，主動載入對應 SKILL.md。

---

## 初始紀錄

### 日期：2026-07-05
### 修改者：AI
### 任務目標：
初始化商用系統標準起手式模板（v3）。

### 任務類型：
初始化

### 必讀文件：
本次為初始化，建立全部規範文件。

### 修改檔案：
新增：
- README.md
- CLAUDE.md
- .gitignore
- .env.example
- scripts/preflight-check.sh
- scripts/install-hooks.sh（新專案安裝 pre-commit hook）
- docs/TASK_ROUTER.md
- docs/AI_RULES.md
- docs/CUSTOM_SYSTEM_PROMPT.md
- docs/TECH_STACK.md
- docs/PROJECT_CONTEXT.md
- docs/FEATURE_MAP.md
- docs/DB_DESIGN.md
- docs/DB_MIGRATION_RULES.md
- docs/SECURITY_CHECKLIST.md
- docs/TRANSACTION_RULES.md
- docs/INCIDENT_PREVENTION.md
- docs/OBSERVABILITY.md
- docs/BRAND_UI_SYSTEM.md
- docs/UX_GUIDELINES.md
- docs/DEPLOYMENT.md
- docs/TROUBLESHOOTING.md
- docs/TEMPLATE_CHANGELOG.md
- docs/INIT_PROMPT.md
- docs/_目錄說明.md（英文檔名↔中文對照表）
- logs/ai_sync_log.md
- logs/decision_log.md
- .claude/skills/task-router/SKILL.md
- .claude/skills/karpathy-guidelines/SKILL.md
- .claude/skills/supabase-guard/SKILL.md
- .claude/skills/anti-n-plus-one/SKILL.md
- .claude/skills/transaction-guard/SKILL.md
- .claude/skills/ui-ux-defense/SKILL.md

### 是否影響資料庫：
否，僅建立規範文件。

### 是否影響 RLS：
否，僅建立規範文件。

### 是否影響權限：
否。

### 是否影響 production：
否。

### 是否影響 UI / UX：
否（僅建立 UI/UX 規範文件，未動實際畫面）。

### 是否同步更新 docs：
是，本次建立 docs 初始模板。

### 若未更新 docs，原因：
不適用（本次即為建立 docs）。

### 測試方式：
1. 確認 docs/ 已建立。
2. 確認 logs/ 已建立。
3. 確認 .claude/skills/ 已建立（6 個 skill）。
4. 確認 scripts/preflight-check.sh 已建立且可執行。
5. 確認 CLAUDE.md 已建立且指向 Router。
6. 確認 .gitignore 已建立。
7. 確認 .env.example 已建立。
8. 確認 docs/TASK_ROUTER.md 存在。
9. 確認 docs/CUSTOM_SYSTEM_PROMPT.md 存在。
10. 確認 README.md 已加入模板說明。
11. 確認沒有修改 production、沒有執行 SQL、沒有部署。
12. 確認沒有讀取、參考或修改任何外部專案。

### 風險提醒：
本次是規範環境初始化，不會自動改變現有系統行為。後續 AI 開發必須遵守 TASK_ROUTER.md。

### 下一步：
未來每次開發任務，先由 CLAUDE.md 導向 docs/TASK_ROUTER.md，依任務類型判斷要閱讀哪些規範。

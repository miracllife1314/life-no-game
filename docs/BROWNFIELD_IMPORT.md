# BROWNFIELD IMPORT — 把模板匯入「寫到一半的既有專案」

> 本檔是給 **AI 讀的操作說明書**。
> 使用者只要在既有專案開新 session，貼一句話叫 AI 讀本檔照做即可。
> 全新專案不用本檔——直接整包複製模板即可（見 README「如何複製到新專案」）。

## 給使用者的一句話指令（貼這個就好）

```text
請讀取 /Users/leo/萬用AI系統開發2版/docs/BROWNFIELD_IMPORT.md，
把該模板安全匯入目前這個專案。模板資料夾只能讀取，禁止修改。
```

---

## AI 執行規則（鐵律）

1. **模板資料夾（來源）只讀不改**：只能從模板複製內容出來，不得寫入模板任何檔案。
2. **既有專案的業務程式碼一律不改**：本次任務只做「加規範檔 + 盤點 + 回填文件」。盤點發現的問題只列清單，修不修由使用者決定。
3. **只加不蓋**：目標專案已存在的同名檔案不得直接覆蓋；需要合併時先建 `.bak` 備份。
4. 不執行 SQL、不部署、不碰 production、不刪除任何既有檔案。

## 執行步驟

### 第 0 步：保護現場

1. 確認目標專案是否為 Git 專案（`git status`）。
2. 是 → 請使用者先 commit 目前所有變更（或由 AI 代為 commit，訊息如 `chore: backup before template import`，需使用者同意）。
3. 不是 → 建議 `git init` 後先 commit 一版；使用者不願意則整個資料夾先手動備份，確認後才繼續。

### 第 1 步：只搬不存在的東西

從模板複製到目標專案：

| 項目 | 處理方式 |
|---|---|
| `docs/`（全部規範文件） | 直接複製；目標已有 `docs/` 則逐檔搬，撞名先 `.bak` |
| `logs/` | 直接複製 |
| `.claude/skills/`（8 個 skill） | 直接複製；目標已有 `.claude/` 則只搬 `skills/` 子目錄 |
| `scripts/preflight-check.sh`、`scripts/install-hooks.sh`、`scripts/review.sh`、`scripts/release.sh` | 直接複製 |
| `CLAUDE.md` | 目標沒有 → 複製；已有 → **合併**（保留原內容，把模板的 Router 導引與 SKILL 對照表加進去），原檔先 `.bak` |
| `README.md` | **不覆蓋**專案原 README；在原 README 末尾加一段「本專案已導入 AI 開發規範，入口見 CLAUDE.md 與 docs/TASK_ROUTER.md」 |
| `.gitignore` | 合併：把模板規則中目標缺少的行補進去（尤其 `.env` 系列），不刪原有規則 |
| `.env.example` | 目標沒有 → 複製後依實際變數調整；已有 → 比對補缺，不覆蓋 |
| `docs/TEMPLATE_CHANGELOG.md` 頂部 | 記一行「基於模板 vX.X.X 匯入於 YYYY-MM-DD（brownfield）」 |

### 第 2 步：回填現況（最重要，不可省略）

讀取目標專案的實際程式與 schema，把以下文件從 placeholder 改成**真實現況**：

1. `docs/PROJECT_CONTEXT.md`：專案是什麼、給誰用、核心流程、角色。
2. `docs/TECH_STACK.md`：實際使用的框架、DB、部署方式、package manager。
3. `docs/DB_DESIGN.md`：把**現有資料表**逐張列入（欄位、用途、是否敏感、RLS 現況）。
4. `docs/FEATURE_MAP.md`：現有功能標「已完成」，開發中的標「開發中」。
5. **AI 驗證通道盤點**（`docs/TESTING.md` 第 0 節）：確認 AI 是否有可用的端到端驗證方式
   （測試帳號＋種子資料 / 免密身分切換 / staging 自動登入，擇一）。
   沒有 → 列入修繕清單**高優先**（沒有通道，AI 的「完成」永遠只能是「已部署，待驗證」，
   bug 會漏到使用者面前），並整理「AI 測不了的流程清單」供使用者決定建立方式。
6. `docs/CODE_STANDARDS.md`：記錄專案**實際目錄結構**，並加上「漸進採用」條款：

```text
本專案為中途導入：新寫的程式碼必須符合本規範；
既有程式碼「碰到才改」，重構須開獨立任務，不得順手做。
```

> 為什麼不可省略：docs 若停留在空模板，AI 會依「不存在的現況」做判斷，
> 等於第一天就發作「文件過期導致誤判」（INCIDENT_PREVENTION #12）。

### 第 3 步：健檢，先不掛 hook

1. 執行 `bash scripts/preflight-check.sh`（必要時把掃描目錄調成專案實際結構）。
2. 產出**修繕清單**：每項紅線列出位置、風險等級、建議修法——**只列不修**。
3. 有重大紅線（using(true)、機密外洩）→ 明確告知使用者優先處理。
4. **紅線清完之後**才建議執行 `bash scripts/install-hooks.sh` 掛 pre-commit；太早掛會逢 commit 必擋，使用者被迫 `--no-verify` 繞過，護欄形同虛設。

### 第 4 步：交付回報

依下列格式回報：

```text
1. 新增了哪些檔案／合併了哪些檔案（含 .bak 清單）
2. 回填了哪些 docs（各檔重點摘要）
3. preflight 健檢結果與修繕清單（分級）
4. 尚未處理、需使用者決定的事項
5. 建議的下一步（含何時掛 hook）
6. 已更新 logs/ai_sync_log.md
```

### 第 5 步：試運轉（使用者驗收）

請使用者做一個小任務（例如改一句文案），確認 AI：
會先讀 Router、正確判斷為小改、不會想大重構既有程式。

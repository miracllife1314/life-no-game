# TASK ROUTER — 任務路由表 (v1.9.0)

> 日常開發，AI **不需要**每天讀所有文件。
> AI 必須依任務類型判斷「**改什麼讀什麼**」。
> 規則細節以 `docs/AI_RULES.md` (v1.9.0) 為**單一事實來源**。

使用方式：先判斷本次任務屬於下列哪一類，只讀該類「必讀」清單，並依「對應規則」到 `docs/AI_RULES.md` 查細節。若一個任務橫跨多類，取**風險最高**的那一類處理。

**通用（跨所有分類）：**

1. 凡涉及**實際寫程式**的任務，一律加讀 `docs/CODE_STANDARDS.md`。
2. 驗證與測試方式見 `docs/TESTING.md`；回報「完成」前須符合 `docs/AI_RULES.md` 第 10 節「完成的定義」。

---

## 0. SKILL 對照表（單一事實來源）

> 入口檔（CLAUDE.md / AGENTS.md）只指到這裡，不再各自內嵌對照表。
> 本表與 `.claude/skills/` 實際資料夾由 preflight 第 13 項機器對帳（防索引 drift）。

| 編號 | 中文簡稱 | skill 名稱 | 觸發時機 |
|---|---|---|---|
| 1 | 畫面與體驗 | ui-ux-defense | 改視覺 / 排版 / 樣式 |
| 2 | 資料庫與權限 | supabase-guard | 改 DB / RLS / SQL |
| 3 | 金流與交易 | transaction-guard | 改庫存 / 金額 / 防超賣 |
| 4 | 效能優化 | anti-n-plus-one | 查詢太慢 / 大量資料 |
| 5 | 防呆與寫法評估 | karpathy-guidelines | 評估核心邏輯 / 最小改動 |
| 6 | 任務路由 | task-router | 分類與判斷流程 |
| 7 | 測試與驗收 | qa-verify | 測試 / 驗收 / 修 bug / 回報完成前 |
| 8 | 部署與維運 | deploy-guard | 部署 / production / env / 回滾 |

**使用者點名「啟動 N」是本系統最可靠的防護啟用方式（主打用法）**——使用者觸發＝當回合指令，
AI 一定會讀取對應的 `.claude/skills/<skill 名稱>/SKILL.md`（其他 AI 工具讀 `.agents/skills/` 鏡像）。
AI 也應依任務關鍵字**主動真的 Read** 對應 SKILL（實戰教訓：有清單的沒出事，憑感覺的連踩三坑），
並依使用者意圖主動推薦對應編號。
實際載入後，依 `docs/AI_RULES.md` §10 標示協定在回報開頭標一行 `🛡️ 已載入：<skill 名>`，供使用者抽查；
沒載入不標（舊制「每次回報都要開頭宣告」已廢除）。

---

## 0.5 角色啟動（多角色協作系統）

角色庫與啟動條件的單一事實來源：`docs/ROLE_SYSTEM.md`
（`docs/roles/` 八檔為**深查參考**，需要完整檢查清單才載入，非流程要求）。
原則：日常檢查用 `docs/AI_RULES.md` §4 六維 Technical Review（六維＝六個角色視角）；
小改由主要執行角色直做；中改以上功能段落完成後**獨立審查一次**——
交乾淨的獨立 AI 實例／子代理審 diff＋需求（ROLE_SYSTEM §7），不開多角色會議。
UI/UX 商用產品設計師的必須啟動清單見 `docs/ROLE_SYSTEM.md` §4。

---

## 1. 小改 Tiny Change

**必讀：**

```text
docs/AI_RULES.md
logs/ai_sync_log.md
```

**對應規則：** 見 `docs/AI_RULES.md` 第 2 節「Tiny Change Fast Path」。

**適用：**

1. 改文字。
2. 改提示語。
3. 修 typo。
4. 修改 README。
5. 補註解。
6. 調整單一樣式。
7. 修小型 UI bug。
8. 不涉及資料庫、RLS、權限、production、付款、點數、優惠碼、webhook、個資。

---

## 2. Prototype Mode 原型快速模式

**必讀：**

```text
docs/AI_RULES.md
docs/BRAND_UI_SYSTEM.md
docs/UX_GUIDELINES.md
logs/ai_sync_log.md
```

**對應規則：** 見 `docs/AI_RULES.md` 第 3 節「Prototype Mode」。

**適用：**

1. UI 草稿。
2. 流程討論。
3. 靜態 mock。
4. 概念驗證。
5. 假資料展示。
6. 尚未接正式資料庫。
7. 尚未進 production。

---

## 3. UI / 樣式 / 頁面 / 元件

**必讀：**

```text
docs/AI_RULES.md
docs/BRAND_UI_SYSTEM.md
docs/UX_GUIDELINES.md
logs/ai_sync_log.md
```

**加讀（依情境）：** 新頁面 / 新流程 / 未指定風格 → `docs/STYLE_PACKS.md`（先問風格）；
達到 `docs/ROLE_SYSTEM.md` §4「必須啟動」情境（首頁、登入註冊、結帳、品牌改版、手機破版修正等）
→ `docs/roles/ui-ux-product-designer.md`。

**對應規則：** 見 `docs/AI_RULES.md` 第 8 節「文件同步熔斷」、第 12 節「多角色協作」。

**適用：**

1. 修改 UI。
2. 新增頁面。
3. 新增元件。
4. 調整 CSS。
5. 深色模式。
6. 手機版。
7. 表單體驗。
8. 視覺美化。

---

## 4. 資料庫 / Supabase / RLS / Migration

**必讀：**

```text
docs/AI_RULES.md
docs/DB_DESIGN.md
docs/DB_MIGRATION_RULES.md
docs/SECURITY_CHECKLIST.md
.claude/skills/supabase-guard/SKILL.md
logs/ai_sync_log.md
```

**對應規則：** 見 `docs/AI_RULES.md` 第 5 節「高風險熔斷」、第 7 節「禁止繞路」、第 8 節「文件同步熔斷」。

**適用：**

1. 新增資料表。
2. 修改欄位。
3. 新增 RLS。
4. 修改 RLS。
5. trigger。
6. function。
7. RPC。
8. index。
9. enum。
10. constraint。

---

## 5. 權限 / 登入 / Admin / 個資

**必讀：**

```text
docs/AI_RULES.md
docs/SECURITY_CHECKLIST.md
docs/DB_DESIGN.md
docs/DB_MIGRATION_RULES.md
.claude/skills/supabase-guard/SKILL.md
logs/ai_sync_log.md
```

**中改僅限於：**

1. 讀取既有會員資料。
2. 顯示既有會員資料。
3. 不新增欄位。
4. 不修改 RLS。
5. 不修改權限。
6. 不修改個資可見範圍。
7. 不寫入、不更新、不刪除個資。

**高風險包含：**

1. 新增個資欄位。
2. 修改個資欄位。
3. 刪除個資欄位。
4. 寫入個資。
5. 更新個資。
6. 刪除個資。
7. 修改個資可見範圍。
8. 修改 RLS。
9. 修改 admin 權限。
10. 修改登入流程。
11. 修改 role / permission。
12. 讓不同角色可看不同資料。

---

## 6. 付款 / 報名 / 優惠碼 / 點數 / Webhook

**必讀：**

```text
docs/AI_RULES.md
docs/TRANSACTION_RULES.md
docs/INCIDENT_PREVENTION.md
docs/DB_MIGRATION_RULES.md
docs/SECURITY_CHECKLIST.md
.claude/skills/transaction-guard/SKILL.md
logs/ai_sync_log.md
```

**適用：**

1. order。
2. checkout。
3. payment。
4. refund。
5. coupon。
6. points。
7. ledger。
8. webhook。
9. enrollment。
10. retraining。
11. quota。
12. seat。
13. balance。
14. stock。

---

## 7. 後台大量編輯 / 分組 / 排程 / 批次

**必讀：**

```text
docs/AI_RULES.md
docs/UX_GUIDELINES.md
docs/SECURITY_CHECKLIST.md
.claude/skills/ui-ux-defense/SKILL.md
logs/ai_sync_log.md
```

**適用：**

1. 後台列表。
2. 分組。
3. 排程。
4. 審核。
5. 權限批次調整。
6. 任務排序。
7. 大量資料修改。

---

## 8. 效能 / 大量資料 / 排行榜 / 統計

**必讀：**

```text
docs/AI_RULES.md
.claude/skills/anti-n-plus-one/SKILL.md
logs/ai_sync_log.md
```

**適用：**

1. 排行榜。
2. 統計報表。
3. 大量列表。
4. 審核列表。
5. 儀表板。
6. 多表查詢。
7. N+1 風險。

---

## 9. 部署 / Production / 環境變數

**必讀：**

```text
docs/AI_RULES.md
docs/DEPLOYMENT.md
docs/SECURITY_CHECKLIST.md
docs/DB_MIGRATION_RULES.md
docs/OBSERVABILITY.md
.claude/skills/deploy-guard/SKILL.md
logs/ai_sync_log.md
```

**適用：**

1. Vercel。
2. production。
3. staging。
4. env。
5. domain。
6. deploy。
7. rollback。
8. migration 上正式。

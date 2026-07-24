# ROLE SYSTEM — 多角色協作系統（精簡核心）

> 本檔是角色系統的**單一事實來源**：只放精簡角色列表與啟動條件。
> 每個角色的完整說明放在 `docs/roles/`——定位為**深查參考**（需要更深的專業檢查清單才讀），
> 不是流程要求，日常任務不需要載入。
> 任務分級（小改 / Prototype / 中改 / 高風險）依 `docs/AI_RULES.md` §1～§5。

## 1. 核心原則（v1.9.0 重定位：從「扮演制」改為「清單＋第二顆腦」）

1. 角色是「檢查視角與責任」，不是人數，也不是儀式。**日常執行體是 `docs/AI_RULES.md` §4 六維
   Technical Review**——六個維度即六個角色視角，中改動手前跑一遍即可，不開會。
2. **使用者點名「啟動 N」（SKILL 1~8）是最可靠的啟用路徑（主打用法）**：使用者觸發＝當回合指令，
   一定會被執行。AI 也應依任務關鍵字主動真的 Read 對應 SKILL。
3. 中改以上段落完成後**獨立審查一次**（執行規則見 §7，載體是乾淨的獨立 AI 實例），
   不得每改一個檔案就重新審。
4. 實際載入守衛或角色檔時，依 `docs/AI_RULES.md` §10 標示協定標 `🛡️ 已載入：<名>`；
   沒載入不標，也不做全域宣告。
5. SKILL 與角色的**觸發關鍵字只是提示**：是否啟動仍依實際任務意圖與風險判斷，不過度啟動守衛與角色。

> 重定位依據（實戰一週實測）：角色開會儀式 0% 執行率；「啟動 N」使用者觸發 100% 執行；
> 乾淨子代理一次審查抓到實作者自漏的 High bug。**獨立的價值來自「另一顆腦」，不是「另一頂帽子」。**

## 2. 角色一覽表

> `docs/roles/` 八檔為**深查參考**：需要某角色的完整檢查清單時才載入，不是流程要求。

| 角色 | 一句話職責 | 完整版（深查參考） |
|---|---|---|
| Product Manager｜產品經理 | 守住產品目標與範圍，不擅自縮小需求 | `docs/roles/product-manager.md` |
| UI/UX Commercial Product Designer｜UI/UX 商用產品設計師 | 商用質感、使用流程、Mobile-first、防破版 | `docs/roles/ui-ux-product-designer.md` |
| System Architect｜系統架構師 | 架構決策、資料流、擴充性與風險判斷 | `docs/roles/system-architect.md` |
| Developer｜開發工程師 | 程式實作、程式結構、效能與相容性 | `docs/roles/developer.md` |
| Database Engineer｜資料庫工程師 | Schema、migration、RLS、資料一致性 | `docs/roles/database-engineer.md` |
| Security Engineer｜資安工程師 | 權限、個資、密鑰、金流安全底線 | `docs/roles/security-engineer.md` |
| QA Engineer｜測試工程師 | 測試策略、驗收、回歸與重現步驟 | `docs/roles/qa-engineer.md` |
| DevOps Engineer｜部署與維運工程師 | 環境分離、部署、回滾、監控備份 | `docs/roles/devops-engineer.md` |

## 3. 啟動原則（依任務分級）

### 小改（文案、樣式、小型低風險 bug）

* 由主要執行角色（通常 Developer）直接完成。
* 不召集多角色會議，只做必要局部檢查。
* 對應 `docs/AI_RULES.md` §2 Tiny Change Fast Path。

### 中改（新頁面、完整功能、前後端串接）

* 動手前做 Technical Review（`docs/AI_RULES.md` §4）——這就是角色檢查的日常執行體，
  六個維度本身就對應角色視角：Security → 資安、Database → 資料庫、
  Performance / 實作 → 開發、UX → UI/UX、QA → 測試、Rollback → DevOps。
* 需要更深的單一視角時，用「啟動 N」載入對應守衛（見 §5）。
* 完成整個功能段落後獨立審查一次（§7，乾淨實例審 diff）。

### 大改／高風險（資料庫、權限、個資、金流、正式部署）

* 先停手提方案（`docs/AI_RULES.md` §5），依風險載入相關守衛／角色檔
  （只載與該風險相關的視角，無關視角不參與）。
* 必須有風險、驗證與回滾判斷。
* 實作完成後、交付前，走 §7 獨立審查（`bash scripts/review.sh` 或手動開乾淨實例）。

## 4. UI/UX 角色啟動條件（三級）

| 等級 | 情境 |
|---|---|
| **不強制** | 純後端修改、小型文字修改、不影響介面的低風險 bug |
| **建議啟動** | 新頁面、新表單、新功能流程、多頁面操作、響應式調整、主要功能 UI 修改 |
| **必須啟動** | 首頁、登入註冊、會員中心、後台主要流程、報名結帳、金流操作介面、新手引導、品牌改版、手機破版修正、高使用率或高轉換頁面 |

必須啟動時，先讀 `docs/roles/ui-ux-product-designer.md`；
涉及新頁面 / 新流程且使用者未指定風格時，依 `docs/STYLE_PACKS.md` 先問風格，不得自行猜測。

## 5. 與 SKILL「啟動 1~8」的關係

SKILL（`docs/TASK_ROUTER.md` §0）是**機器可自動觸發的守衛**；角色是**人類可理解的責任視角**。
兩者互補、一一對應——每個角色都有對應守衛，每個守衛都指向角色完整版：

| SKILL | 主責角色 |
|---|---|
| 1 ui-ux-defense | UI/UX 商用產品設計師 |
| 2 supabase-guard | Database Engineer + Security Engineer |
| 3 transaction-guard | Security Engineer + Database Engineer |
| 4 anti-n-plus-one | Developer |
| 5 karpathy-guidelines | Developer + System Architect |
| 6 task-router | Product Manager |
| 7 qa-verify | QA Engineer |
| 8 deploy-guard | DevOps Engineer |

使用者說「啟動 N」時觸發對應 SKILL——**這是主打用法**（使用者觸發＝當回合指令，100% 執行）；
需要更深的檢查視角時，再載入對應角色完整版（深查參考）。
實際載入了哪個守衛／角色檔，依 `docs/AI_RULES.md` §10 標示協定標 `🛡️ 已載入：<名>`。

## 6. 交付原則

1. 審查（§7）時，每個檢查視角以對應清單過一遍，產出結論（通過 / 問題清單）。
2. 視角之間責任不得混為一談（例：UI/UX 負責體驗驗收，前端 Developer 負責程式實作，見各角色檔「分工」節）。
3. 審查發現高風險 → 立刻升級（`docs/AI_RULES.md` §6）。

## 7. 獨立審查機制（集中審查的執行規則）

適用：中改以上的集中審查、高風險任務審查（migration / auth / 金流 / 權限）、使用者要求審查時。
觸發摘要見 `.claude/skills/qa-verify/SKILL.md`；本節為完整規則的單一事實來源。

### 7.1 執行載體：另一顆腦，不是另一頂帽子

審查由**乾淨的獨立 AI 實例／子代理**執行：只給它 **diff（`git diff origin/main..HEAD`）＋需求描述**，
不給實作過程的對話脈絡，以獨立視角（至少資安＋QA；依風險加資料庫／金流／UX）審查。

- 機器化入口：`bash scripts/review.sh`（審查報告存 `logs/reviews/<sha>.md`，
  最後一行 `VERDICT: OK|BLOCKER`；目前為軟跑階段，不掛 pre-push 硬門）。
- 無法跑腳本時，手動開一個全新對話，貼 diff＋需求即可，效果等價。

> 「同一 AI 分飾多角開會」自 v1.7.0 退役：同一顆腦換帽子防不了自己的盲點。
> 實證：乾淨子代理一次審查抓到實作者自漏的 High bug；一週內角色開會儀式執行率 0%。
> 為何無法完全機器化：審查本身是語意判斷，script 只能負責「叫另一顆腦＋存證」。

### 7.2 實作者迴避

實作者（產出該 diff 的 AI）**不得批准自己的成果**。實作者在審查中只做兩件事：
說明做了什麼、對質疑補證據；「通過 / 阻擋」由獨立審查者判定。
小改不虛設審查——以 `docs/AI_RULES.md` §10 完成定義的機器檢查
（build / preflight / 實跑流程）代替。

### 7.3 審查回報格式（審查者按視角分開填，不得合併）

每個檢查視角（資安 / 資料庫 / 金流 / QA / UX…）分開回報，
禁止「同上」「同意前項」式帶過——每個視角必須有自己的實際檢查內容：

```text
視角：
實際檢查內容：（檢查了哪些檔案 / 流程 / 清單項）
通過項目：
真實問題與證據：（檔案:行號、實測結果、重現步驟——沒有證據不得列為問題）
嚴重度：（阻擋 / 高 / 中 / 低）
是否阻擋交付：（是 / 否 + 理由）
尚未驗證項目：（標 Unverified：缺什麼證據、如何補驗）
```

整合回報格式：

```text
已審視角：
尚未驗證視角：（原因）
阻擋項：（視角 / 問題 / 證據）
建議項：
Unverified 清單：
結論：（可交付 / 修正後重審 / 阻擋）
```

### 7.4 否決權（不受多數決）

以下五類的「阻擋」**不得被其他視角或實作者說服蓋過**，只能靠修正問題、補齊證據解除：

1. 資安（權限 / 個資 / 密鑰）
2. 資料庫（schema / migration / 資料一致性）
3. 金流與交易
4. 核心需求未達成（Product Manager 視角）
5. 嚴重手機 UX 問題（破版 / 主要流程在手機上無法完成）

### 7.5 證據與誠實原則

1. **無證據不得宣稱通過**：沒實際檢查或跑過的項目一律標 `Unverified`，不得標「通過」。
2. **禁止虛構風險**：不要求每個視角都找出問題；沒有問題就回報「通過＋依據」。湊數的假問題與放水的假通過同樣是失職。
3. 整合回報必須區分：**已審視角**（已交出 7.3 獨立回報）與**尚未驗證視角**（審查未完成，或有 Unverified 未清）。

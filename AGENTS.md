<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Local Port Checking Rule
Before recommending local test links or starting any development server, always check currently occupied ports on the system using `lsof -i -P -n | grep LISTEN` and explicitly list the active ports to the user first.

# 開發前必讀

本專案採 Router 制。任何任務**第一步**先讀 `docs/TASK_ROUTER.md`，
依任務類型只讀對應文件，不要盲目全讀，也不要完全不讀規則就改。

規則以 `docs/AI_RULES.md` 為單一事實來源。

- 高風險（DB / RLS / migration / 權限 / production / 金流 / 個資寫入更新刪除 / 大量資料變更）
  → 先停手，提出方案與風險，不得直接改
- 其餘分級（小改 / Prototype / 中改）與處置：見 `docs/AI_RULES.md` §1～§5

回報「完成」前，必須符合 `docs/AI_RULES.md` §10「完成的定義」與回報用語協定。

涉及文件、規則、架構、資料流或公開行為時，依 `docs/AI_RULES.md` §8 做文件同步檢查，
並更新 `logs/ai_sync_log.md`。

完成較大功能時，提醒使用者做回饋 retro（機制見 `docs/FEEDBACK_LOOP.md`）。

多角色協作：日常檢查用 `docs/AI_RULES.md` §4 六維 Technical Review（六維＝六個角色視角）；
中改以上／高風險的集中審查交**乾淨的獨立 AI 實例（子代理）**審 diff＋需求
（實作者不得自批，機制見 ROLE_SYSTEM §7，高風險用 `bash scripts/review.sh`）；
UI 任務的風格選擇與 Mobile-first 硬性標準見 `docs/STYLE_PACKS.md` 與 `docs/BRAND_UI_SYSTEM.md` §12。

SKILL 對照表與「啟動 1~8」用法（主打用法，使用者點名必執行）：見 `docs/TASK_ROUTER.md` §0；
實際載入守衛/角色檔時，回報開頭標 `🛡️ 已載入：<名>`（AI_RULES §10）。
需要可手貼的短版提示詞：見 `docs/CUSTOM_SYSTEM_PROMPT.md`。

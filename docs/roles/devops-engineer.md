# DevOps Engineer｜部署與維運工程師（完整版）

> 精簡版與啟動條件見 `docs/ROLE_SYSTEM.md`。
> 規則單一事實來源：`docs/DEPLOYMENT.md`、`docs/OBSERVABILITY.md`。

## 1. 定位

守住「上得去、退得回、看得見」：環境分離、部署、回滾、監控、備份還原。
部署與 production 屬**高風險**（`docs/AI_RULES.md` §5），不得直接操作 production。

## 2. 核心責任

1. 環境分離鐵律（DEPLOYMENT）：local / staging / production 分離、env 各自獨立、不灌測試資料進正式庫。
2. 部署前過 Preflight 清單（DEPLOYMENT），含 `scripts/preflight-check.sh` 無紅線。
3. 回滾策略：程式與資料庫**兩者**都要有回復路徑；重大變更前手動備份。
4. 本機檢查快慢分層（DEPLOYMENT）：pre-commit 快檢、pre-push 完整 build——由 `scripts/install-hooks.sh` 安裝。
5. 監控與告警（OBSERVABILITY）：錯誤監控、log 分級、不記個資、關鍵流程失敗即時告警。
6. 事故處理：止血 → 還原 → 事故紀錄與 Postmortem（OBSERVABILITY §7~9），防範規則回流 INCIDENT_PREVENTION。

## 3. 啟動時機

* 部署、production、staging、env、domain、rollback 相關任務（必啟動，高風險）。
* 新專案初始化（掛 hooks、設定環境）。
* 事故與誤刪救援。

## 4. 檢查清單（集中審查用）

```text
[ ] preflight 通過、.env 未被追蹤、無公開前綴機密？
[ ] migration 已在 local / staging 驗證過才上正式？
[ ] 回滾方式明確（程式 + 資料庫）？
[ ] 部署後關鍵流程驗證了嗎？（登入 / 結帳 / webhook）
[ ] 監控與備份就緒？
```

---
name: deploy-guard
description: Use when the task mentions deploy, deployment, production, staging, env, environment variable, domain, release, rollback, monitoring, backup, or incident. 當任務涉及部署、正式環境、staging、環境變數、網域、上線、回滾、監控、備份或事故處理時使用。
---

# Deploy Guard — 部署與維運守衛

部署與 production 屬**高風險**：先停手提方案（`docs/AI_RULES.md` 第 5 節），不得直接改。
規則細節見 `docs/DEPLOYMENT.md`、`docs/OBSERVABILITY.md`。
需要完整審查視角時，加讀角色完整版 `../../../docs/roles/devops-engineer.md`。

## 鐵律

1. local / staging / production **分離**，環境變數各自獨立。
2. **不得直接操作 production**；不灌測試資料進正式資料庫。
3. `.env` 不進 Git；service_role 等機密只在 server，不得用公開前綴命名。
4. migration 先在 local / staging 測過，才上正式。
5. **必須有回滾策略**（程式與資料庫兩者）；重大變更前手動備份。
6. 部署前跑 `scripts/preflight-check.sh`，無紅線才放行。
7. 部署後驗證關鍵流程（登入 / 結帳 / webhook），監控告警就緒。
8. 事故處理：先止血 → 還原 → 依 OBSERVABILITY 第 8、9 節記錄與檢討，防範規則回流 INCIDENT_PREVENTION。

## 交付格式（部署類任務必附）

```text
1. 部署目標環境：
2. 變更內容與影響範圍：
3. env 是否有變動 / 是否已在目標環境設定：
4. 回滾方式（程式 / 資料庫）：
5. 部署後驗證步驟與結果：
```

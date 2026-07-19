# DEPLOYMENT — 部署規範

> 涉及部署 / production / staging / env / rollback 時，先讀本檔與
> `docs/SECURITY_CHECKLIST.md`、`docs/DB_MIGRATION_RULES.md`、`docs/OBSERVABILITY.md`。
> 部署與 production 屬高風險，須走 `docs/AI_RULES.md` 第 5 節流程。

## 鐵律

1. **local / staging / production 分離**，環境變數各自獨立。
2. **不得直接操作 production**。
3. **`.env` 不進 Git**（由 `.gitignore` 保證，範本見 `.env.example`）。
4. **service_role key 不得 `NEXT_PUBLIC_` 開頭**，只在 server 使用。
5. **migration 先在 local / staging 測**，通過後才上正式。
6. **必須有回滾策略**（程式與資料庫兩者）。
7. **不灌測試資料進正式資料庫**。

## 部署前檢查清單（Preflight）

```text
[ ] 已跑 scripts/preflight-check.sh，無紅線
[ ] 高風險改動（migration/auth/金流/權限）已跑 scripts/review.sh 獨立審查（軟跑階段）
[ ] .env 未被追蹤，機密未外洩
[ ] 無 NEXT_PUBLIC_ 命名的機密
[ ] migration 已在 staging 驗證
[ ] 新資料表已啟用 RLS，無 using(true)/check(true)
[ ] 部署版本可快速回滾
[ ] 已在部署前手動備份 production DB（重大變更時）
[ ] 監控 / 告警已就緒（見 docs/OBSERVABILITY.md）
```

## 回滾流程模板

```text
1. 判斷問題來源：程式碼 or 資料庫 or 環境變數。
2. 程式碼回滾：回到上一個已知良好版本（redeploy 前一 release）。
3. 資料庫回滾：套用對應的回滾 SQL；不可逆的變更改用資料修復或 PITR。
4. 環境變數回滾：還原前一組設定。
5. 回滾後驗證關鍵流程（登入 / 結帳 / webhook）。
6. 記錄事故到 docs/OBSERVABILITY.md 第 8、9 節。
```

## env 檢查模板

```text
[ ] 所有 .env.example 的變數在正式環境都已設定
[ ] server-only 變數未加 NEXT_PUBLIC_
[ ] production 與 staging 的值確實不同（DB、金流用對環境）
[ ] 無殘留測試 / 假 key
```

## 本機檢查快慢分層（pre-commit 快、pre-push 全）

> 來源：實戰回饋整合——「不跑 build 會被 Vercel 靜默失敗鬼打牆」（Claude）
> vs「每次 commit 跑 build 破壞心流」（Codex）。兩面用分層一次解決。

| 時機 | 跑什麼 | 為什麼 |
|---|---|---|
| **pre-commit** | preflight 紅線掃描 + `tsc --noEmit` + eslint（約 5 秒） | 抓 95% 型別/排版錯誤（eslint 需整合 prettier，如 eslint-plugin-prettier；tsc 抓不到排版） |
| **pre-push** | **完整 `npm run build`**（exit 0 才准推） | 抓剩下 5% 的 build-only 錯誤。Vercel 把排版錯誤當 build 失敗且**靜默不部署**，使用者通常不看 dashboard——必須在推之前本機攔下 |

**鐵律：完整 build 放 pre-push、不放 pre-commit。**
放 commit 會讓改一行 CSS 也苦等全站編譯（為 5% 邊角讓 100% 日常付代價的反模式）；
放 push 則剛好——push 就是部署觸發點，這一分鐘等得值。

`scripts/install-hooks.sh` 會自動安裝這兩層 hook（專案無 build script 時 pre-push 自動略過）。

## preflight 上線化（TODO）

```text
目前 scripts/preflight-check.sh 需手動執行。
待專案 git init 後，應掛成 .git/hooks/pre-commit 或 CI step，
讓紅線掃描在每次 commit / PR 自動執行，才會真正發揮護欄效果。
```

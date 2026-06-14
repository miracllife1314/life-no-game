# 《NLP人性溝通術系統》雙軌測試區 (Staging) 建立規劃書

當系統已經有真實學員在線上進行修煉與打卡時，任何直接在正式伺服器上的代碼修改或 SQL 執行，都伴隨著極高的「炸機風險（導致學員分數遺失、登入出錯）」。

本規劃書旨在為您建立一個**與正式版完全隔離的「測試區（Staging / 預備環境）」**，讓所有新功能的開發、優化與重構，都能在測試區測試完畢後，再安全地發布至正式區。

---

## 🏗️ 雙軌測試區核心架構

我們將採取 **「程式碼分支隔離」** 與 **「資料庫獨立分流」** 的做法，整體架構如下：

```
                    ┌───────────────────────────────────────┐
                    │            GitHub Repository          │
                    └───────────────────────────────────────┘
                                        │
                  ┌─────────────────────┴─────────────────────┐
                  ▼                                           ▼
          【 Staging 分支 】                          【 Main (Prod) 分支 】
                  │                                           │
                  ▼                                           ▼
         Vercel Staging 專案                         Vercel Production 專案
   (nlp-game-staging.vercel.app)                     (nlp-game.vercel.app)
                  │                                           │
                  ▼                                           ▼
      Supabase Staging 資料庫                     Supabase Production 資料庫
      (測試帳號、測試加分)                        (真實學員資料、不可手動改動)
```

---

## 🛠️ 第一部分：基礎設施建立步驟

### 步驟 1：在 Supabase 建立「測試資料庫專案」
1.  登入您的 Supabase 帳號，點擊 **New Project**。
2.  建立一個名為 `nlp-game-staging` 的全新專案。
3.  **複製正式區結構 (Schema)**：
    *   在正式區 Supabase 的 SQL Editor 匯出 DDL 結構，或者直接將本專案內 [docs/schema.sql](file:///Users/leo/Desktop/定課系統/NLP_GAME/docs/schema.sql) 以及所有 `schema_fixes_1_to_9.sql` 依序貼入測試區的 SQL Editor 執行一遍。
    *   *好處*：測試區擁有與正式區 100% 相同的大腦（資料表結構、Trigger 與 RLS 政策）。
4.  **獲取測試區 API 金鑰**：
    *   在測試區專案的 Settings ➔ API 中，複製新的 `SUPABASE_URL` 與 `SUPABASE_ANON_KEY`。

### 步驟 2：在 Vercel 建立「測試網頁專案」
為了讓測試區有獨立網址（例如：`nlp-game-staging.vercel.app`），我們在 Vercel 進行分流：
1.  登入 Vercel，進入現有的 `nlp-game` 專案設定。
2.  在 **Settings ➔ Environment Variables** 中：
    *   保留原本的 `NEXT_PUBLIC_SUPABASE_URL` 與 `NEXT_PUBLIC_SUPABASE_ANON_KEY`（將它們的 Environment 勾選限制為 **Production**）。
    *   新增第二組環境變數，值填入剛才複製的**測試區金鑰**，並將它們的 Environment 勾選為 **Preview** 與 **Development**。
3.  *效果*：
    *   當您推送程式碼到 `main` 分支時，Vercel 會自動部署到正式網址，並連線到正式資料庫。
    *   當您建立並推送程式碼到 `staging`（或其他非 main 分支）時，Vercel 會自動部署到測試網址，且連線到測試資料庫！

### 步驟 3：Git 分支配置
在本地終端機執行：
```bash
# 1. 基於目前的正式版建立一個名為 staging 的開發測試分支
git checkout -b staging

# 2. 將 staging 分支推送至 GitHub
git push -u origin staging
```

---

## 🔄 第二部分：日常開發與安全性遷移工作流 (Workflow)

建立測試區後，未來的任何優化或新功能開發，都必須遵循以下安全流程：

```
本地開發 (Staging 分支) ➔ 部署至測試網頁 ➔ 測試區資料庫執行 SQL ➔ 測試驗證 
  ➔ 合併 Git 到 main 分支 ➔ 自動部署正式版 ➔ 正式區資料庫執行 SQL ➔ 完成上線
```

### 1. 資料庫結構變更流程（以 v2 帳號驗證為例）
當我們要加入帳號驗證（會新增 `user_roles` 表或修改 RLS）：
1.  **在 Staging 資料庫測試**：將 v2 SQL 腳本貼入 `nlp-game-staging` 的 SQL Editor 執行，並在測試網址測試註冊與登入。
2.  **確定無誤後套用正式區**：
    *   在正式區（Prod）發布系統公告（例如維護 5 分鐘）。
    *   將該 SQL 腳本貼入 `nlp-game` (正式區) 的 SQL Editor 執行。
    *   將 Git 上的 `staging` 分支合併回 `main` 並推送，Vercel 會自動將正式網址更新。

### 2. 同步正式區資料到測試區（測試數據對帳）
當我們需要用真實學員的資料來測試效能時，可安全地複製資料到測試區：
1.  進入正式區 Supabase ➔ Database ➔ Tables。
2.  選擇 `profiles`、`user_pets`，點擊 **Export CSV** 下載資料。
3.  進入測試區 Supabase，使用 **Import CSV** 將資料匯入（可用於測試重載、算分是否正常，絕不污染正式環境）。

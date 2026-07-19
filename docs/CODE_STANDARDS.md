# CODE STANDARDS — 程式結構與寫法規範

> 凡涉及**實際寫程式**的任務，一律加讀本檔。
> 目的：讓每個專案的程式結構一致、server/client 邊界清楚、不給機密外洩留溫床。
> 預設以 Next.js（App Router）+ Supabase 為例；換技術棧時依同樣原則調整並更新本檔。

## 1. 目錄結構模板

```text
app/                    頁面與路由（App Router）
  (public)/             前台頁面群組
  admin/                後台頁面
  api/                  Route Handlers（webhook、對外 API）
components/             共用 UI 元件（不含資料存取）
lib/
  db/                   資料存取層（唯一可呼叫資料庫的地方）
  supabase/
    client.ts           瀏覽器端 client（只用 anon key）
    server.ts           伺服器端 client（可用 service_role，標記 server-only）
  utils/                純函式工具
backend/supabase/migrations/   增量 migration SQL
scripts/                護欄與工具腳本
docs/ logs/             規範與日誌（本模板既有）
```

原則：**新專案不要自創結構**；若確實需要偏離，先在 `logs/decision_log.md` 記決策再動。
（上方目錄樹為 Next.js **範例**；資料存取層等目錄名可依專案慣例替換，規則見第 3 節——擇一並全專案一致。）

## 2. Server / Client 邊界（最重要）

1. **service_role 只存在於 server 檔案**：任何使用 `SUPABASE_SERVICE_ROLE_KEY` 的模組，檔案開頭必須 `import "server-only"`（或等效機制），確保被前端誤 import 時直接編譯失敗。
2. **瀏覽器端只能用 anon key** + RLS 保護下的查詢。
3. Client Component（`"use client"`）內**不得**直接呼叫資料庫，一律透過 Server Action / API / server 端函式。
4. 判斷準則：這段程式碼**最終跑在誰的機器上**？跑在使用者瀏覽器 = 內容全公開。

## 3. 資料存取層規則

1. 所有資料庫查詢集中在**資料存取層**——目錄名可依專案慣例（如 `lib/db/`、`server/services/`、`repositories/`），**擇一並全專案一致**；每個領域一個模組（例：`<資料存取層>/orders.ts`）。
2. 頁面與元件**不直接**散落 supabase 查詢——方便日後改 schema 時只改一層。
3. 查詢一律考慮：分頁 / limit、狀態過濾（排除 cancelled 等）、N+1（見 anti-n-plus-one skill）。
4. 寫入操作遵守 `docs/TRANSACTION_RULES.md`（冪等、ledger、UNIQUE）。

## 4. 錯誤處理慣例

1. **不吞錯誤**：`catch` 內必須記 log（依 `docs/OBSERVABILITY.md` 分級）或往上拋，禁止空 catch。
2. **對使用者白話、對 log 詳細**：使用者看到「儲存失敗，請再試一次」，log 記完整錯誤與上下文。
3. server 端錯誤回應統一格式（例：`{ error: { code, message } }`），前端統一處理。
4. 不在錯誤訊息中洩漏內部細節（SQL、stack trace、機密）給使用者。

## 5. 命名慣例

1. 檔名：元件 `PascalCase.tsx`，其他 `kebab-case.ts` 或 `camelCase.ts`（專案內統一一種即可）。
2. 變數 / 函式：`camelCase`；常數 `UPPER_SNAKE_CASE`；型別 / 元件 `PascalCase`。
3. 資料庫命名見 `docs/DB_DESIGN.md`（snake_case）。
4. 布林值用 `is / has / can` 開頭；事件處理用 `handle / on` 開頭。

## 6. 環境變數使用規則

1. 讀取集中在一處（例：`lib/env.ts`），啟動時驗證必要變數存在，缺就 fail fast。
2. 命名與曝光規則見 `.env.example` 開頭註解——`NEXT_PUBLIC_` 即公開。
3. 程式中不得出現任何硬寫死的 key / 密碼（由 `scripts/preflight-check.sh` 掃描）。

## 7. 依賴管理

1. 加新套件前先問：標準庫或現有依賴能不能做到？（Simplicity First）
2. 不引入只用一次的重型依賴。
3. 涉及金流 / 加密 / 認證的套件，只用主流且維護中的。

## 8. 註解與可讀性

1. 註解寫「為什麼」，不寫「做了什麼」（程式碼本身要能讀懂做什麼）。
2. 業務規則、防呆限制（例：為何要 FOR UPDATE）值得註解。
3. 禁止用 TODO 取代正式架構（見 `docs/AI_RULES.md` 第 7 節）。

## 9. 輕量化與防止目錄巨大化

1. **防臃腫原則**：單一資料夾下不得堆積過多無關或大量的檔案。當單一目錄下的檔案數量超過 10 個時，應主動評估並依功能領域或子模組進行重構，建立獨立子目錄收納。
2. **單一檔案限值**：為維護程式碼可讀性，單一程式碼檔案（包含 TSX/TS/JS）建議控制在 300 行以內。若檔案長度超過 300 行，必須主動將邏輯抽離出獨立的 Hooks、Utils 函數、子組件（Sub-components）或專屬資料存取層。
3. **高內聚目錄結構**：相關的 UI 組件、型別定義與子元件應建立專屬資料夾管理（例如將全部程式塞在 `components/` 根目錄，改為建立如 `components/CourseCard/` 目錄，內部再細分 `index.tsx`、`types.ts`、`CardHeader.tsx` 等），保持根目錄輕量、職責單一且清晰。


# Tech Pack — Next.js + Supabase + Vercel（預設技術套件）

> 母版三層架構中的**技術套件層**：萬用核心不寫死技術，技術特有內容集中由套件承載。
> 本檔是**預設套件的索引與換棧指南**——不重抄規則（單一事實來源在各 docs），
> 只標出「哪些內容屬於這套技術」，換技術棧時照第三節替換。
> 其他技術套件（Python / FastAPI / Firebase / Docker / Mobile App…）**有真實專案需要才建立**，
> 依本檔格式新增 `docs/tech-packs/<stack>.md`，不預先建立空套件。

## 一、本套件涵蓋

| 項目 | 採用 |
|---|---|
| Frontend / Backend | Next.js（App Router、Route Handlers / Server Actions） |
| Database / Auth / Storage | Supabase（PostgreSQL + RLS + Auth + Storage） |
| Deployment | Vercel |

## 二、技術特有規則的所在位置（索引，不重抄）

| 主題 | 位置 | 技術特有點 |
|---|---|---|
| 目錄結構 | `docs/CODE_STANDARDS.md` §1 | App Router 目錄樹（已標註為範例） |
| Server / Client 邊界 | `docs/CODE_STANDARDS.md` §2 | `server-only`、`"use client"`、anon key vs service_role |
| 環境變數曝光 | `.env.example`、`docs/CODE_STANDARDS.md` §6 | `NEXT_PUBLIC_` 前綴 = 打包進瀏覽器公開 |
| Migration 流程 | `docs/DB_MIGRATION_RULES.md` | Supabase Dashboard 手動貼 SQL 過渡方案、`backend/supabase/migrations/` |
| RLS 與資料庫安全 | `docs/DB_DESIGN.md` §4、`.claude/skills/supabase-guard/` | Supabase RLS、`auth.uid()`、service_role |
| 部署與靜默失敗 | `docs/DEPLOYMENT.md` | Vercel 把排版錯誤當 build 失敗且靜默不部署 → pre-push 完整 build |
| 排查 | `docs/TROUBLESHOOTING.md` | Supabase Auth / RLS / env 症狀 |
| 機器護欄 | `scripts/preflight-check.sh` | `NEXT_PUBLIC_*service_role`、Supabase JWT 特徵、migration 目錄 |

## 三、換技術棧時怎麼做（Swap Checklist）

萬用核心（AI_RULES 的分級與熔斷、TESTING 三類必測、TRANSACTION_RULES 冪等原則、
SECURITY_CHECKLIST 的語意項、BRAND_UI / UX / STYLE_PACKS、ROLE_SYSTEM）**不需要動**——
它們描述的是原則，不是技術。需要替換的是：

```text
[ ] docs/TECH_STACK.md：填上實際技術棧
[ ] 新建 docs/tech-packs/<stack>.md：照本檔格式列出新棧的等價機制
[ ] docs/CODE_STANDARDS.md §1~§2：換成新棧的目錄結構與 server/client（或前後端信任邊界）慣例
[ ] .env.example：換成新棧的變數與「公開 vs server-only」命名規則
[ ] docs/DB_MIGRATION_RULES.md：換成新 DB 的 migration 工具與流程（「只增不改、附回滾」原則不變）
[ ] docs/DEPLOYMENT.md：換部署平台的檢查與回滾方式（環境分離鐵律不變）
[ ] docs/TROUBLESHOOTING.md：補新棧常見症狀
[ ] scripts/preflight-check.sh：SCAN_DIRS、機密特徵、公開前綴規則對應調整
[ ] .claude/skills/supabase-guard/：換成對應 DB 守衛（並同步 .agents 鏡像）
```

等價概念對照（換棧時找「新棧的這個東西」）：

| 本套件 | 通用概念 |
|---|---|
| RLS + `auth.uid()` | 資料庫層權限（不得只靠應用層 / 前端） |
| service_role key | 可繞過權限的最高權限憑證（只准 server 持有） |
| `NEXT_PUBLIC_` 前綴 | 「這個變數會公開」的明確標記機制 |
| Vercel 靜默失敗 | 部署平台的 build 失敗行為（務必在 push 前本機攔截） |
| Supabase Dashboard 貼 SQL | 人工審核 migration 的執行通道 |

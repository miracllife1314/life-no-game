# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 🔎 **檢查或修改程式前,請先讀 [`docs/開發脈絡與變更紀錄.md`](docs/開發脈絡與變更紀錄.md)。**
> 它記了「容易誤判的脈絡/陷阱」(例如 profile_id 會被補成 id、captain_id 用 profile_id 比對但 director_id 用 id 比對、score_logs 是延後載入…)與「近期變更紀錄」。
> **每次做重要改動,請在該文件 Part 2 最上面補一條(日期 + 改了什麼 + 為什麼)。**

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

No test framework is configured. Manual verification via browser.

## UI Development Rules

**Every UI change must consider both desktop and mobile:**
- Use Tailwind responsive prefixes (`md:`, `lg:`) for layout differences.
- Fixed pixel sizes must have mobile-friendly equivalents.
- Touch targets must be ≥ 44px for mobile usability.
- Avoid `fixed`/`absolute` elements that can overlap or cause z-index issues on small screens.
- Use smooth Glassmorphism styling and active scale animations (`active:scale-95`) to match the premium theme.

## Architecture

**NLP人性溝通術課程計分系統** is a gamified score-tracking system for course participants. Participants check in daily定課, complete weekly/temporary quests, unlock achievements, register for courses, and view score details.

### App Structure

`app/page.tsx` is a monolithic client component (`"use client"`) that owns all game state and orchestrates every tab (SPA structure). Tab navigation: `daily | weekly | special | rank | achievements | course | history | captain | admin` rendered under `<main>` via `activeTab` state.

## Database Access Rules

### 🚨 Avoid N+1 Queries (避免 N+1 查詢) - CRITICAL RULE

Never perform database queries inside a loop or `.map()` in React client-side code or Server Actions. This degrades performance significantly.

**How to avoid N+1 queries:**
1. **Use Supabase Joins (Nested Selects)**: 
   Supabase allows you to join related tables directly in a single query.
   * **Correct**:
     ```typescript
     // Single query fetching submissions with task and profile details
     const { data } = await supabase
       .from('submissions')
       .select('*, tasks(name, score), profiles(name, team_id)')
       .eq('status', 'pending');
     ```
   * **Incorrect (N+1)**:
     ```typescript
     // DO NOT DO THIS: Querying tasks individually for each submission
     const { data: submissions } = await supabase.from('submissions').select('*');
     for (const sub of submissions) {
       const { data: task } = await supabase.from('tasks').select('*').eq('id', sub.task_id).single();
       sub.task = task;
     }
     ```

2. **Use SQL Joins inside Postgres functions/RPCs**:
   If executing raw database operations or RPCs, use explicit `LEFT JOIN` or `INNER JOIN` instead of querying multiple tables sequentially.

3. **Batch Queries with `in`**:
   If you must fetch related records, collect all IDs first and execute a single batch query:
   ```typescript
   const studentIds = submissions.map(s => s.student_id);
   const { data: profiles } = await supabase
     .from('profiles')
     .select('*')
     .in('id', studentIds);
   ```

### Row Level Security (RLS) & Server Actions

- For public user queries, use the client Supabase client which respects RLS policies.
- For Admin actions requiring elevated privileges (such as manual score adjustments, editing any user, or approving submissions), use the Server Action pattern wrapped with a Supabase client initialized with the `SUPABASE_SERVICE_ROLE_KEY` (Admin client).

---

## Environments & Database Routing (重要)

本專案有兩個資料庫：**測試庫** 與 **正式庫**，靠環境變數區分。

連線優先序（`lib/supabase.ts`）：**只要有設 `_LOCAL` 變數就優先用 `_LOCAL`（測試庫），否則 fallback 到無後綴變數（正式庫）。**

| 環境 | 連哪個資料庫 | 設哪組變數 |
|---|---|---|
| 本機 `npm run dev` | 🟢 測試庫 | `.env.local` 的 `_LOCAL` 那組 |
| Vercel **`staging`（Preview）** | 🟢 測試庫 | Vercel Preview 設 `_LOCAL` 那組 |
| Vercel **`main`（Production）** | 🔴 正式庫 | Vercel Production 設無後綴那組（**絕不可設 `_LOCAL`**） |

`.env.local` 需要：
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`（正式庫）
- `NEXT_PUBLIC_SUPABASE_URL_LOCAL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL`（測試庫，本機 dev 用）
- `SUPABASE_SERVICE_ROLE_KEY`、`NEXT_PUBLIC_APP_URL`

⚠️ **絕不可在 Vercel Production 設定 `_LOCAL` 變數**，否則正式站會連到測試庫、污染學員資料。

## Deployment Workflow (部署規則)

- `main` 分支 → 正式站（正式庫，學員正在使用）。`staging` 分支 → Preview 預覽站（測試庫）。
- **每次要 push 到伺服器(GitHub/Vercel)時，必要時必須先問使用者：要放到 `main`（正式）還是 `staging`（測試）。不要自作主張直接推 `main`。**
- 備份/還原腳本（`npm run backup` / `npm run restore`）：預設操作 **`_LOCAL`（測試庫）**；加 `--prod` 旗標才操作**正式庫**。動手前先確認目標環境。

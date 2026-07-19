# 開發前必讀 (CLAUDE.md)

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

---

## 🔎 專案說明與開發脈絡

> 🔎 **檢查或修改程式前，請先讀 [`docs/開發脈絡與變更紀錄.md`](docs/開發脈絡與變更紀錄.md)。**
> 它紀錄了「容易誤判的脈絡/陷阱」(例如 profile_id 會被補成 id、captain_id 用 profile_id 比對但 director_id 用 id 比對、score_logs 是延後載入…)與「近期變更紀錄」。
> **每次做重要改動，請在該文件 Part 2 最上面補一條(日期 + 改了什麼 + 為什麼)。**

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

## Environment Variables

Requires `.env.local` with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
